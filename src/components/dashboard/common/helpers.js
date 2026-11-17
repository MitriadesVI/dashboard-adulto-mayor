// src/components/dashboard/common/helpers.js

import { getContractor, getContractorName } from '../../../config/contractors';
import { parseActivityDate, toDateKey, todayKey } from '../../../utils/dates';
import {
  getActivityPeople,
  getActivityRations,
  getActivityAttendees,
  getPerformer,
  groupAttendance,
  summarizeAttendance,
  summarizeRations
} from '../../../utils/attendance';

const TYPE_LABELS = {
  nutrition: { education: 'Educación Nutricional', health: 'Salud Nutricional', generic: 'Nutrición' },
  physical: { education: 'Educación en Salud Física', health: 'Salud Física', generic: 'Actividad Física' },
  psychosocial: { education: 'Educación Psicosocial', health: 'Salud Psicosocial', generic: 'Actividad Psicosocial' }
};

// Función para obtener etiqueta del tipo de actividad
export const getActivityTypeLabel = (type, contractor) => {
  if (!type) return 'Desconocido';

  const labels = TYPE_LABELS[type];
  if (labels) {
    const style = getContractor(contractor)?.labelStyle;
    return labels[style] || labels.generic;
  }
  return type.charAt(0).toUpperCase() + type.slice(1);
};

// Función para obtener etiqueta del subtipo de actividad
export const getActivitySubtypeLabel = (type, subtype, contractor) => {
  if (!type || !subtype) return 'Subtipo Desconocido';
  
  const subtypeMap = {
    nutrition: {
      workshop: getContractor(contractor)?.labelStyle === 'education' ? 'Taller educativo del cuidado nutricional' : 'Jornada de promoción de la salud nutricional',
      ration: 'Raciones alimenticias/meriendas', // Para compatibilidad con actividades antiguas
      centerRation: 'Raciones alimenticias (Centros)',
      parkSnack: 'Meriendas (Parques/Espacios)'
    },
    physical: {
      prevention: 'Charlas de prevención de enfermedad',
      therapeutic: 'Actividad física terapéutica',
      rumba: 'Rumbaterapia y ejercicios dirigidos',
      walking: 'Club de caminantes'
    },
    psychosocial: {
      mental: 'Jornadas/talleres en salud mental',
      cognitive: 'Jornadas/talleres cognitivos',
      abuse: 'Talleres en prevención al maltrato',
      arts: 'Talleres en artes y oficios',
      intergenerational: 'Encuentros intergeneracionales'
    }
  };

  // Verificar si existe el tipo y subtipo en el mapa
  if (subtypeMap[type] && subtypeMap[type][subtype]) {
    return subtypeMap[type][subtype];
  }

  // Si no se encuentra, devolver el subtipo con primera letra en mayúscula
  return subtype.charAt(0).toUpperCase() + subtype.slice(1);
};

// Función mejorada para verificar el tipo de ubicación ('center' | 'park' | 'unknown')
export const getLocationType = (location) => {
  if (!location || !location.type) return 'unknown';
  
  // Normalizar el tipo de ubicación
  const type = String(location.type).toLowerCase().trim();
  
  // Verificar diferentes variantes de nombres de ubicación
  if (type === 'center' || type === 'cdv' || type.includes('centro') || type.includes('fijo')) {
    return 'center';
  } else if (type === 'park' || type.includes('parque') || type.includes('espacio')) {
    return 'park';
  }
  
  return 'unknown';
};

// Coincide con el filtro de tipo de actividad del Dashboard ('nutrition' | 'physical' | 'psychosocial').
// Las entregas de alimentos (sin actividad educativa) cuentan como 'nutrition'.
export const matchesActivityType = (activity, type) => {
  if (!type || type === 'all') return true;
  if (!activity) return false;
  if (activity.educationalActivity?.included && activity.educationalActivity.type === type) return true;
  return type === 'nutrition' && !!activity.nutritionDelivery?.included;
};

// Contratista común a todas las actividades (o undefined si hay varios), para elegir etiquetas
export const getCommonContractor = (activities) => {
  const contractors = new Set((activities || []).map(a => a?.contractor).filter(Boolean));
  return contractors.size === 1 ? [...contractors][0] : undefined;
};

