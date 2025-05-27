// src/components/dashboard/ubicaciones/utils/chartDataProcessing.js

export const generateChartData = (dayGroups, temporalAnalysis) => {
  // 1. Procesar datos para tendencias semanales
  const weeklyTrend = Object.values(temporalAnalysis.weeklyAverages)
    .sort((a, b) => {
      // Ordenar cronológicamente por año y semana
      if (a.year !== b.year) return a.year - b.year;
      return a.week - b.week;
    })
    .map((week, index) => ({
      week: `S${index + 1}`, // S1, S2, S3... (cronológico)
      weekNumber: week.week,
      monthName: week.monthName,
      // ✅ CORREGIDO: Usar nombres que esperan los componentes
      promedio: week.average,           // WeeklyTrendChart espera 'promedio'
      sesiones: week.sessions,          // WeeklyTrendChart espera 'sesiones'
      totalBeneficiaries: week.beneficiaries,
      // Datos adicionales para el tooltip
      originalWeek: week.week,
      year: week.year
    }));

  // 2. Procesar datos para calendario mensual
  const monthlyCalendar = Object.values(temporalAnalysis.monthlyCalendar)
    .filter(day => day.services > 0) // Solo días con actividad
    .map(day => ({
      date: day.date,
      day: day.dayOfMonth,
      // ✅ CORREGIDO: Usar nombres que esperan los componentes
      asistencia: day.attendance,     // MonthlyCalendarChart espera 'asistencia'
      servicios: day.services,        // MonthlyCalendarChart espera 'servicios'
      raciones: day.rations,          // MonthlyCalendarChart espera 'raciones'
      components: day.components
    }));

  // 3. Procesar datos para distribución de componentes/estrategias
  const componentsData = processComponentsForChart(dayGroups);

  return {
    weeklyTrend,
    monthlyCalendar,
    components: componentsData,
    availableMonths: temporalAnalysis.availableMonths || []
  };
};

const processComponentsForChart = (dayGroups) => {
  const strategiesCount = {};
  const componentsCount = { nutrition: 0, physical: 0, psychosocial: 0 };

  dayGroups.forEach(group => {
    group.activities.forEach(activity => {
      // Contar actividades educativas por tipo/estrategia
      if (activity.educationalActivity && activity.educationalActivity.included) {
        const type = activity.educationalActivity.type;
        const subtype = activity.educationalActivity.subtype || 'Sin especificar';
        const strategyKey = `${type}-${subtype}`;
        
        strategiesCount[strategyKey] = (strategiesCount[strategyKey] || 0) + 1;
        componentsCount[type] = (componentsCount[type] || 0) + 1;
      }
      
      // IMPORTANTE: Las entregas nutricionales NO son actividades educativas
      // Solo las contamos como beneficios separados, no como estrategias
      if (activity.nutritionDelivery && activity.nutritionDelivery.included) {
        // NO incrementar componentsCount.nutrition aquí
        // Las entregas son beneficios, no actividades educativas
      }
    });
  });

  // Convertir a formato para gráficos
  const strategiesArray = Object.entries(strategiesCount).map(([key, count]) => {
    const [component, strategy] = key.split('-');
    
    // Usar las funciones de helpers.js para obtener etiquetas correctas
    const strategyLabel = getActivitySubtypeLabel(component, strategy, 'CUC'); // Asumimos CUC por defecto
    
    return {
      id: key,
      component,
      strategy: strategyLabel,
      count,
      percentage: 0 // Se calculará después
    };
  });

  // Calcular porcentajes basado solo en actividades educativas
  const totalEducationalActivities = strategiesArray.reduce((sum, item) => sum + item.count, 0);
  strategiesArray.forEach(item => {
    item.percentage = totalEducationalActivities > 0 ? 
      ((item.count / totalEducationalActivities) * 100).toFixed(1) : 0;
  });

  return {
    strategies: strategiesArray.sort((a, b) => b.count - a.count), // Ordenar por frecuencia
    components: Object.entries(componentsCount)
      .filter(([name, count]) => count > 0) // Solo componentes con actividades
      .map(([name, count]) => ({
        name: formatComponentName(name),
        count,
        percentage: totalEducationalActivities > 0 ? 
          ((count / totalEducationalActivities) * 100).toFixed(1) : 0
      }))
  };
};

// Importar funciones de helpers.js (replicadas aquí para evitar dependencias circulares)
const getActivitySubtypeLabel = (type, subtype, contractor) => {
  if (!type || !subtype) return 'Subtipo Desconocido';
  
  const subtypeMap = {
    nutrition: {
      workshop: contractor === 'CUC' ? 'Taller educativo del cuidado nutricional' : 'Jornada de promoción de la salud nutricional'
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

  if (subtypeMap[type] && subtypeMap[type][subtype]) {
    return subtypeMap[type][subtype];
  }

  return subtype.charAt(0).toUpperCase() + subtype.slice(1);
};

const formatComponentName = (component) => {
  const names = {
    nutrition: 'Nutricional',
    physical: 'Salud Física',
    psychosocial: 'Psicosocial'
  };
  return names[component] || component;
};