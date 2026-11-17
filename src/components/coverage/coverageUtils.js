// src/components/coverage/coverageUtils.js
//
// Cálculo puro (sin React) de la cobertura de sedes: qué sedes registradas han recibido
// atención y cuáles no. "Atención" = actividad APROBADA en esa sede.
//
// Las actividades se asocian a una sede por locationId (actividades nuevas) o, si no lo
// tienen, por nombre normalizado (sin tildes, minúsculas, espacios colapsados).

import { parseActivityDate, toDateKey, dateToKey, daysBetween, todayKey } from '../../utils/dates';
import { getLocationType, formatSchedule } from '../dashboard/common/helpers';

export const COVERAGE_STATUS = {
  OK: 'ok',
  WARNING: 'warning',
  CRITICAL: 'critical',
  NEVER: 'never'
};

// Umbrales (en días calendario desde la última atención aprobada)
export const OK_MAX_DAYS = 7;
export const WARNING_MAX_DAYS = 14;

// Ventanas de análisis
export const RECENT_WINDOW_DAYS = 30;
export const JORNADA_WINDOW_WORKING_DAYS = 10;
const JORNADAS_PER_DAY = 2; // J1 y J2

/**
 * Normaliza un nombre de sede para compararlo: sin tildes, minúsculas, sin espacios repetidos.
 */
export const normalizeLocationName = (name) =>
  String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/**
 * true si la fecha cae de lunes a viernes. (No considera festivos.)
 */
export const isWorkingDay = (date) => {
  const day = date.getDay();
  return day >= 1 && day <= 5;
};

/**
 * Cantidad de días hábiles (lunes a viernes) transcurridos después de `from` hasta `to`
 * inclusive. Si la última actividad fue el viernes y hoy es martes, devuelve 2.
 * Devuelve 0 si `to` no es posterior a `from` o alguna fecha no es válida.
 */
