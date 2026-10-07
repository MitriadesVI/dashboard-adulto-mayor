import { getLocationType, getIsoWeek, getIsoWeekKey, formatDate } from '../../common/helpers';
import { parseActivityDate, toDateKey, todayKey, daysBetween } from '../../../../utils/dates';

export const performDetailedAnalysis = (locationActivities, locationInfo) => {
  const isCenterLocation = getLocationType(locationInfo) === 'center';
  const capacity = Number(locationInfo?.capacity) || 0;
  
  // 1. AGRUPACIÓN POR DÍA + JORNADA para cálculo correcto de promedios
  const dayGroupMap = new Map();
  
  locationActivities.forEach(activity => {
    // Fecha 'YYYY-MM-DD' en hora local; sin fecha válida no se puede agrupar por día
    const dateKey = activity.dateKey || toDateKey(activity.date);
    if (!dateKey) return;
    const schedule = activity.schedule || 'general';
    const groupKey = `${dateKey}-${schedule}`;
    
    if (!dayGroupMap.has(groupKey)) {
      dayGroupMap.set(groupKey, {
        date: dateKey,
        schedule: schedule,
        maxBeneficiaries: 0,
        activities: [],
        hasEducational: false,
        hasNutrition: false,
        nutritionRations: 0,
        components: new Set()
      });
    }
    
    const group = dayGroupMap.get(groupKey);
    group.activities.push(activity);
    
    // Tomar el MÁXIMO de beneficiarios para el promedio
    const beneficiaries = Number(activity.totalBeneficiaries) || 0;
    group.maxBeneficiaries = Math.max(group.maxBeneficiaries, beneficiaries);
    
    // Registrar componentes
    if (activity.educationalActivity && activity.educationalActivity.included) {
      group.hasEducational = true;
      group.components.add(activity.educationalActivity.type);
    }
    
    if (activity.nutritionDelivery && activity.nutritionDelivery.included) {
      group.hasNutrition = true;
      group.nutritionRations += beneficiaries;
      group.components.add('nutrition');
    }
  });

  const dayGroups = Array.from(dayGroupMap.values());
  
  // 2. CÁLCULOS DE MÉTRICAS PRINCIPALES
  const totalUniqueActivities = locationActivities.filter(a => 
    a.educationalActivity && a.educationalActivity.included
  ).length;
  
  const totalNutritionDeliveries = locationActivities.filter(a => 
    a.nutritionDelivery && a.nutritionDelivery.included
  ).length;
  
  const totalRations = locationActivities
    .filter(a => a.nutritionDelivery && a.nutritionDelivery.included)
    .reduce((sum, a) => sum + (Number(a.totalBeneficiaries) || 0), 0);

  // Promedio general de asistencia (máximo por día+jornada)
  const totalMaxBeneficiaries = dayGroups.reduce((sum, group) => sum + group.maxBeneficiaries, 0);
  const totalServiceSessions = dayGroups.length;
  const averageAttendance = totalServiceSessions > 0 ? Math.round(totalMaxBeneficiaries / totalServiceSessions) : 0;

  // Promedios por jornada (solo para centros)
  let j1Data = { beneficiaries: 0, sessions: 0 };
  let j2Data = { beneficiaries: 0, sessions: 0 };
  
  if (isCenterLocation) {
    dayGroups.forEach(group => {
      if (group.schedule === 'J1') {
        j1Data.beneficiaries += group.maxBeneficiaries;
        j1Data.sessions++;
      } else if (group.schedule === 'J2') {
        j2Data.beneficiaries += group.maxBeneficiaries;
        j2Data.sessions++;
      }
    });
  }

  const avgJ1 = j1Data.sessions > 0 ? Math.round(j1Data.beneficiaries / j1Data.sessions) : 0;
  const avgJ2 = j2Data.sessions > 0 ? Math.round(j2Data.beneficiaries / j2Data.sessions) : 0;

  return {
    dayGroups,
    summary: {
      totalActivities: totalUniqueActivities,
      totalNutritionDeliveries,
      totalRations,
      averageAttendance,
      avgJ1,
      avgJ2,
      serviceSessions: totalServiceSessions,
      uniqueServiceDays: [...new Set(dayGroups.map(g => g.date))].length,
      capacity,
      utilizationRate: capacity > 0 ? Math.round((averageAttendance / capacity) * 100) : 0
    }
  };
};

