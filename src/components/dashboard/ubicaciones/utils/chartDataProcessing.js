// src/components/dashboard/ubicaciones/utils/chartDataProcessing.js

import { getActivitySubtypeLabel } from '../../common/helpers';

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
  const strategiesMap = {};
  const componentsCount = { nutrition: 0, physical: 0, psychosocial: 0 };

  dayGroups.forEach(group => {
    group.activities.forEach(activity => {
      // Contar actividades educativas por tipo/estrategia
      if (activity.educationalActivity && activity.educationalActivity.included) {
        const type = activity.educationalActivity.type;
        if (!type) return;
        const subtype = activity.educationalActivity.subtype || 'Sin especificar';
        
        // Etiqueta según el contratista real de la actividad (helpers.js)
        const strategyLabel = getActivitySubtypeLabel(type, subtype, activity.contractor);
        const strategyKey = `${type}-${strategyLabel}`;
        
        if (!strategiesMap[strategyKey]) {
          strategiesMap[strategyKey] = { id: strategyKey, component: type, strategy: strategyLabel, count: 0, percentage: 0 };
        }
        strategiesMap[strategyKey].count += 1;
        componentsCount[type] = (componentsCount[type] || 0) + 1;
      }
      
      // IMPORTANTE: Las entregas nutricionales NO son actividades educativas
      // Solo las contamos como beneficios separados, no como estrategias
    });
  });

  const strategiesArray = Object.values(strategiesMap);

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

const formatComponentName = (component) => {
  const names = {
    nutrition: 'Nutricional',
    physical: 'Salud Física',
    psychosocial: 'Psicosocial'
  };
  return names[component] || component;
};