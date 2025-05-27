// src/components/dashboard/common/helpers.js

import { LinearProgress } from '@mui/material';

// Función para obtener etiqueta del tipo de actividad
export const getActivityTypeLabel = (type, contractor) => {
  if (!type) return 'Desconocido';
  
  if (type === 'nutrition') {
    if (contractor === 'CUC') return 'Educación Nutricional';
    if (contractor === 'FUNDACARIBE') return 'Salud Nutricional';
    return 'Nutrición'; // Default para otros contratistas
  } else if (type === 'physical') {
    if (contractor === 'CUC') return 'Educación en Salud Física';
    if (contractor === 'FUNDACARIBE') return 'Salud Física';
    return 'Actividad Física'; // Default
  } else if (type === 'psychosocial') {
    if (contractor === 'CUC') return 'Educación Psicosocial';
    if (contractor === 'FUNDACARIBE') return 'Salud Psicosocial';
    return 'Actividad Psicosocial'; // Default
  }
  return type.charAt(0).toUpperCase() + type.slice(1);
};

// Función para obtener etiqueta del subtipo de actividad
export const getActivitySubtypeLabel = (type, subtype, contractor) => {
  if (!type || !subtype) return 'Subtipo Desconocido';
  
  const subtypeMap = {
    nutrition: {
      workshop: contractor === 'CUC' ? 'Taller educativo del cuidado nutricional' : 'Jornada de promoción de la salud nutricional',
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

// Función mejorada para verificar el tipo de ubicación
export const getLocationType = (location) => {
  if (!location || !location.type) return 'unknown';
  
  // Normalizar el tipo de ubicación
  const type = location.type.toLowerCase();
  
  // Verificar diferentes variantes de nombres de ubicación
  if (type === 'center' || type.includes('centro') || type.includes('fijo')) {
    return 'center';
  } else if (type === 'park' || type.includes('parque') || type.includes('espacio')) {
    return 'park';
  }
  
  return 'unknown';
};

// Función para contar raciones y meriendas por tipo de ubicación
export const getNutritionCountByLocationType = (activities) => {
  if (!activities || !Array.isArray(activities) || activities.length === 0) {
    return { centers: 0, parks: 0, total: 0 };
  }
  
  // Filtrar solo actividades con entrega de alimentos
  const nutritionActivities = activities.filter(a => 
    a && a.nutritionDelivery && a.nutritionDelivery.included === true
  );
  
  // Calcular raciones por tipo de ubicación
  const centerRations = nutritionActivities
    .filter(a => {
      const locationType = getLocationType(a.location);
      return locationType === 'center' && a.nutritionDelivery.included;
    })
    .reduce((sum, a) => sum + (Number(a.totalBeneficiaries) || 0), 0);
  
  // Calcular meriendas por tipo de ubicación
  const parkSnacks = nutritionActivities
    .filter(a => {
      const locationType = getLocationType(a.location);
      return locationType === 'park' && a.nutritionDelivery.included;
    })
    .reduce((sum, a) => sum + (Number(a.totalBeneficiaries) || 0), 0);
    
  return {
    centers: centerRations,
    parks: parkSnacks,
    total: centerRations + parkSnacks
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
  
  // Contar raciones (centros) - estas son beneficios, no actividades
  const centerRations = nutritionActivities
    .filter(a => getLocationType(a.location) === 'center')
    .reduce((sum, a) => sum + (Number(a.totalBeneficiaries) || 0), 0);
    
  // Contar meriendas (parques) - estas son beneficios, no actividades
  const parkSnacks = nutritionActivities
    .filter(a => getLocationType(a.location) === 'park')
    .reduce((sum, a) => sum + (Number(a.totalBeneficiaries) || 0), 0);
    
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
    const beneficiaries = Number(activity.totalBeneficiaries) || 0;
    
    if (locationType === 'center') {
      locationStats[locationName].centerRations += beneficiaries;
      locationStats[locationName].total += beneficiaries;
    } else if (locationType === 'park') {
      locationStats[locationName].parkSnacks += beneficiaries;
      locationStats[locationName].total += beneficiaries;
    }
  });
  
  // Convertir a array y ordenar por total
  return Object.values(locationStats).sort((a, b) => b.total - a.total);
};

// Formatear fechas
export const formatDate = (dateString) => {
  if (!dateString) return 'Fecha desconocida';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) { // Validar si es una fecha válida
      return 'Fecha inválida';
    }
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (e) {
    console.warn("Error al formatear fecha:", dateString, e);
    return 'Fecha inválida';
  }
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
  
  if (normalizedType === 'center' || normalizedType.includes('centro')) {
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

// Función para exportar datos a CSV
export const exportToCSV = (activities) => {
  if (!activities || !activities.length) return;
  
  // Crear encabezado CSV
  let csv = 'Fecha,Tipo,Subtipo,Contratista,Ubicación,Tipo Ubicación,Jornada,Beneficiarios,Descripción\n';
  
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
        activity.contractor || '',
        activity.location?.name || '',
        activity.location?.type ? formatLocationType(activity.location.type) : '',
        formatSchedule(activity.schedule),
        activity.totalBeneficiaries || 0,
        activity.educationalActivity?.description ? `"${activity.educationalActivity.description.replace(/"/g, '""')}"` : ''
      ];
      
      csv += row.join(',') + '\n';
    } catch (e) {
      console.warn("Error exportando actividad:", e);
    }
  });
  
  // Crear y descargar el archivo
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `actividades_${new Date().toISOString().slice(0,10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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

// Calcular promedios de beneficiarios por ubicación
export const getAverageBeneficiariesByLocation = (activities, topCount = 3) => {
  if (!activities || !Array.isArray(activities) || activities.length === 0) {
    return [];
  }
  
  // Objeto para almacenar datos por ubicación
  const locationData = {};
  
  // Agrupar actividades por ubicación
  activities.forEach(activity => {
    if (!activity || !activity.location || !activity.location.name || !activity.totalBeneficiaries) {
      return;
    }
    
    const locationName = activity.location.name;
    const locationType = getLocationType(activity.location);
    
    // Inicializar contador si no existe
    if (!locationData[locationName]) {
      locationData[locationName] = {
        name: locationName,
        type: locationType,
        totalBeneficiaries: 0,
        activityCount: 0
      };
    }
    
    // Incrementar contadores
    locationData[locationName].totalBeneficiaries += Number(activity.totalBeneficiaries);
    locationData[locationName].activityCount += 1;
  });
  
  // Calcular promedio y separar por tipo
  const centerLocations = [];
  const parkLocations = [];
  
  Object.values(locationData).forEach(location => {
    // Calcular promedio
    location.average = Math.round(location.totalBeneficiaries / location.activityCount);
    
    // Agregar a la lista correspondiente
    if (location.type === 'center') {
      centerLocations.push(location);
    } else {
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
      typeBeneficiaries[type] += (Number(activity.totalBeneficiaries) || 0);
    }
  });
  
  return Object.keys(typeCounts).map(type => ({
    type: getActivityTypeLabel(type, educationalActivities[0]?.contractor),
    average: typeCounts[type] > 0 ? Math.round(typeBeneficiaries[type] / typeCounts[type]) : 0,
    total: typeBeneficiaries[type],
    count: typeCounts[type]
  }));
};

// NUEVAS FUNCIONES PARA ANÁLISIS DE MODALIDAD

// Función para obtener métricas de eficiencia por modalidad
export const getModalityEfficiencyMetrics = (activities) => {
  if (!activities || !Array.isArray(activities) || activities.length === 0) {
    return { centers: {}, parks: {}, summary: {} };
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

// ========== FUNCIÓN CORREGIDA: calculateModalityMetrics ==========
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

  // ========== CORRECCIÓN: USAR calculateUniqueAttendance ==========
  const totalBeneficiaries = calculateUniqueAttendance(activities);
  
  const uniqueLocations = [...new Set(activities.map(a => a.location?.name).filter(Boolean))];
  
  // Calcular días únicos de operación
  const uniqueDates = [...new Set(activities.map(a => {
    if (!a.date) return null;
    try {
      return new Date(a.date).toDateString();
    } catch {
      return null;
    }
  }).filter(Boolean))];

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
    totalBeneficiaries,  // ← AHORA CORREGIDO
    averageBeneficiaries: activities.length > 0 ? Math.round(totalBeneficiaries / activities.length) : 0,
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
    return { byDay: {}, byWeek: {}, trends: {} };
  }

  const educationalActivities = activities.filter(a => 
    a && a.educationalActivity && a.educationalActivity.included === true && a.date
  );

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const byDay = { center: {}, park: {} };
  const byWeek = {};

  educationalActivities.forEach(activity => {
    try {
      const date = new Date(activity.date);
      const dayOfWeek = dayNames[date.getDay()];
      const weekKey = `${date.getFullYear()}-W${Math.ceil(date.getDate()/7)}`;
      const locationType = getLocationType(activity.location);
      const modalityType = locationType === 'center' ? 'center' : 'park';

      // Por día de la semana
      if (!byDay[modalityType][dayOfWeek]) {
        byDay[modalityType][dayOfWeek] = { count: 0, beneficiaries: 0 };
      }
      byDay[modalityType][dayOfWeek].count++;
      byDay[modalityType][dayOfWeek].beneficiaries += Number(activity.totalBeneficiaries) || 0;

      // Por semana
      if (!byWeek[weekKey]) {
        byWeek[weekKey] = { center: 0, park: 0, total: 0 };
      }
      byWeek[weekKey][modalityType]++;
      byWeek[weekKey].total++;
    } catch (e) {
      // Ignorar fechas inválidas
    }
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

  // Agrupar por contratista y modalidad
  educationalActivities.forEach(activity => {
    const contractor = activity.contractor || 'Desconocido';
    const locationType = getLocationType(activity.location);
    const modalityType = locationType === 'center' ? 'Centros Fijos' : 'Parques/Espacios';
    const key = `${contractor}-${modalityType}`;

    // Por contratista
    if (!comparisons.byContractor[contractor]) {
      comparisons.byContractor[contractor] = {
        activities: 0, beneficiaries: 0, locations: new Set(), avgBeneficiaries: 0
      };
    }
    comparisons.byContractor[contractor].activities++;
    comparisons.byContractor[contractor].beneficiaries += Number(activity.totalBeneficiaries) || 0;
    comparisons.byContractor[contractor].locations.add(activity.location?.name);

    // Por modalidad
    if (!comparisons.byModality[modalityType]) {
      comparisons.byModality[modalityType] = {
        activities: 0, beneficiaries: 0, locations: new Set(), avgBeneficiaries: 0
      };
    }
    comparisons.byModality[modalityType].activities++;
    comparisons.byModality[modalityType].beneficiaries += Number(activity.totalBeneficiaries) || 0;
    comparisons.byModality[modalityType].locations.add(activity.location?.name);

    // Combinado
    if (!comparisons.combined[key]) {
      comparisons.combined[key] = {
        contractor, modalityType, activities: 0, beneficiaries: 0, locations: new Set()
      };
    }
    comparisons.combined[key].activities++;
    comparisons.combined[key].beneficiaries += Number(activity.totalBeneficiaries) || 0;
    comparisons.combined[key].locations.add(activity.location?.name);
  });

  // Calcular promedios
  Object.values(comparisons.byContractor).forEach(data => {
    data.avgBeneficiaries = data.activities > 0 ? Math.round(data.beneficiaries / data.activities) : 0;
    data.uniqueLocations = data.locations.size;
    delete data.locations;
  });

  Object.values(comparisons.byModality).forEach(data => {
    data.avgBeneficiaries = data.activities > 0 ? Math.round(data.beneficiaries / data.activities) : 0;
    data.uniqueLocations = data.locations.size;
    delete data.locations;
  });

  Object.values(comparisons.combined).forEach(data => {
    data.avgBeneficiaries = data.activities > 0 ? Math.round(data.beneficiaries / data.activities) : 0;
    data.uniqueLocations = data.locations.size;
    delete data.locations;
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
  
  // Calcular por fecha
  const centerByDate = {};
  const parkByDate = {};
  
  centerActivities.forEach(activity => {
    if (!activity || !activity.date) return;
    
    const dateKey = new Date(activity.date).toISOString().split('T')[0];
    centerByDate[dateKey] = (centerByDate[dateKey] || 0) + 
      (field === 'count' ? 1 : (Number(activity.totalBeneficiaries) || 0));
  });
  
  parkActivities.forEach(activity => {
    if (!activity || !activity.date) return;
    
    const dateKey = new Date(activity.date).toISOString().split('T')[0];
    parkByDate[dateKey] = (parkByDate[dateKey] || 0) + 
      (field === 'count' ? 1 : (Number(activity.totalBeneficiaries) || 0));
  });
  
  // Convertir a arrays para gráficos
  const centerData = Object.entries(centerByDate)
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
    
  const parkData = Object.entries(parkByDate)
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
    
  return { centerData, parkData };
};

// ========== FUNCIONES NUEVAS PARA CORREGIR DOBLE CONTEO ==========

/**
 * FUNCIÓN CRÍTICA: Calcular asistencia única evitando duplicaciones
 * Agrupa por ubicación + fecha + jornada y toma el MÁXIMO de beneficiarios
 * Ejemplo: CDV La Paz, 26/mayo, J1 con 45 educativo + 45 ración = Math.max(45,45) = 45
 */
export const calculateUniqueAttendance = (activities) => {
  if (!activities || !Array.isArray(activities) || activities.length === 0) {
    return 0;
  }

  // PASO 1: Agrupar por ubicación + fecha + jornada (SIN usuario)
  const dayGroupMap = new Map();
  
  activities.forEach(activity => {
    if (!activity || !activity.location || !activity.date) return;
    
    const dateKey = new Date(activity.date).toISOString().split('T')[0];
    const schedule = activity.schedule || 'general';
    const locationName = activity.location.name || 'Desconocida';
    
    // Clave única: ubicación + fecha + jornada (SIN usuario - esta es la clave)
    const groupKey = `${locationName}-${dateKey}-${schedule}`;
    
    if (!dayGroupMap.has(groupKey)) {
      dayGroupMap.set(groupKey, {
        maxBeneficiaries: 0
      });
    }
    
    const group = dayGroupMap.get(groupKey);
    const beneficiaries = Number(activity.totalBeneficiaries) || 0;
    
    // PASO 2: Tomar el MÁXIMO por jornada (lógica correcta confirmada)
    group.maxBeneficiaries = Math.max(group.maxBeneficiaries, beneficiaries);
  });
  
  // PASO 3: Sumar los máximos de cada jornada
  const totalUniqueAttendance = Array.from(dayGroupMap.values())
    .reduce((sum, group) => sum + group.maxBeneficiaries, 0);
  
  console.log(`Beneficiarios únicos calculados: ${totalUniqueAttendance} (de ${activities.length} registros)`);
  
  return totalUniqueAttendance;
};

/**
 * FUNCIÓN AUXILIAR: Calcular beneficiarios únicos por usuario específico
 * Filtra actividades del usuario y aplica la misma lógica de agrupación
 */
export const calculateUniqueAttendanceByUser = (activities, userUid) => {
  if (!activities || !Array.isArray(activities) || activities.length === 0) {
    return 0;
  }

  // Filtrar solo actividades del usuario específico
  const userActivities = activities.filter(activity => 
    activity && activity.createdBy && activity.createdBy.uid === userUid
  );

  // Usar la función principal para calcular asistencia única
  return calculateUniqueAttendance(userActivities);
};