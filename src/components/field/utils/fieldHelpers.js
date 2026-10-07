// src/components/field/utils/fieldHelpers.js
import {
  calculateUniqueAttendance,
  calculateAverageAttendance,
  getActivityTypeLabel,
  getActivitySubtypeLabel,
  formatDate,
  getLocationType
} from '../../dashboard/common/helpers';
import { parseActivityDate, toDateKey, dateToKey, todayKey } from '../../../utils/dates';

/**
 * Filtra las actividades para incluir solo las educativas.
 * @param {Array} activities - Lista de todas las actividades.
 * @returns {Array} - Lista de actividades educativas.
 */
export const getEducationalActivities = (activities) => {
  if (!activities || !Array.isArray(activities)) return [];
  return activities.filter(
    (activity) => activity?.educationalActivity?.included === true
  );
};

/**
 * Calcula los KPIs personales para el personal de campo.
 * @param {Array} userActivities - Actividades APROBADAS del usuario actual (ya filtradas por período).
 * @returns {Object} - Objeto con los KPIs: totalEducationalActivities, uniqueBeneficiaries y
 *   avgBeneficiariesPerActivity (asistencia promedio por jornada: ubicación + fecha + jornada).
 */
export const calculateFieldUserKPIs = (userActivities) => {
  const educationalActivities = getEducationalActivities(userActivities);

  const totalEducationalActivities = educationalActivities.length;
  const uniqueBeneficiaries = calculateUniqueAttendance(educationalActivities);

  // Se divide por el número de jornadas (no por registros) para no diluir la asistencia
  // cuando se registran varias actividades en la misma jornada.
  const avgBeneficiariesPerActivity = calculateAverageAttendance(educationalActivities);

  return {
    totalEducationalActivities,
    uniqueBeneficiaries,
    avgBeneficiariesPerActivity,
  };
};

/**
 * NUEVA FUNCIÓN: Calcula las estadísticas por estrategia/subtipo específico.
 * @param {Array} userActivities - Actividades educativas del usuario.
 * @param {string} contractor - Nombre del contratista del usuario.
 * @returns {Array} - Array de objetos { strategyName, componentType, count } para la tabla.
 */
export const getStatsByStrategy = (userActivities, contractor) => {
  const educationalActivities = getEducationalActivities(userActivities);
  const strategyStats = {};

  educationalActivities.forEach((activity) => {
    if (activity.educationalActivity?.type && activity.educationalActivity?.subtype) {
      const componentType = activity.educationalActivity.type;
      const subtype = activity.educationalActivity.subtype;
      const strategyName = getActivitySubtypeLabel(componentType, subtype, contractor);
      
      const key = `${componentType}-${subtype}`;
      if (!strategyStats[key]) {
        strategyStats[key] = {
          strategyName,
          componentType,
          subtype,
          count: 0
        };
      }
      strategyStats[key].count += 1;
    }
  });

  // Convertir a array y ordenar por cantidad (descendente)
  return Object.values(strategyStats).sort((a, b) => b.count - a.count);
};

/**
 * Calcula las métricas por componente (Nutrition, Physical, Psychosocial) para actividades educativas.
 * @param {Array} userActivities - Actividades educativas del usuario.
 * @param {string} contractor - Nombre del contratista del usuario.
 * @returns {Array} - Array de objetos { name, value } para el gráfico.
 */
export const getStatsByComponent = (userActivities, contractor) => {
  const educationalActivities = getEducationalActivities(userActivities);
  const stats = {
    nutrition: 0,
    physical: 0,
    psychosocial: 0,
  };

  educationalActivities.forEach((activity) => {
    if (activity.educationalActivity?.type) {
      stats[activity.educationalActivity.type] = (stats[activity.educationalActivity.type] || 0) + 1;
    }
  });

  return [
    { name: getActivityTypeLabel('nutrition', contractor), value: stats.nutrition },
    { name: getActivityTypeLabel('physical', contractor), value: stats.physical },
    { name: getActivityTypeLabel('psychosocial', contractor), value: stats.psychosocial },
  ];
};