// Semana ISO 8601 (lunes a domingo). El año ISO puede diferir del año calendario a fin/inicio de año.
export const getIsoWeek = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return { year: d.getUTCFullYear(), week: Math.ceil((((d - yearStart) / 86400000) + 1) / 7) };
};

// Clave ordenable de semana ISO, ej. '2026-W05'
export const getIsoWeekKey = (date) => {
  const { year, week } = getIsoWeek(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
};

// 'YYYY-MM' -> 'octubre de 2026' (en hora local; new Date('YYYY-MM-01') sería UTC)
export const formatMonthLabel = (monthKey) => {
  const date = parseActivityDate(`${monthKey}-01`);
  return date ? date.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }) : String(monthKey || '');
};

// Función para contar raciones y meriendas por tipo de ubicación (raciones entregadas, ver utils/attendance)
export const getNutritionCountByLocationType = (activities) => {
  if (!activities || !Array.isArray(activities) || activities.length === 0) {
    return { centers: 0, parks: 0, total: 0 };
  }

  // Máximo por sede + fecha + jornada (ver src/utils/attendance.js)
  const rations = summarizeRations(activities);
  return {
    centers: rations.center,
    parks: rations.park,
    total: rations.center + rations.park
  };
};

// Obtener promedio de raciones por ubicación
export const getAverageRationsByLocationType = (activities) => {
  if (!activities || !Array.isArray(activities) || activities.length === 0) {
    return { centers: 0, parks: 0, total: 0 };
  }
  
  // Contar actividades de alimentación por tipo de ubicación
  const centerActivities = activities.filter(a => {
    if (!a || !a.nutritionDelivery || !a.nutritionDelivery.included) return false;
    const locationType = getLocationType(a.location);
    return locationType === 'center';
  }).length;
  
  const parkActivities = activities.filter(a => {
    if (!a || !a.nutritionDelivery || !a.nutritionDelivery.included) return false;
    const locationType = getLocationType(a.location);
    return locationType === 'park';
  }).length;
  
  // Obtener total de raciones
  const counts = getNutritionCountByLocationType(activities);
  
  return {
    centers: centerActivities > 0 ? Math.round(counts.centers / centerActivities) : 0,
    parks: parkActivities > 0 ? Math.round(counts.parks / parkActivities) : 0,
    total: (centerActivities + parkActivities) > 0 ? 
      Math.round(counts.total / (centerActivities + parkActivities)) : 0
  };
};

// Contar actividades educativas
export const getEducationalActivityCount = (activities) => {
  if (!activities || !Array.isArray(activities) || activities.length === 0) {
    return 0;
  }
  
  return activities.filter(a => 
    a && a.educationalActivity && a.educationalActivity.included === true
  ).length;
};

// Función para obtener estadísticas de nutrición
export const getNutritionStats = (activities) => {
  if (!activities || !Array.isArray(activities) || activities.length === 0) {
    return { centerRations: 0, parkSnacks: 0, totalNutrition: 0, workshops: 0, rationCount: 0 };
  }
  
  // Filtrar actividades nutricionales educativas
  const educationalNutrition = activities.filter(a => 
    a && a.educationalActivity && a.educationalActivity.included === true &&
    a.educationalActivity.type === 'nutrition'
  );
  
  // Contar talleres (SOLO estos son actividades reales)
  const workshops = educationalNutrition.filter(a => 
    a.educationalActivity.subtype === 'workshop'
  ).length;
  
  // Contar actividades con entregas de alimentos
  const nutritionActivities = activities.filter(a => 
    a && a.nutritionDelivery && a.nutritionDelivery.included === true
  );
  
  // Raciones (centros) y meriendas (parques): beneficios, no actividades.
  // Máximo por sede + fecha + jornada para no contar dos veces la misma entrega.
  const rationTotals = summarizeRations(nutritionActivities);
  const centerRations = rationTotals.center;
  const parkSnacks = rationTotals.park;
    
  // Total combinado de beneficiarios
  const totalNutrition = centerRations + parkSnacks;
  
  // Número de entregas de alimentos realizadas
  const rationCount = nutritionActivities.length;
  
  return {
    workshops,           // Número de ACTIVIDADES de talleres
    centerRations,       // Número de BENEFICIOS (raciones)
    parkSnacks,          // Número de BENEFICIOS (meriendas)
    totalNutrition,      // Total de BENEFICIOS alimentarios
    rationCount          // Número de entregas (no actividades)
  };
};