export const workingDaysBetween = (from, to) => {
  const start = parseActivityDate(from);
  const end = parseActivityDate(to);
  if (!start || !end || end <= start) return 0;

  let count = 0;
  const cursor = new Date(start);
  cursor.setDate(cursor.getDate() + 1);
  while (cursor <= end) {
    if (isWorkingDay(cursor)) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
};

/**
 * Claves 'YYYY-MM-DD' de los últimos `count` días hábiles (L–V), contando hacia atrás
 * desde la fecha de referencia (incluida si es día hábil). La más reciente va primero.
 */
export const getRecentWorkingDayKeys = (referenceDate, count = JORNADA_WINDOW_WORKING_DAYS) => {
  const reference = parseActivityDate(referenceDate) || parseActivityDate(new Date());
  const keys = [];
  const cursor = new Date(reference);
  while (keys.length < count) {
    if (isWorkingDay(cursor)) keys.push(dateToKey(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return keys;
};

/**
 * Estado de una sede según los días sin atención. null → nunca atendida.
 */
export const getCoverageStatus = (daysSince) => {
  if (daysSince === null || daysSince === undefined) return COVERAGE_STATUS.NEVER;
  if (daysSince <= OK_MAX_DAYS) return COVERAGE_STATUS.OK;
  if (daysSince <= WARNING_MAX_DAYS) return COVERAGE_STATUS.WARNING;
  return COVERAGE_STATUS.CRITICAL;
};

// 'J1' | 'J2' | null (acepta también 'morning'/'afternoon' de actividades antiguas)
const normalizeJornada = (schedule) => {
  const label = formatSchedule(schedule);
  return label === 'J1' || label === 'J2' ? label : null;
};

// Beneficiarios únicos de las actividades de UNA sede: por fecha + jornada se toma el
// máximo (evita doble conteo educativa + ración), y se suman las jornadas.
// Misma regla que calculateUniqueAttendance, pero sin ruido en consola ni agrupar por nombre.
const uniqueAttendance = (activities) => {
  const groups = new Map();
  activities.forEach((activity) => {
    const key = `${activity.dateKey || toDateKey(activity.date)}|${activity.schedule || 'general'}`;
    const beneficiaries = Number(activity.totalBeneficiaries) || 0;
    if (!groups.has(key) || groups.get(key) < beneficiaries) groups.set(key, beneficiaries);
  });
  let total = 0;
  groups.forEach((value) => { total += value; });
  return total;
};

/**
 * Resumen de una lista de filas de cobertura.
 * critical = más de 14 días; never = sin ninguna atención aprobada;
 * needsAttention = critical + never.
 */
export const summarizeCoverage = (rows) => {
  const summary = { total: 0, ok: 0, warning: 0, critical: 0, never: 0, needsAttention: 0 };
  (rows || []).forEach((row) => {
    summary.total += 1;
    summary[row.status] += 1;
  });
  summary.needsAttention = summary.critical + summary.never;
  return summary;
};

/**
 * Cobertura de cada sede ACTIVA (active !== false), incluidas las que no tienen ninguna actividad.
 *
 * @param {Array}  locations     Sedes {id, name, type: 'center'|'park', address, contractor, active, ...}
 * @param {Array}  activities    Actividades de cualquier estado (se usan aprobadas y pendientes;
 *                               las rechazadas se ignoran). Con dateKey o date.
 * @param {Date|string} referenceDate  Fecha de corte (por defecto hoy).
 * @returns {{
 *   referenceKey: string,
 *   rows: Array<{
 *     id: string, name: string, type: 'center'|'park'|'unknown', address: string, contractor: string,
 *     lastAttentionKey: string|null, lastAttentionDate: Date|null, daysSince: number|null,
 *     status: 'ok'|'warning'|'critical'|'never',
 *     activities30: number, beneficiaries30: number, pendingCount: number,
 *     jornada: null | { covered: number, expected: number, percent: number, workingDays: number }
 *   }>,
 *   summary: { total, ok, warning, critical, never, needsAttention },
 *   unmatched: { count: number, byName: Array<{ name: string, count: number }> }
 * }}
 *  `rows` viene ordenado por más días sin atención primero (nunca atendidas al inicio).
 *  `jornada` solo existe para sedes tipo 'center' (CDV): jornadas J1/J2 distintas con actividad
 *  aprobada en los últimos 10 días hábiles, sobre 20.
 *  `unmatched` agrupa las actividades (aprobadas o pendientes) cuyo lugar no coincide con ninguna sede registrada.
 */
export const computeLocationCoverage = (locations, activities, referenceDate = new Date()) => {
  const referenceKey = toDateKey(referenceDate) || todayKey();
  const workingKeys = getRecentWorkingDayKeys(referenceKey, JORNADA_WINDOW_WORKING_DAYS);
  const workingSet = new Set(workingKeys);
  const recentStartDate = parseActivityDate(referenceKey);
  recentStartDate.setDate(recentStartDate.getDate() - (RECENT_WINDOW_DAYS - 1));
  const recentStartKey = dateToKey(recentStartDate);

  // Índices de TODAS las sedes (también inactivas), para no tratar como "sin sede"
  // las actividades de una sede dada de baja.
  const registered = (locations || []).filter(Boolean);
  const byId = new Map();
  const byName = new Map();
  registered.forEach((location, index) => {
    if (location.id) byId.set(location.id, index);
    const nameKey = normalizeLocationName(location.name);
    if (nameKey) {
      if (!byName.has(nameKey)) byName.set(nameKey, []);
      byName.get(nameKey).push(index);
    }
  });

  const findLocationIndex = (activity) => {
    if (activity.locationId && byId.has(activity.locationId)) return byId.get(activity.locationId);
    const candidates = byName.get(normalizeLocationName(activity.location?.name));
    if (!candidates) return null;
    // Si hay sedes con el mismo nombre en distintos contratistas, respetar el contratista
    const match = candidates.find((index) => {
      const locationContractor = registered[index].contractor;
      return !locationContractor || !activity.contractor || locationContractor === activity.contractor;
    });
    return match === undefined ? null : match;
  };

  // Una sola pasada por las actividades
  const buckets = registered.map(() => ({ approved: [], pending: 0 }));
  const unmatchedByName = new Map();
  let unmatchedCount = 0;

  (activities || []).forEach((activity) => {
    if (!activity) return;
    const isApproved = !activity.status || activity.status === 'approved';
    const isPending = activity.status === 'pending';
    if (!isApproved && !isPending) return;

    const index = findLocationIndex(activity);
    if (index === null) {
      unmatchedCount += 1;
      const displayName = (activity.location?.name || 'Sin nombre').trim() || 'Sin nombre';
      const nameKey = normalizeLocationName(displayName);
      const entry = unmatchedByName.get(nameKey) || { name: displayName, count: 0 };
      entry.count += 1;
      unmatchedByName.set(nameKey, entry);
      return;
    }

    if (isPending) buckets[index].pending += 1;
    else buckets[index].approved.push(activity);
  });

  const rows = [];
  registered.forEach((location, index) => {
    if (location.active === false) return;

    const type = getLocationType({ type: location.type });
    const { approved, pending } = buckets[index];

    let lastKey = null;
    const recent = [];
    const jornadasCovered = new Set();

    approved.forEach((activity) => {
      const key = activity.dateKey || toDateKey(activity.date);
      if (!key || key > referenceKey) return; // sin fecha o fecha futura: no cuenta como atención
      if (!lastKey || key > lastKey) lastKey = key;
      if (key >= recentStartKey) recent.push(activity);
      if (type === 'center' && workingSet.has(key)) {
        const jornada = normalizeJornada(activity.schedule);
        if (jornada) jornadasCovered.add(`${key}|${jornada}`);
      }
    });

    const daysSince = lastKey ? daysBetween(lastKey, referenceKey) : null;
    const expected = workingKeys.length * JORNADAS_PER_DAY;

    rows.push({
      id: location.id || normalizeLocationName(location.name),
      name: location.name || 'Sede sin nombre',
      type,
      address: location.address || '',
      contractor: location.contractor || '',
      lastAttentionKey: lastKey,
      lastAttentionDate: lastKey ? parseActivityDate(lastKey) : null,
      daysSince,
      status: getCoverageStatus(daysSince),
      activities30: recent.length,
      beneficiaries30: uniqueAttendance(recent),
      pendingCount: pending,
      jornada: type === 'center'
        ? {
            covered: jornadasCovered.size,
            expected,
            percent: expected > 0 ? Math.round((jornadasCovered.size / expected) * 100) : 0,
            workingDays: workingKeys.length
          }
        : null
    });
  });

  // Más días sin atención primero (nunca atendidas al inicio), luego por nombre
  rows.sort((a, b) => {
    const aDays = a.daysSince === null ? Infinity : a.daysSince;
    const bDays = b.daysSince === null ? Infinity : b.daysSince;
    if (aDays !== bDays) return aDays > bDays ? -1 : 1;
    return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
  });

  return {
    referenceKey,
    rows,
    summary: summarizeCoverage(rows),
    unmatched: {
      count: unmatchedCount,
      byName: Array.from(unmatchedByName.values()).sort((a, b) => b.count - a.count)
    }
  };
};
