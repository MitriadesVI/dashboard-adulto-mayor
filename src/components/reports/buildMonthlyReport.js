// src/components/reports/buildMonthlyReport.js
//
// Constructor (puro, sin React) del "Informe mensual de supervisión" de un contratista.
// Devuelve un objeto plano que consumen MonthlyReportPage (pantalla) y monthlyReportPdf (PDF),
// de modo que ambos muestran exactamente las mismas cifras.
//
// Reglas de conteo: utils/attendance.js (por sede + fecha + jornada se toma el máximo; J1 y J2
// suman; los días suman). Las "atenciones" NO son personas únicas.

import {
  parseActivityDate, toDateKey, dateToKey, daysBetween
} from '../../utils/dates';
import {
  summarizeAttendance, getPerformer, isRegisteredOnBehalf, normalizeJornada
} from '../../utils/attendance';
import { getContractorName, getContractorFullName } from '../../config/contractors';
import {
  getActivityTypeLabel, getActivitySubtypeLabel, getLocationType
} from '../dashboard/common/helpers';
import {
  computeLocationCoverage, isWorkingDay, normalizeLocationName, COVERAGE_STATUS
} from '../coverage/coverageUtils';

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const PROGRAM_NAME = 'Distrito de Barranquilla — Programa Adulto Mayor';
export const REPORT_TITLE = 'Informe mensual de supervisión';

// Un avance por debajo del esperado en más de estos puntos porcentuales se marca "En riesgo"
export const RISK_MARGIN_POINTS = 10;
// Registros cargados con más de estos días de diferencia respecto a la fecha de la actividad
export const LATE_REGISTRATION_DAYS = 3;

export const COVERAGE_STATUS_LABELS = {
  [COVERAGE_STATUS.OK]: 'Al día',
  [COVERAGE_STATUS.WARNING]: 'En alerta',
  [COVERAGE_STATUS.CRITICAL]: 'Crítica',
  [COVERAGE_STATUS.NEVER]: 'Nunca atendida'
};

const LOCATION_TYPE_LABELS = { center: 'CDV', park: 'Parque', unknown: 'Otro' };

export const MONTH_KEY_REGEX = /^(\d{4})-(0[1-9]|1[0-2])$/;

/* ------------------------------ formato ------------------------------ */

export const formatNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('es-CO', { maximumFractionDigits: 0 }) : '0';
};

export const formatPercent = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0%';
  return `${n.toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`;
};