// Obtener estadísticas detalladas por ubicación
export const getNutritionStatsByLocation = (activities) => {
  if (!activities || !Array.isArray(activities) || activities.length === 0) {
    return [];
  }
  
  const locationStats = {};
  
  // Agrupar por ubicación
  activities.forEach(activity => {
    if (!activity || !activity.nutritionDelivery || !activity.nutritionDelivery.included || 
        !activity.location || !activity.location.name) return;
    
    const locationName = activity.location.name;
    const locationType = getLocationType(activity.location);
    
    if (!locationStats[locationName]) {
      locationStats[locationName] = {
        name: locationName,
        type: locationType,
        centerRations: 0,
        parkSnacks: 0,
        total: 0
      };
    }
    
    // Incrementar contadores según tipo de ubicación
    const beneficiaries = getActivityRations(activity);
    
    if (locationType === 'center') {
      locationStats[locationName].centerRations += beneficiaries;
      locationStats[locationName].total += beneficiaries;
    } else if (locationType === 'park') {
      locationStats[locationName].parkSnacks += beneficiaries;
      locationStats[locationName].total += beneficiaries;
    }
  });
  
  // Corregir con la regla sin doble conteo (máximo por sede + fecha + jornada)
  Object.values(locationStats).forEach(stat => {
    const totals = summarizeRations(activities.filter(a =>
      a?.location?.name === stat.name && a.nutritionDelivery?.included));
    stat.centerRations = stat.type === 'center' ? totals.total : 0;
    stat.parkSnacks = stat.type === 'park' ? totals.total : 0;
    stat.total = stat.centerRations + stat.parkSnacks;
  });

  // Convertir a array y ordenar por total
  return Object.values(locationStats).sort((a, b) => b.total - a.total);
};

// Formatear fechas (acepta 'YYYY-MM-DD', ISO legado, Date o Timestamp; siempre en hora local)
export const formatDate = (dateValue) => {
  if (!dateValue) return 'Fecha desconocida';
  const date = parseActivityDate(dateValue);
  if (!date) return 'Fecha inválida';
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Formatear jornada
export const formatSchedule = (schedule) => {
  if (!schedule) return 'No especificada';
  
  const scheduleMap = {
    'morning': 'J1',
    'afternoon': 'J2',
    'J1': 'J1',
    'J2': 'J2',
    'NA': 'N/A'
  };
  
  return scheduleMap[schedule] || schedule;
};

// Función para formatear tipo de ubicación a texto legible
export const formatLocationType = (type) => {
  if (!type) return 'Desconocida';
  
  const normalizedType = type.toLowerCase();
  
  if (normalizedType === 'center' || normalizedType === 'cdv' || normalizedType.includes('centro')) {
    return 'Centro de Vida Fijo';
  } else if (normalizedType === 'park' || normalizedType.includes('parque') || normalizedType.includes('espacio')) {
    return 'Parque/Espacio Comunitario';
  }
  
  return type.charAt(0).toUpperCase() + type.slice(1);
};

// Colores para gráficos
export const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', 
  '#E53935', '#1976D2', '#8E24AA', '#FF5722',
  '#4CAF50', '#FFC107', '#9C27B0', '#607D8B'
];

export const PIE_COLORS = { 
  nutrition: '#4CAF50', 
  physical: '#2196F3', 
  psychosocial: '#9C27B0',
  unknown: '#757575'
};

// Colores específicos para subtipos nutricionales
export const NUTRITION_COLORS = {
  workshop: '#81C784',
  ration: '#FFB74D',
  centerRation: '#FF8A65',
  parkSnack: '#FFD54F'
};