/**
 * Calcula las métricas por modalidad (Centro de Vida vs Parque/Espacio) para actividades educativas.
 * @param {Array} userActivities - Actividades educativas del usuario.
 * @returns {Array} - Array de objetos { name, value } para el gráfico.
 */
export const getStatsByModality = (userActivities) => {
  const educationalActivities = getEducationalActivities(userActivities);
  const stats = {
    center: 0,
    park: 0,
  };

  educationalActivities.forEach((activity) => {
    const modality = getLocationType(activity.location);
    if (modality === 'center') {
      stats.center += 1;
    } else if (modality === 'park') {
      stats.park += 1;
    }
  });

  return [
    { name: 'Centro de Vida', value: stats.center },
    { name: 'Parque/Espacio', value: stats.park },
  ];
};

/**
 * Calcula la racha activa de días consecutivos registrando actividades educativas.
 * Usa claves 'YYYY-MM-DD' (hora local): varias actividades el mismo día cuentan una sola vez.
 * Si hoy no hay actividades, la racha se cuenta hacia atrás desde ayer.
 * @param {Array} userActivities - Todas las actividades del usuario (sin filtro de período).
 * @returns {number} - Número de días consecutivos de racha.
 */
export const calculateActiveStreak = (userActivities) => {
  const dateKeys = new Set(
    getEducationalActivities(userActivities)
      .map((act) => act.dateKey || toDateKey(act.date))
      .filter(Boolean)
  );
  if (dateKeys.size === 0) return 0;

  const cursor = parseActivityDate(todayKey());
  // Si hoy no hay actividades, la racha puede seguir viva desde ayer
  if (!dateKeys.has(dateToKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (dateKeys.has(dateToKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

/**
 * FUNCIÓN CORREGIDA: Prepara los datos para la exportación CSV según especificaciones.
 * @param {Array} activitiesToExport - Actividades filtradas (aprobadas/pendientes) para exportar.
 * @param {string} contractor - Contratista del usuario (para etiquetas).
 * @returns {Array} - Array de objetos listos para exportar a CSV.
 */
export const prepareDataForCSVExport = (activitiesToExport, contractor) => {
  if (!activitiesToExport || !Array.isArray(activitiesToExport)) {
    return [];
  }

  return activitiesToExport
    .filter(activity => activity && activity.status !== 'rejected') // Solo aprobadas y pendientes
    .map((activity) => {
      let tipo = 'N/A';
      let subtipo = 'N/A';
      let descripcion = '';

      // Si tiene actividad educativa
      if (activity.educationalActivity?.included && activity.educationalActivity.type) {
        tipo = getActivityTypeLabel(activity.educationalActivity.type, contractor);
        if (activity.educationalActivity.subtype) {
          subtipo = getActivitySubtypeLabel(
            activity.educationalActivity.type, 
            activity.educationalActivity.subtype, 
            contractor
          );
        }
        descripcion = activity.educationalActivity.description || '';
      }
      // Si solo tiene entrega de alimentos (sin actividad educativa)
      else if (activity.nutritionDelivery?.included) {
        const locationType = getLocationType(activity.location);
        if (locationType === 'center') {
          subtipo = 'Raciones alimenticias (Centro de Vida)';
        } else if (locationType === 'park') {
          subtipo = 'Meriendas (Parque/Espacio)';
        } else {
          subtipo = 'Entrega de alimentos';
        }
        descripcion = activity.nutritionDelivery.description || '';
      }

      // Formatear tipo de ubicación
      let tipoUbicacion = '';
      if (activity.location?.type) {
        const locType = getLocationType(activity.location);
        tipoUbicacion = locType === 'center' ? 'Centro de Vida' : 'Parque/Espacio';
      }

      // Formatear jornada
      let jornada = 'N/A';
      if (activity.schedule) {
        if (activity.schedule === 'J1') jornada = 'J1';
        else if (activity.schedule === 'J2') jornada = 'J2';
        else if (activity.schedule === 'NA') jornada = 'N/A';
        else jornada = activity.schedule;
      }

      return {
        Fecha: formatDate(activity.date),
        Estado: activity.status === 'approved' ? 'Aprobada' : 'Pendiente',
        Tipo: tipo,
        Subtipo: subtipo,
        Contratista: activity.contractor || '',
        Ubicacion: activity.location?.name || '',
        'Tipo Ubicacion': tipoUbicacion,
        Jornada: jornada,
        Beneficiarios: activity.totalBeneficiaries || 0,
        Descripcion: descripcion, // El escapado de comillas lo hace el generador de CSV
      };
    });
};

/**
 * Actividades cuya fecha (día local) cae entre startDate y endDate, ambos inclusive.
 */
export const filterByDateRange = (activities, startDate, endDate) =>
  (activities || []).filter((act) => {
    const actDate = parseActivityDate(act?.date);
    return !!actDate && actDate >= startDate && actDate <= endDate;
  });

/**
 * Compara al usuario actual con sus colegas del mismo contratista.
 */
export const getComparativeData = (
  currentUserActivities,
  allActivitiesCollection,
  currentUserContractor,
  currentUserId,
  periodStartDate,
  periodEndDate
) => {
  // 1. Filtrar actividades (aprobadas) de colegas del mismo contratista y del período actual
  const colleaguesActivitiesInPeriod = filterByDateRange(
    allActivitiesCollection.filter(act =>
      act.contractor === currentUserContractor &&
      act.status === 'approved' &&
      act.createdBy?.uid !== currentUserId &&
      act.createdBy?.role === 'field' &&
      act.educationalActivity?.included === true
    ),
    periodStartDate,
    periodEndDate
  );

  // 2. Agrupar actividades de colegas por UID
  const colleaguesData = {};
  colleaguesActivitiesInPeriod.forEach(act => {
    const colleagueId = act.createdBy.uid;
    if (!colleaguesData[colleagueId]) {
      colleaguesData[colleagueId] = {
        activities: [],
        name: act.createdBy.name,
      };
    }
    colleaguesData[colleagueId].activities.push(act);
  });

  // 3. Calcular métricas para cada colega
  const colleaguesMetrics = Object.values(colleaguesData).map(colleague => {
    const kpis = calculateFieldUserKPIs(colleague.activities);
    return {
      uid: colleague.activities[0].createdBy.uid,
      name: colleague.name,
      totalEducationalActivities: kpis.totalEducationalActivities,
      uniqueBeneficiaries: kpis.uniqueBeneficiaries,
      avgBeneficiariesPerActivity: kpis.avgBeneficiariesPerActivity,
      activitiesByType: getStatsByComponent(colleague.activities, currentUserContractor).reduce((acc, curr) => {
        let typeKey = '';
        if (curr.name === getActivityTypeLabel('nutrition', currentUserContractor)) typeKey = 'nutrition';
        else if (curr.name === getActivityTypeLabel('physical', currentUserContractor)) typeKey = 'physical';
        else if (curr.name === getActivityTypeLabel('psychosocial', currentUserContractor)) typeKey = 'psychosocial';
        if(typeKey) acc[typeKey] = curr.value;
        return acc;
      }, {}),
      activitiesBySubtype: (() => {
        const subtypeCounts = {};
        getEducationalActivities(colleague.activities).forEach(act => {
          const subtype = act.educationalActivity.subtype;
          subtypeCounts[subtype] = (subtypeCounts[subtype] || 0) + 1;
        });
        return subtypeCounts;
      })()
    };
  });

  // 4. Calcular métricas del usuario actual
  const currentUserMetrics = {
    ...calculateFieldUserKPIs(currentUserActivities),
    uid: currentUserId,
    activitiesByType: getStatsByComponent(currentUserActivities, currentUserContractor).reduce((acc, curr) => {
        let typeKey = '';
        if (curr.name === getActivityTypeLabel('nutrition', currentUserContractor)) typeKey = 'nutrition';
        else if (curr.name === getActivityTypeLabel('physical', currentUserContractor)) typeKey = 'physical';
        else if (curr.name === getActivityTypeLabel('psychosocial', currentUserContractor)) typeKey = 'psychosocial';
        if(typeKey) acc[typeKey] = curr.value;
        return acc;
    }, {}),
    activitiesBySubtype: (() => {
        const subtypeCounts = {};
        getEducationalActivities(currentUserActivities).forEach(act => {
          const subtype = act.educationalActivity.subtype;
          subtypeCounts[subtype] = (subtypeCounts[subtype] || 0) + 1;
        });
        return subtypeCounts;
    })()
  };
  
  const allUsersForComparison = [currentUserMetrics, ...colleaguesMetrics];

  return {
    currentUserMetrics,
    colleaguesMetrics,
    allUsersForComparison
  };
};

/**
 * Genera los logros (medallas) para el usuario.
 */
export const generateAchievements = (comparativeData, contractor) => {
  const { currentUserMetrics, allUsersForComparison } = comparativeData;
  const achievements = [];

  if (allUsersForComparison.length === 0 || !currentUserMetrics) return [];
  
  const sortBy = (key, order = 'desc') => {
    return [...allUsersForComparison].sort((a, b) => {
      return order === 'desc' ? (b[key] || 0) - (a[key] || 0) : (a[key] || 0) - (b[key] || 0);
    });
  };
  
  // "Más Productivo" (más actividades totales)
  const mostProductiveUser = sortBy('totalEducationalActivities')[0];
  if (mostProductiveUser && mostProductiveUser.uid === currentUserMetrics.uid && currentUserMetrics.totalEducationalActivities > 0) {
    achievements.push({
      title: '🏆 Más Productivo',
      description: `¡Lideras en actividades con ${currentUserMetrics.totalEducationalActivities} registradas!`,
      value: currentUserMetrics.totalEducationalActivities
    });
  }

  // "Mejor Promedio" (beneficiarios por actividad)
  const bestAverageUser = sortBy('avgBeneficiariesPerActivity')[0];
  if (bestAverageUser && bestAverageUser.uid === currentUserMetrics.uid && currentUserMetrics.avgBeneficiariesPerActivity > 0) {
    achievements.push({
      title: '🌟 Mejor Promedio',
      description: `¡Excelente promedio de ${currentUserMetrics.avgBeneficiariesPerActivity} beneficiarios por jornada!`,
      value: currentUserMetrics.avgBeneficiariesPerActivity
    });
  }

  // "Rey/Reina del Componente X"
  ['nutrition', 'physical', 'psychosocial'].forEach(componentType => {
    const topUserForComponent = allUsersForComparison
      .filter(u => u.activitiesByType && u.activitiesByType[componentType] > 0)
      .sort((a,b) => (b.activitiesByType[componentType] || 0) - (a.activitiesByType[componentType] || 0))[0];

    if (topUserForComponent && topUserForComponent.uid === currentUserMetrics.uid) {
      achievements.push({
        title: `👑 Rey/Reina de ${getActivityTypeLabel(componentType, contractor)}`,
        description: `Dominas en ${getActivityTypeLabel(componentType, contractor)} con ${currentUserMetrics.activitiesByType[componentType]} actividades.`,
        value: currentUserMetrics.activitiesByType[componentType]
      });
    }
  });

  // "Especialista en Y" (subtipo específico)
  const allSubtypes = new Set();
  allUsersForComparison.forEach(user => {
    if (user.activitiesBySubtype) {
      Object.keys(user.activitiesBySubtype).forEach(subtype => allSubtypes.add(subtype));
    }
  });

  let maxSubtypeCountForCurrentUser = 0;
  let topSubtypeForCurrentUser = null;

  allSubtypes.forEach(subtype => {
    const topUserForSubtype = allUsersForComparison
        .filter(u => u.activitiesBySubtype && u.activitiesBySubtype[subtype] > 0)
        .sort((a,b) => (b.activitiesBySubtype[subtype] || 0) - (a.activitiesBySubtype[subtype] || 0))[0];

    if (topUserForSubtype && topUserForSubtype.uid === currentUserMetrics.uid) {
        if (currentUserMetrics.activitiesBySubtype[subtype] > maxSubtypeCountForCurrentUser) {
            maxSubtypeCountForCurrentUser = currentUserMetrics.activitiesBySubtype[subtype];
            topSubtypeForCurrentUser = subtype;
        }
    }
  });
  
  if (topSubtypeForCurrentUser && maxSubtypeCountForCurrentUser > 0) {
      const exampleActivity = getEducationalActivities(comparativeData.currentUserMetrics.rawActivities || [])
          .find(act => act.educationalActivity.subtype === topSubtypeForCurrentUser);
      const mainType = exampleActivity ? exampleActivity.educationalActivity.type : '';

      achievements.push({
          title: `🎯 Especialista en ${getActivitySubtypeLabel(mainType, topSubtypeForCurrentUser, contractor)}`,
          description: `¡Eres el experto en ${getActivitySubtypeLabel(mainType, topSubtypeForCurrentUser, contractor)} con ${maxSubtypeCountForCurrentUser} actividades!`,
          value: maxSubtypeCountForCurrentUser
      });
  }

  return achievements;
};

/**
 * Genera insights personales.
 */
export const generateInsights = (
  userActivitiesFullHistory,
  userActivitiesCurrentPeriod,
  userActivitiesPreviousPeriod
) => {
  const insights = [];

  // 1. Tu ubicación más productiva
  if (userActivitiesFullHistory.length > 0) {
    const locationsProductivity = {};
    userActivitiesFullHistory.forEach(act => {
      if (act.location?.name) {
        if (!locationsProductivity[act.location.name]) {
          locationsProductivity[act.location.name] = { count: 0, totalBeneficiaries: 0, name: act.location.name };
        }
        locationsProductivity[act.location.name].count++;
        locationsProductivity[act.location.name].totalBeneficiaries += (act.totalBeneficiaries || 0);
      }
    });

    const productiveLocations = Object.values(locationsProductivity)
      .map(loc => ({ ...loc, avg: loc.count > 0 ? loc.totalBeneficiaries / loc.count : 0 }))
      .sort((a, b) => b.avg - a.avg);

    if (productiveLocations.length > 0 && productiveLocations[0].avg > 0) {
      insights.push({
        title: '💡 Tu Ubicación Estrella',
        description: `Generalmente, ${productiveLocations[0].name} es donde tienes el mejor promedio de beneficiarios (${Math.round(productiveLocations[0].avg)} por actividad).`,
      });
    }
  }

  // 2. Tu mejor día de la semana
  if (userActivitiesFullHistory.length > 0) {
    const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const activityCountByDay = Array(7).fill(0);
    userActivitiesFullHistory.forEach(act => {
      const actDate = parseActivityDate(act.date);
      if (actDate) activityCountByDay[actDate.getDay()]++; // ignora fechas inválidas
    });

    const maxActivities = Math.max(...activityCountByDay);
    if (maxActivities > 0) {
      const bestDayIndex = activityCountByDay.indexOf(maxActivities);
      insights.push({
        title: '📅 Tu Día Clave',
        description: `El ${daysOfWeek[bestDayIndex]} es tu día más frecuente para registrar actividades. ¡Aprovéchalo!`,
      });
    }
  }
  
  // 3. Actividad con mayor impacto
  if (userActivitiesCurrentPeriod.length > 0) {
    const sortedByBeneficiaries = [...userActivitiesCurrentPeriod].sort((a,b) => (b.totalBeneficiaries || 0) - (a.totalBeneficiaries || 0));
    const topImpactActivity = sortedByBeneficiaries[0];
    if (topImpactActivity && topImpactActivity.totalBeneficiaries > 0) {
       insights.push({
        title: '🚀 Actividad de Alto Impacto',
        description: `Tu actividad de "${getActivitySubtypeLabel(topImpactActivity.educationalActivity.type, topImpactActivity.educationalActivity.subtype, topImpactActivity.contractor)}" en ${topImpactActivity.location?.name} el ${formatDate(topImpactActivity.date)} tuvo ${topImpactActivity.totalBeneficiaries} beneficiarios. ¡Gran alcance!`,
      });
    }
  }

  // 4. Tendencia
  const currentPeriodCount = userActivitiesCurrentPeriod.length;
  const previousPeriodCount = userActivitiesPreviousPeriod.length;

  if (previousPeriodCount > 0) {
    const percentageChange = ((currentPeriodCount - previousPeriodCount) / previousPeriodCount) * 100;
    if (percentageChange > 5) {
      insights.push({
        title: '📈 Tendencia Positiva',
        description: `¡Vas muy bien! Has aumentado tu número de actividades en un ${Math.round(percentageChange)}% comparado con el período anterior.`,
      });
    } else if (percentageChange < -5) {
      insights.push({
        title: '📉 Área de Mejora',
        description: `Tu número de actividades disminuyó un ${Math.abs(Math.round(percentageChange))}% comparado con el período anterior. ¡Ánimo para el próximo!`,
      });
    } else {
      insights.push({
        title: '📊 Tendencia Estable',
        description: 'Mantienes un ritmo constante en tus actividades comparado con el período anterior.',
      });
    }
  } else if (currentPeriodCount > 0) {
     insights.push({
        title: '✨ ¡Buen Comienzo!',
        description: 'Estás registrando actividades este período. ¡Sigue así!',
      });
  }

  return insights;
};

const PERIOD_DAYS = { '7days': 7, '30days': 30, '90days': 90 };

/**
 * Obtiene las fechas de inicio y fin para un período dado, con límites de día local:
 * el inicio es las 00:00 del primer día y el fin las 23:59:59.999 del día de referencia.
 */
export const getDateRangeForPeriod = (period, referenceDate = new Date()) => {
  const days = PERIOD_DAYS[period] || 1;
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const day = referenceDate.getDate();

  return {
    startDate: new Date(year, month, day - (days - 1)),
    endDate: new Date(year, month, day, 23, 59, 59, 999)
  };
};

/**
 * Obtiene las actividades del usuario para un período específico y el período anterior.
 * Solo se consideran actividades APROBADAS: las pendientes y rechazadas no cuentan en los KPIs.
 */
export const fetchUserActivitiesForPeriodAndComparison = async (
  userId,
  period,
  allUserActivitiesFromDB
) => {
  // Período actual
  const { startDate: currentStartDate, endDate: currentEndDate } = getDateRangeForPeriod(period);

  // Período anterior: termina el día anterior al inicio del período actual
  const dayBeforeCurrentStart = new Date(
    currentStartDate.getFullYear(), currentStartDate.getMonth(), currentStartDate.getDate() - 1
  );
  const { startDate: previousStartDate, endDate: previousEndDate } = getDateRangeForPeriod(period, dayBeforeCurrentStart);

  const approvedActivities = (allUserActivitiesFromDB || []).filter(act => act?.status === 'approved');

  const educationalActivitiesFullHistory = getEducationalActivities(approvedActivities);

  const currentPeriodActivities = getEducationalActivities(
    filterByDateRange(approvedActivities, currentStartDate, currentEndDate)
  );

  const previousPeriodActivities = getEducationalActivities(
    filterByDateRange(approvedActivities, previousStartDate, previousEndDate)
  );
  
  return {
    currentPeriodActivities,
    previousPeriodActivities,
    educationalActivitiesFullHistory,
    dateRange: { currentStartDate, currentEndDate }
  };
};