// 'YYYY-MM-DD' → 'DD/MM/AAAA' ('—' si no hay fecha)
export const formatDateKey = (key) => {
  const date = parseActivityDate(key);
  if (!date) return '—';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

export const formatDateTime = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const hours = date.getHours();
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${formatDateKey(dateToKey(date))} ${pad(hour12)}:${pad(date.getMinutes())} ${hours < 12 ? 'a. m.' : 'p. m.'}`;
};

export const getMonthLabel = (monthKey) => {
  const match = MONTH_KEY_REGEX.exec(monthKey || '');
  if (!match) return monthKey || '';
  return `${MONTH_NAMES[Number(match[2]) - 1]} ${match[1]}`;
};

export const currentMonthKey = (now = new Date()) => dateToKey(now).slice(0, 7);

/** Meses seleccionables, del actual hacia atrás: [{ value: 'YYYY-MM', label }] */
export const getMonthOptions = (now = new Date(), count = 24) => {
  const options = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = dateToKey(d).slice(0, 7);
    options.push({ value, label: getMonthLabel(value) });
  }
  return options;
};

const slugify = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Nombre del archivo PDF: informe_supervision_<contratista>_<YYYY-MM>.pdf */
export const getReportFileName = (contractor, monthKey) =>
  `informe_supervision_${slugify(getContractorName(contractor)) || 'contratista'}_${monthKey}.pdf`;

/* ------------------------------ utilidades ------------------------------ */

const activityKey = (activity) => activity?.dateKey || toDateKey(activity?.date);

const isApproved = (activity) => !activity.status || activity.status === 'approved';

const monthBounds = (monthKey) => {
  const [year, month] = monthKey.split('-').map(Number);
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  return { year, month, firstKey: dateToKey(first), lastKey: dateToKey(last), daysInMonth: last.getDate() };
};

const listWorkingDayKeys = (fromKey, toKey) => {
  const keys = [];
  const cursor = parseActivityDate(fromKey);
  const end = parseActivityDate(toKey);
  if (!cursor || !end) return keys;
  while (cursor <= end) {
    if (isWorkingDay(cursor)) keys.push(dateToKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
};

const generatedByLabel = (generatedBy) => {
  if (!generatedBy) return '';
  if (typeof generatedBy === 'string') return generatedBy;
  return generatedBy.name || generatedBy.displayName || generatedBy.email || '';
};

const sedeKey = (activity) =>
  activity.locationId || normalizeLocationName(activity.location?.name) || 'sin-sede';

/* ------------------------------ metas ------------------------------ */

// Mismo mapeo que goalsService.calculateProgress (subtipo → clave de meta; raciones por tipo de sede)
const GOAL_COMPONENTS = [
  {
    id: 'nutrition',
    strategies: [
      { key: 'workshops', kind: 'educational', type: 'nutrition', subtype: 'workshop' },
      { key: 'centerRations', kind: 'rations', locationType: 'center', label: 'Raciones alimenticias en CDV' },
      { key: 'parkSnacks', kind: 'rations', locationType: 'park', label: 'Meriendas en parques y espacios' }
    ]
  },
  {
    id: 'physical',
    strategies: [
      { key: 'preventionTalks', kind: 'educational', type: 'physical', subtype: 'prevention' },
      { key: 'therapeuticActivity', kind: 'educational', type: 'physical', subtype: 'therapeutic' },
      { key: 'rumbaTherapy', kind: 'educational', type: 'physical', subtype: 'rumba' },
      { key: 'walkingClub', kind: 'educational', type: 'physical', subtype: 'walking' }
    ]
  },
  {
    id: 'psychosocial',
    strategies: [
      { key: 'mentalHealth', kind: 'educational', type: 'psychosocial', subtype: 'mental' },
      { key: 'cognitive', kind: 'educational', type: 'psychosocial', subtype: 'cognitive' },
      { key: 'abusePreventionWorkshops', kind: 'educational', type: 'psychosocial', subtype: 'abuse' },
      { key: 'artsAndCrafts', kind: 'educational', type: 'psychosocial', subtype: 'arts' },
      { key: 'intergenerational', kind: 'educational', type: 'psychosocial', subtype: 'intergenerational' }
    ]
  }
];

const countStrategy = (strategy, activities) => {
  if (strategy.kind === 'educational') {
    return activities.filter((a) => {
      const edu = a.educationalActivity;
      return edu?.included && edu.type === strategy.type && edu.subtype === strategy.subtype;
    }).length;
  }
  return summarizeAttendance(
    activities.filter((a) => a.nutritionDelivery?.included && getLocationType(a.location) === strategy.locationType)
  ).rations;
};

const buildGoalsSection = ({ contractor, goals, year, approvedYear, approvedMonth, cutoffKey, monthBoundsInfo }) => {
  const goalValues = goals?.activities || {};
  const components = [];
  let riskCount = 0;

  // Porcentaje esperado: fracción del año transcurrida al corte (meses completos + parte del mes en curso)
  const cutoffDate = parseActivityDate(cutoffKey);
  const monthFraction = cutoffDate ? cutoffDate.getDate() / monthBoundsInfo.daysInMonth : 1;
  const expectedPercent = Math.min(100, ((monthBoundsInfo.month - 1) + monthFraction) / 12 * 100);

  GOAL_COMPONENTS.forEach((component) => {
    const rows = [];
    component.strategies.forEach((strategy) => {
      const goal = Number(goalValues[component.id]?.[strategy.key]) || 0;
      if (goal <= 0) return;
      const inMonth = countStrategy(strategy, approvedMonth);
      const accumulated = countStrategy(strategy, approvedYear);
      const progressPercent = (accumulated / goal) * 100;
      const atRisk = progressPercent < expectedPercent - RISK_MARGIN_POINTS;
      if (atRisk) riskCount += 1;
      rows.push({
        key: strategy.key,
        label: strategy.kind === 'educational'
          ? getActivitySubtypeLabel(strategy.type, strategy.subtype, contractor)
          : strategy.label,
        unit: strategy.kind === 'rations' ? 'raciones' : 'actividades',
        goal,
        inMonth,
        accumulated,
        progressPercent,
        expectedPercent,
        atRisk
      });
    });
    if (rows.length > 0) {
      components.push({
        id: component.id,
        label: getActivityTypeLabel(component.id, contractor),
        rows
      });
    }
  });

  return {
    year,
    available: components.length > 0,
    expectedPercent,
    riskCount,
    components
  };
};

/* ------------------------------ constructor principal ------------------------------ */

/**
 * @param {string} contractor  id del contratista ('CUC', 'FUNDACARIBE', ...)
 * @param {string} monthKey    'YYYY-MM'
 * @param {{activities: Array, locations: Array, goals: Object|null, generatedBy: string|Object, now: Date}} data
 */
export const buildMonthlyReport = (contractor, monthKey, data = {}) => {
  if (!MONTH_KEY_REGEX.test(monthKey || '')) {
    throw new Error(`Mes inválido: ${monthKey}`);
  }
  const now = data.now instanceof Date ? data.now : new Date();
  const todayKeyValue = dateToKey(now);
  const bounds = monthBounds(monthKey);

  const isCurrentMonth = monthKey === todayKeyValue.slice(0, 7);
  let cutoffKey = bounds.lastKey < todayKeyValue ? bounds.lastKey : todayKeyValue;
  if (cutoffKey < bounds.firstKey) cutoffKey = bounds.firstKey; // mes futuro: sin información

  const allActivities = (data.activities || []).filter(
    (a) => a && (!a.contractor || a.contractor === contractor)
  );
  const locations = (data.locations || []).filter((l) => l && l.contractor === contractor);

  /* ---- asociación actividad → sede (igual que coverageUtils) ---- */
  const byId = new Map();
  const byName = new Map();
  locations.forEach((location, index) => {
    if (location.id) byId.set(location.id, index);
    const nameKey = normalizeLocationName(location.name);
    if (nameKey && !byName.has(nameKey)) byName.set(nameKey, index);
  });
  const findLocationIndex = (activity) => {
    if (activity.locationId && byId.has(activity.locationId)) return byId.get(activity.locationId);
    const index = byName.get(normalizeLocationName(activity.location?.name));
    return index === undefined ? null : index;
  };
  // Actividades del mes (cualquier estado) y aprobadas hasta el corte
  const monthAll = allActivities.filter((a) => {
    const key = activityKey(a);
    return key && key >= bounds.firstKey && key <= bounds.lastKey;
  });
  const approvedMonthRaw = monthAll.filter((a) => isApproved(a) && activityKey(a) <= cutoffKey);
  const yearStartKey = `${bounds.year}-01-01`;
  const approvedYearRaw = allActivities.filter((a) => {
    const key = activityKey(a);
    return isApproved(a) && key && key >= yearStartKey && key <= cutoffKey;
  });

  // Las actividades de una sede se unifican por su id (algunas solo traen el nombre) para que el
  // conteo por sede + fecha + jornada no duplique.
  const withSedeId = (activity) => {
    const index = findLocationIndex(activity);
    if (index === null || !locations[index].id) return activity;
    return { ...activity, locationId: locations[index].id };
  };
  const approvedMonth = approvedMonthRaw.map(withSedeId);
  const approvedYear = approvedYearRaw.map(withSedeId);
  const perLocation = locations.map(() => []);
  approvedMonth.forEach((activity) => {
    const index = findLocationIndex(activity);
    if (index !== null) perLocation[index].push(activity);
  });

  /* ---- cobertura por sede ---- */
  const coverage = computeLocationCoverage(locations, allActivities, cutoffKey);
  const coverageById = new Map(coverage.rows.map((row) => [row.id, row]));
  const workingKeys = listWorkingDayKeys(bounds.firstKey, cutoffKey);
  const workingSet = new Set(workingKeys);
  const expectedJornadasPerCdv = workingKeys.length * 2;

  let cdvCovered = 0;
  let cdvExpected = 0;
  let cdvCount = 0;
  const sedeRows = [];

  locations.forEach((location, index) => {
    if (location.active === false) return;
    const acts = perLocation[index];
    const type = getLocationType({ type: location.type });
    const cov = coverageById.get(location.id || normalizeLocationName(location.name));
    const summary = summarizeAttendance(acts);
    const days = new Set(acts.map(activityKey));
    let jornadasCovered = null;
    let jornadasExpected = null;
    if (type === 'center') {
      const set = new Set();
      acts.forEach((a) => {
        const key = activityKey(a);
        const jornada = normalizeJornada(a.schedule);
        if (workingSet.has(key) && (jornada === 'J1' || jornada === 'J2')) set.add(`${key}|${jornada}`);
      });
      jornadasCovered = set.size;
      jornadasExpected = expectedJornadasPerCdv;
      cdvCovered += jornadasCovered;
      cdvExpected += jornadasExpected;
      cdvCount += 1;
    }
    const status = cov?.status || COVERAGE_STATUS.NEVER;
    sedeRows.push({
      id: location.id || normalizeLocationName(location.name),
      name: location.name || 'Sede sin nombre',
      type,
      typeLabel: LOCATION_TYPE_LABELS[type] || LOCATION_TYPE_LABELS.unknown,
      daysWithAttention: days.size,
      jornadasCovered,
      jornadasExpected,
      jornadasPercent: jornadasExpected ? Math.round((jornadasCovered / jornadasExpected) * 100) : null,
      activities: acts.length,
      attentions: summary.people,
      rations: summary.rations,
      lastAttentionKey: cov?.lastAttentionKey || null,
      daysSince: cov ? cov.daysSince : null,
      status,
      statusLabel: COVERAGE_STATUS_LABELS[status],
      attendedInMonth: acts.length > 0
    });
  });

  const typeOrder = { center: 0, park: 1, unknown: 2 };
  sedeRows.sort((a, b) =>
    (typeOrder[a.type] - typeOrder[b.type]) || a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
  );

  const withoutAttention = sedeRows
    .filter((row) => !row.attendedInMonth)
    .map((row) => ({
      id: row.id,
      name: row.name,
      typeLabel: row.typeLabel,
      lastAttentionKey: row.lastAttentionKey,
      statusLabel: row.statusLabel
    }));

  /* ---- resumen ---- */
  const approvedAttendance = summarizeAttendance(approvedMonth);
  const centerActs = approvedMonth.filter((a) => getLocationType(a.location) === 'center');
  const parkActs = approvedMonth.filter((a) => getLocationType(a.location) === 'park');
  const summary = {
    educationalActivities: approvedMonth.filter((a) => a.educationalActivity?.included).length,
    approvedActivities: approvedMonth.length,
    attentions: approvedAttendance.people,
    attendees: approvedAttendance.attendees,
    centerRations: summarizeAttendance(centerActs).rations,
    parkSnacks: summarizeAttendance(parkActs).rations,
    jornadas: approvedAttendance.jornadas,
    sedesAttended: sedeRows.filter((r) => r.attendedInMonth).length,
    sedesActive: sedeRows.length,
    sedesWithoutAttention: withoutAttention.length,
    cdvCount,
    workingDays: workingKeys.length,
    cdvJornadas: {
      covered: cdvCovered,
      expected: cdvExpected,
      percent: cdvExpected > 0 ? Math.round((cdvCovered / cdvExpected) * 100) : null
    }
  };

  /* ---- metas ---- */
  const goalsSection = buildGoalsSection({
    contractor,
    goals: data.goals,
    year: bounds.year,
    approvedYear,
    approvedMonth,
    cutoffKey,
    monthBoundsInfo: bounds
  });

  /* ---- componente y estrategia ---- */
  const components = ['nutrition', 'physical', 'psychosocial'].map((type) => {
    const ofType = approvedMonth.filter((a) => a.educationalActivity?.included && a.educationalActivity.type === type);
    const subtypes = new Map();
    ofType.forEach((a) => {
      const subtype = a.educationalActivity.subtype || 'otro';
      if (!subtypes.has(subtype)) subtypes.set(subtype, []);
      subtypes.get(subtype).push(a);
    });
    const strategies = Array.from(subtypes.entries())
      .map(([subtype, acts]) => ({
        subtype,
        label: subtype === 'otro' ? 'Sin subtipo' : getActivitySubtypeLabel(type, subtype, contractor),
        activities: acts.length,
        attentions: summarizeAttendance(acts).people
      }))
      .sort((a, b) => b.activities - a.activities);
    return {
      type,
      label: getActivityTypeLabel(type, contractor),
      activities: ofType.length,
      attentions: summarizeAttendance(ofType).people,
      strategies
    };
  });
  const deliveryOf = (acts) => acts.filter((a) => a.nutritionDelivery?.included);
  const delivery = [
    { label: 'Raciones en CDV', activities: deliveryOf(centerActs).length, rations: summary.centerRations },
    { label: 'Meriendas en parques', activities: deliveryOf(parkActs).length, rations: summary.parkSnacks }
  ];

  /* ---- profesionales ---- */
  const performers = new Map();
  approvedMonth.forEach((activity) => {
    const { uid, name } = getPerformer(activity);
    if (!performers.has(uid)) performers.set(uid, { uid, name, activities: [] });
    performers.get(uid).activities.push(activity);
  });
  const professionals = Array.from(performers.values())
    .map(({ uid, name, activities }) => ({
      uid,
      name,
      activities: activities.length,
      attentions: summarizeAttendance(activities).people,
      sedes: new Set(activities.map(sedeKey)).size,
      activeDays: new Set(activities.map(activityKey)).size,
      onBehalf: activities.filter(isRegisteredOnBehalf).length
    }))
    .sort((a, b) => b.attentions - a.attentions || a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

  /* ---- calidad del registro ---- */
  const rejected = monthAll.filter((a) => a.status === 'rejected');
  const reasons = new Map();
  rejected.forEach((a) => {
    const reason = String(a.rejectionReason || '').trim() || 'Sin motivo registrado';
    const key = reason.toLowerCase();
    const entry = reasons.get(key) || { reason, count: 0 };
    entry.count += 1;
    reasons.set(key, entry);
  });
  const withoutLink = monthAll.filter((a) => !String(a.driveLink || '').trim()).length;
  const late = monthAll.filter((a) => {
    const created = toDateKey(a.createdAt);
    const diff = created ? daysBetween(activityKey(a), created) : null;
    return diff !== null && diff > LATE_REGISTRATION_DAYS;
  }).length;
  const quality = {
    registered: monthAll.length,
    approved: monthAll.filter(isApproved).length,
    rejected: rejected.length,
    topRejectionReasons: Array.from(reasons.values()).sort((a, b) => b.count - a.count).slice(0, 3),
    pending: monthAll.filter((a) => a.status === 'pending').length,
    withoutLink,
    withoutLinkPercent: monthAll.length > 0 ? Math.round((withoutLink / monthAll.length) * 100) : 0,
    late,
    lateDays: LATE_REGISTRATION_DAYS,
    onBehalf: monthAll.filter(isRegisteredOnBehalf).length
  };

  /* ---- encabezado y cierre ---- */
  const meta = {
    program: PROGRAM_NAME,
    title: REPORT_TITLE,
    contractorId: contractor,
    contractorName: getContractorName(contractor),
    contractorFullName: getContractorFullName(contractor),
    monthKey,
    year: bounds.year,
    periodLabel: getMonthLabel(monthKey),
    isCurrentMonth,
    cutoffKey,
    cutoffLabel: formatDateKey(cutoffKey),
    cutoffNote: isCurrentMonth ? `corte al ${formatDateKey(cutoffKey)}` : '',
    generatedAt: now,
    generatedAtLabel: formatDateTime(now),
    generatedBy: generatedByLabel(data.generatedBy),
    fileName: getReportFileName(contractor, monthKey)
  };

  const closing = {
    observationsLabel: 'Observaciones del supervisor',
    signatures: ['Supervisor(a) del Distrito', 'Representante legal de la entidad'],
    footnotes: [
      'Atenciones: número de personas atendidas por jornada, sumadas por sede, fecha y jornada (J1 y J2 se suman como personas distintas; '
        + 'si en una misma jornada hay actividad educativa y entrega de alimentación se toma el mayor valor, sin doble conteo). '
        + 'No corresponde a personas únicas: una misma persona que asiste varios días se cuenta en cada atención.',
      'Solo cuentan las actividades aprobadas por el representante legal de la entidad. Las jornadas esperadas en CDV son los días hábiles '
        + '(lunes a viernes) del periodo hasta la fecha de corte por 2 (J1 y J2); no se descuentan festivos.',
      'El porcentaje esperado de las metas es la fracción del año transcurrida a la fecha de corte; una estrategia se marca "En riesgo" cuando '
        + `su avance está más de ${RISK_MARGIN_POINTS} puntos por debajo.`
    ]
  };

  return {
    meta,
    isEmpty: monthAll.length === 0,
    summary,
    coverage: { rows: sedeRows, withoutAttention, unmatchedCount: coverage.unmatched.count },
    goals: goalsSection,
    components,
    delivery,
    professionals,
    quality,
    closing
  };
};

export default buildMonthlyReport;