// Escapa un valor para CSV (comillas si contiene coma, comillas o saltos de línea)
const csvCell = (value) => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// Función para exportar datos a CSV
export const exportToCSV = (activities) => {
  if (!activities || !activities.length) return;
  
  // Crear encabezado CSV
  let csv = 'Fecha,Tipo,Subtipo,Contratista,Ubicación,Tipo Ubicación,Jornada,Beneficiarios,Raciones,Realizada por,Registrada por,Descripción\n';
  
  // Agregar cada actividad
  activities.forEach(activity => {
    if (!activity) return;
    
    try {
      // Determinar tipo y subtipo
      let type = '';
      let subtype = '';
      
      if (activity.educationalActivity && activity.educationalActivity.included) {
        type = activity.educationalActivity.type;
        subtype = activity.educationalActivity.subtype;
      } else if (activity.nutritionDelivery && activity.nutritionDelivery.included) {
        type = 'nutrition';
        subtype = getLocationType(activity.location) === 'center' ? 'centerRation' : 'parkSnack';
      }
      
      const row = [
        activity.date ? formatDate(activity.date) : '',
        type ? getActivityTypeLabel(type, activity.contractor) : '',
        subtype ? getActivitySubtypeLabel(type, subtype, activity.contractor) : '',
        getContractorName(activity.contractor),
        activity.location?.name || '',
        activity.location?.type ? formatLocationType(activity.location.type) : '',
        formatSchedule(activity.schedule),
        activity.totalBeneficiaries || 0,
        getActivityRations(activity),
        getPerformer(activity).name,
        activity.createdBy?.name || getPerformer(activity).name,
        activity.educationalActivity?.description || ''
      ];
      
      csv += row.map(csvCell).join(',') + '\n';
    } catch (e) {
      console.warn("Error exportando actividad:", e);
    }
  });
  
  // Crear y descargar el archivo (BOM para que Excel lea bien las tildes)
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `actividades_${todayKey()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Funciones para Dashboard

// Contar actividades educativas por subtipo
export const countActivitiesBySubtype = (activities) => {
  if (!activities || !Array.isArray(activities) || activities.length === 0) {
    return [];
  }
  
  const counts = {};
  
  activities.forEach(activity => {
    if (!activity || !activity.educationalActivity || !activity.educationalActivity.included ||
        !activity.educationalActivity.type || !activity.educationalActivity.subtype) return;
    
    try {
      const type = activity.educationalActivity.type;
      const subtype = activity.educationalActivity.subtype;
      const label = getActivitySubtypeLabel(type, subtype, activity.contractor);
      counts[label] = (counts[label] || 0) + 1;
    } catch (e) {
      console.warn("Error contando actividad por subtipo:", e);
    }
  });
  
  return Object.entries(counts).map(([name, value]) => ({ 
    name, 
    value,
    fill: COLORS[Object.keys(counts).indexOf(name) % COLORS.length]
  }));
};

// Obtener ubicaciones con más actividades educativas
export const getTopLocations = (activities, limit = 5) => {
  if (!activities || !Array.isArray(activities) || activities.length === 0) {
    return [];
  }
  
  const counts = {};
  
  activities.forEach(activity => {
    if (!activity || !activity.location || !activity.location.name ||
        !activity.educationalActivity || !activity.educationalActivity.included) return;
    
    const locationName = activity.location.name;
    counts[locationName] = (counts[locationName] || 0) + 1;
  });
  
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
};

// Calcular promedios de beneficiarios por ubicación (asistencia por jornada de servicio, sin doble conteo)
export const getAverageBeneficiariesByLocation = (activities, topCount = 3) => {
  if (!activities || !Array.isArray(activities) || activities.length === 0) {
    return [];
  }
  
  // Objeto para almacenar las actividades (con asistentes) de cada ubicación
  const locationData = {};
  
  activities.forEach(activity => {
    if (!activity || !activity.location || !activity.location.name || !getActivityPeople(activity)) {
      return;
    }
    
    const locationName = activity.location.name;
    
    if (!locationData[locationName]) {
      locationData[locationName] = {
        name: locationName,
        type: getLocationType(activity.location),
        activities: []
      };
    }
    
    locationData[locationName].activities.push(activity);
  });
  
  // Calcular promedio y separar por tipo (las ubicaciones de tipo desconocido no se asignan a ninguna modalidad)
  const centerLocations = [];
  const parkLocations = [];
  
  Object.values(locationData).forEach(location => {
    location.average = calculateAverageAttendance(location.activities);
    
    if (location.type === 'center') {
      centerLocations.push(location);
    } else if (location.type === 'park') {
      parkLocations.push(location);
    }
  });
  
  // Ordenar por promedio (de mayor a menor)
  centerLocations.sort((a, b) => b.average - a.average);
  parkLocations.sort((a, b) => b.average - a.average);
  
  // Tomar el top N de cada tipo
  const topCenters = centerLocations.slice(0, topCount);
  const topParks = parkLocations.slice(0, topCount);
  
  // Preparar datos para el gráfico
  return [...topCenters, ...topParks].map(location => ({
    name: location.name,
    value: location.average,
    type: location.type === 'center' ? 'Centro de Vida' : 'Parque/Espacio'
  }));
};

// Calcular promedio de beneficiarios por tipo de actividad (educativa)
export const getAverageBeneficiariesByActivityType = (activities) => {
  if (!activities || !Array.isArray(activities) || activities.length === 0) {
    return [];
  }
  
  // Solo considerar actividades educativas reales
  const educationalActivities = activities.filter(a => 
    a && a.educationalActivity && a.educationalActivity.included === true
  );
  
  const typeCounts = {
    nutrition: 0,
    physical: 0,
    psychosocial: 0
  };
  
  const typeBeneficiaries = {
    nutrition: 0,
    physical: 0,
    psychosocial: 0
  };
  
  educationalActivities.forEach(activity => {
    if (!activity.educationalActivity.type) return;
    
    const type = activity.educationalActivity.type;
    
    if (typeCounts[type] !== undefined) {
      typeCounts[type] += 1;
      typeBeneficiaries[type] += getActivityAttendees(activity);
    }
  });
  
  return Object.keys(typeCounts).map(type => ({
    type: getActivityTypeLabel(type, getCommonContractor(educationalActivities)),
    average: typeCounts[type] > 0 ? Math.round(typeBeneficiaries[type] / typeCounts[type]) : 0,
    total: typeBeneficiaries[type],
    count: typeCounts[type]
  }));
};

// NUEVAS FUNCIONES PARA ANÁLISIS DE MODALIDAD

// Función para obtener métricas de eficiencia por modalidad
export const getModalityEfficiencyMetrics = (activities) => {
  if (!activities || !Array.isArray(activities) || activities.length === 0) {
    return {
      centers: calculateModalityMetrics([], 'center'),
      parks: calculateModalityMetrics([], 'park'),
      summary: { totalEducational: 0, centerShare: 0, parkShare: 0 }
    };
  }

  // Filtrar solo actividades educativas reales
  const educationalActivities = activities.filter(a => 
    a && a.educationalActivity && a.educationalActivity.included === true
  );

  // Separar por modalidad
  const centerActivities = educationalActivities.filter(a => {
    const locationType = getLocationType(a.location);
    return locationType === 'center';
  });

  const parkActivities = educationalActivities.filter(a => {
    const locationType = getLocationType(a.location);
    return locationType === 'park';
  });

  // Calcular métricas para centros
  const centerMetrics = calculateModalityMetrics(centerActivities, 'center');
  const parkMetrics = calculateModalityMetrics(parkActivities, 'park');

  return {
    centers: centerMetrics,
    parks: parkMetrics,
    summary: {
      totalEducational: educationalActivities.length,
      centerShare: educationalActivities.length > 0 ? centerActivities.length / educationalActivities.length * 100 : 0,
      parkShare: educationalActivities.length > 0 ? parkActivities.length / educationalActivities.length * 100 : 0
    }
  };
};

const calculateModalityMetrics = (activities, modalityType) => {
  if (!activities.length) {
    return {
      totalActivities: 0,
      totalBeneficiaries: 0,
      averageBeneficiaries: 0,
      uniqueLocations: 0,
      activitiesPerLocation: 0,
      operatingDays: 0,
      activitiesPerDay: 0,
      scheduleDistribution: {},
      efficiency: 0
    };
  }

  // Asistencia sin doble conteo (máximo por ubicación + fecha + jornada)
  const totalBeneficiaries = calculateUniqueAttendance(activities);
  
  const uniqueLocations = [...new Set(activities.map(a => a.location?.name).filter(Boolean))];
  
  // Calcular días únicos de operación
  const uniqueDates = [...new Set(activities.map(a => toDateKey(a.date)).filter(Boolean))];

  // Distribución de jornadas (importante para centros)
  const scheduleDistribution = {};
  activities.forEach(a => {
    const schedule = a.schedule || 'No especificado';
    scheduleDistribution[schedule] = (scheduleDistribution[schedule] || 0) + 1;
  });

  // Calcular eficiencia basada en modalidad
  let expectedDaysPerWeek, efficiency;
  if (modalityType === 'center') {
    expectedDaysPerWeek = 5; // Centros trabajan 5 días
    efficiency = uniqueDates.length > 0 ? (activities.length / uniqueDates.length) : 0;
  } else {
    expectedDaysPerWeek = 2; // Parques trabajan 1-2 días
    efficiency = uniqueLocations.length > 0 ? (activities.length / uniqueLocations.length) : 0;
  }

  return {
    totalActivities: activities.length,
    totalBeneficiaries,
    averageBeneficiaries: calculateAverageAttendance(activities),
    uniqueLocations: uniqueLocations.length,
    activitiesPerLocation: uniqueLocations.length > 0 ? Math.round(activities.length / uniqueLocations.length * 100) / 100 : 0,
    operatingDays: uniqueDates.length,
    activitiesPerDay: uniqueDates.length > 0 ? Math.round(activities.length / uniqueDates.length * 100) / 100 : 0,
    scheduleDistribution,
    efficiency: Math.round(efficiency * 100) / 100,
    expectedDaysPerWeek
  };
};

// Función para análisis temporal por modalidad
export const getTemporalAnalysisByModality = (activities) => {
  if (!activities || !Array.isArray(activities) || activities.length === 0) {
    return { byDay: { center: {}, park: {} }, byWeek: {} };
  }

  const educationalActivities = activities.filter(a => 
    a && a.educationalActivity && a.educationalActivity.included === true && a.date
  );

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const byDay = { center: {}, park: {} };
  const byWeek = {};

  educationalActivities.forEach(activity => {
    const date = parseActivityDate(activity.date);
    if (!date) return; // Ignorar fechas inválidas

    // Solo centros y parques/espacios; las ubicaciones de tipo desconocido no se asignan a ninguna modalidad
    const modalityType = getLocationType(activity.location);
    if (modalityType !== 'center' && modalityType !== 'park') return;

    const dayOfWeek = dayNames[date.getDay()];
    const weekKey = getIsoWeekKey(date);

    // Por día de la semana
    if (!byDay[modalityType][dayOfWeek]) {
      byDay[modalityType][dayOfWeek] = { count: 0, beneficiaries: 0 };
    }
    byDay[modalityType][dayOfWeek].count++;
    byDay[modalityType][dayOfWeek].beneficiaries += getActivityAttendees(activity);

    // Por semana (ISO)
    if (!byWeek[weekKey]) {
      byWeek[weekKey] = { center: 0, park: 0, total: 0 };
    }
    byWeek[weekKey][modalityType]++;
    byWeek[weekKey].total++;
  });

  return { byDay, byWeek };
};

// Función para comparativas de rendimiento
export const getPerformanceComparisons = (activities) => {
  if (!activities || !Array.isArray(activities) || activities.length === 0) {
    return { byContractor: {}, byModality: {}, combined: {} };
  }

  const educationalActivities = activities.filter(a => 
    a && a.educationalActivity && a.educationalActivity.included === true
  );

  const comparisons = { byContractor: {}, byModality: {}, combined: {} };
  const MODALITY_LABELS = { center: 'Centros Fijos', park: 'Parques/Espacios', unknown: 'Sin clasificar' };

  const addToGroup = (group, key, activity, extra = {}) => {
    if (!group[key]) {
      group[key] = { ...extra, activityList: [], locations: new Set() };
    }
    group[key].activityList.push(activity);
    if (activity.location?.name) group[key].locations.add(activity.location.name);
  };

  // Agrupar por contratista y modalidad
  educationalActivities.forEach(activity => {
    const contractor = activity.contractor || 'Desconocido';
    const modalityType = MODALITY_LABELS[getLocationType(activity.location)];
    const key = `${contractor}-${modalityType}`;

    addToGroup(comparisons.byContractor, contractor, activity);
    addToGroup(comparisons.byModality, modalityType, activity);
    addToGroup(comparisons.combined, key, activity, { contractor, modalityType });
  });

  // Calcular totales (asistencia sin doble conteo) y promedios por jornada de servicio
  [comparisons.byContractor, comparisons.byModality, comparisons.combined].forEach(group => {
    Object.values(group).forEach(data => {
      data.activities = data.activityList.length;
      data.beneficiaries = calculateUniqueAttendance(data.activityList);
      data.avgBeneficiaries = calculateAverageAttendance(data.activityList);
      data.uniqueLocations = data.locations.size;
      delete data.activityList;
      delete data.locations;
    });
  });

  return comparisons;
};

// Generar datos para gráficos comparativos
export const generateComparisonData = (activities, field = 'beneficiaries') => {
  if (!activities || !Array.isArray(activities) || activities.length === 0) {
    return { centerData: [], parkData: [] };
  }
  
  // Agrupar por tipo de ubicación
  const centerActivities = activities.filter(a => {
    if (!a || !a.location) return false;
    return getLocationType(a.location) === 'center';
  });
  
  const parkActivities = activities.filter(a => {
    if (!a || !a.location) return false;
    return getLocationType(a.location) === 'park';
  });
  
  // Agrupar por fecha; las personas atendidas por día se calculan sin doble conteo por jornada
  const byDate = (list) => {
    const grouped = {};
    list.forEach(activity => {
      if (!activity || !activity.date) return;
      const dateKey = toDateKey(activity.date);
      if (!dateKey) return;
      (grouped[dateKey] = grouped[dateKey] || []).push(activity);
    });
    return Object.entries(grouped)
      .map(([date, list]) => ({
        date,
        value: field === 'count' ? list.length : summarizeAttendance(list).people
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  return { centerData: byDate(centerActivities), parkData: byDate(parkActivities) };
};

// ========== FUNCIONES NUEVAS PARA CORREGIR DOBLE CONTEO ==========

/**
 * Agrupa las actividades por ubicación + fecha + jornada (SIN usuario) y toma el MÁXIMO de
 * beneficiarios de cada grupo. Devuelve Map(clave de grupo -> máximo de beneficiarios).
 * Ejemplo: CDV La Paz, 26/mayo, J1 con 45 educativo + 45 ración = Math.max(45,45) = 45
 */
export const getAttendanceGroups = (activities) => {
  const groups = new Map();
  if (!activities || !Array.isArray(activities)) return groups;
  groupAttendance(activities).forEach(group => groups.set(group.key, group.people));
  return groups;
};

/**
 * Personas atendidas sin doble conteo: máximo (asistentes, raciones) por sede + fecha + jornada;
 * J1 y J2 se suman. Delega en utils/attendance.
 */
export const calculateUniqueAttendance = (activities) =>
  summarizeAttendance(Array.isArray(activities) ? activities : []).people;

/**
 * Promedio de personas atendidas por jornada de servicio (sede + fecha + jornada).
 */
export const calculateAverageAttendance = (activities) =>
  summarizeAttendance(Array.isArray(activities) ? activities : []).averagePerJornada;

/**
 * Personas atendidas en las actividades REALIZADAS por un profesional (performedBy, o createdBy en
 * actividades antiguas), con la misma regla de agrupación.
 */
export const calculateUniqueAttendanceByUser = (activities, userUid) => {
  if (!activities || !Array.isArray(activities) || activities.length === 0) {
    return 0;
  }
  return calculateUniqueAttendance(activities.filter(a => a && getPerformer(a).uid === userUid));
};