export const analyzeComponents = (activities) => {
  const components = {
    nutrition: { activities: 0, deliveries: 0, rations: 0, strategies: {} },
    physical: { activities: 0, strategies: {} },
    psychosocial: { activities: 0, strategies: {} }
  };

  activities.forEach(activity => {
    if (activity.educationalActivity && activity.educationalActivity.included) {
      const type = activity.educationalActivity.type;
      const subtype = activity.educationalActivity.subtype || 'Sin especificar';
      
      if (components[type]) {
        components[type].activities++;
        components[type].strategies[subtype] = (components[type].strategies[subtype] || 0) + 1;
      }
    }
    
    if (activity.nutritionDelivery && activity.nutritionDelivery.included) {
      components.nutrition.deliveries++;
      components.nutrition.rations += Number(activity.totalBeneficiaries) || 0;
      
      const deliveryType = activity.nutritionDelivery.type || 'general';
      components.nutrition.strategies[deliveryType] = (components.nutrition.strategies[deliveryType] || 0) + 1;
    }
  });

  return components;
};

// Período evaluado para la regularidad del servicio: desde la primera sesión hasta el fin de la
// ventana de análisis (fecha final del filtro o, si no hay, hoy), y nunca antes de la última sesión.
// Así una ubicación abandonada no parece regular por medirse solo hasta su última sesión.
const getEvaluationPeriod = (sortedDates, windowEndKey) => {
  if (sortedDates.length === 0) return { startKey: null, endKey: null, days: 0 };

  const startKey = sortedDates[0];
  const lastKey = sortedDates[sortedDates.length - 1];
  const endKey = windowEndKey && windowEndKey > lastKey ? windowEndKey : lastKey;

  return { startKey, endKey, days: daysBetween(startKey, endKey) + 1 };
};

// Fechas únicas 'YYYY-MM-DD' (ordenadas) de los grupos día + jornada
const getSortedServiceDates = (dayGroups) =>
  [...new Set(dayGroups.map(g => g.date).filter(Boolean))].sort();

export const analyzeTemporalPatterns = (dayGroups, windowEndKey = todayKey()) => {
  const patterns = {
    weeklyAverages: {},
    monthlyCalendar: {},
    serviceRegularity: 0,
    availableMonths: [],
    periodDays: 0
  };

  // Agrupar las sesiones por día
  const groupsByDate = new Map();
  dayGroups.forEach(group => {
    if (!group.date) return;
    if (!groupsByDate.has(group.date)) groupsByDate.set(group.date, []);
    groupsByDate.get(group.date).push(group);
  });
  const sortedDates = getSortedServiceDates(dayGroups);

  // 1. Meses con datos (ordenados cronológicamente)
  patterns.availableMonths = [...new Set(sortedDates.map(dateKey => dateKey.slice(0, 7)))];

  // 2. Datos semanales (semanas ISO)
  sortedDates.forEach(dateKey => {
    const date = parseActivityDate(dateKey);
    if (!date) return;

    const weekKey = getIsoWeekKey(date);
    if (!patterns.weeklyAverages[weekKey]) {
      const { year, week } = getIsoWeek(date);
      patterns.weeklyAverages[weekKey] = { 
        beneficiaries: 0, 
        sessions: 0, 
        week,
        year,
        monthName: date.toLocaleDateString('es-ES', { month: 'short' })
      };
    }

    groupsByDate.get(dateKey).forEach(group => {
      patterns.weeklyAverages[weekKey].beneficiaries += group.maxBeneficiaries;
      patterns.weeklyAverages[weekKey].sessions++;
    });
  });

  // Calcular promedios semanales
  Object.values(patterns.weeklyAverages).forEach(week => {
    week.average = week.sessions > 0 ? Math.round(week.beneficiaries / week.sessions) : 0;
  });

  // 3. Calendario mensual con TODOS los meses que tienen datos
  // (la pestaña de calendario muestra el mes al que navega el usuario)
  groupsByDate.forEach((groups, dateKey) => {
    patterns.monthlyCalendar[dateKey] = {
      date: dateKey,
      dayOfMonth: parseInt(dateKey.slice(8, 10), 10),
      services: groups.length,
      attendance: groups.reduce((sum, g) => sum + g.maxBeneficiaries, 0),
      rations: groups.reduce((sum, g) => sum + g.nutritionRations, 0),
      components: [...new Set(groups.flatMap(g => Array.from(g.components)))]
    };
  });

  // 4. Regularidad del servicio: % de días del período con servicio
  const period = getEvaluationPeriod(sortedDates, windowEndKey);
  patterns.periodDays = period.days;
  patterns.serviceRegularity = period.days > 0 ? (sortedDates.length / period.days) * 100 : 0;

  return patterns;
};

export const analyzeWeaknesses = (avgAttendance, capacity, components, dayGroups, isCenter, windowEndKey = todayKey()) => {
  const weaknesses = [];
  
  if (isCenter && capacity > 0) {
    const capacityUtilization = (avgAttendance / capacity) * 100;
    if (capacityUtilization < 80) {
      weaknesses.push({
        type: 'low_capacity',
        severity: capacityUtilization < 50 ? 'high' : 'medium',
        message: `Baja utilización de capacidad: ${capacityUtilization.toFixed(1)}% (${avgAttendance}/${capacity})`,
        suggestion: 'Considerar estrategias de convocatoria o revisar horarios de atención'
      });
    }
  }

  const expectedComponents = ['nutrition', 'physical', 'psychosocial'];
  const missingComponents = expectedComponents.filter(comp =>
    components[comp].activities === 0 && (components[comp].deliveries === 0 || components[comp].deliveries === undefined)
  );
  
  if (missingComponents.length > 0) {
    const componentNames = missingComponents.map(comp => {
      if (comp === 'nutrition') return 'nutricional';
      if (comp === 'physical') return 'salud física';
      if (comp === 'psychosocial') return 'psicosocial';
      return comp;
    });
    
    weaknesses.push({
      type: 'missing_components',
      severity: 'medium',
      message: `Componentes sin actividades: ${componentNames.join(', ')}`,
      suggestion: 'Programar actividades de los componentes faltantes'
    });
  }

  // Regularidad del servicio, medida hasta el fin de la ventana de análisis (ver getEvaluationPeriod)
  const uniqueDates = getSortedServiceDates(dayGroups);
  const period = getEvaluationPeriod(uniqueDates, windowEndKey);
  const totalDaysInPeriod = period.days;
  
  // Calcular días de servicio esperados según tipo de ubicación
  const expectedServiceDays = isCenter ? 
    Math.floor(totalDaysInPeriod * 5/7) : // Centros: 5 días por semana (L-V)
    Math.floor(totalDaysInPeriod * 2/7);  // Parques: 2 días por semana
  
  const serviceRegularity = expectedServiceDays > 0 ? 
    (uniqueDates.length / expectedServiceDays) * 100 : 0;
  
  if (serviceRegularity < 60 && totalDaysInPeriod > 7) {
    const locationTypeText = isCenter ? 'centro' : 'parque';
    weaknesses.push({
      type: 'irregular_service',
      severity: 'medium',
      message: `Servicio irregular: solo ${uniqueDates.length} de ${expectedServiceDays} días esperados para un ${locationTypeText} entre el ${formatDate(period.startKey)} y el ${formatDate(period.endKey)} (${serviceRegularity.toFixed(1)}%)`,
      suggestion: 'Revisar programación y asegurar continuidad del servicio'
    });
  }

  return { 
    weaknesses, 
    alerts: [], 
    metrics: { 
      serviceRegularity,
      uniqueServiceDays: uniqueDates.length,
      expectedServiceDays,
      totalDaysInPeriod,
      periodStart: period.startKey,
      periodEnd: period.endKey
    } 
  };
};
