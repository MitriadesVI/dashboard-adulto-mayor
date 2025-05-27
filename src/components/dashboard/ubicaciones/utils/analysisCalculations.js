export const performDetailedAnalysis = (locationActivities, locationInfo, selectedMonth) => {
  const isCenterLocation = locationInfo?.type?.toLowerCase() === 'center';
  
  // 1. AGRUPACIÓN POR DÍA + JORNADA para cálculo correcto de promedios
  const dayGroupMap = new Map();
  
  locationActivities.forEach(activity => {
    const activityDate = new Date(activity.date);
    const dateKey = activityDate.toISOString().split('T')[0];
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
      capacity: locationInfo.capacity || 0,
      utilizationRate: locationInfo.capacity > 0 ? Math.round((averageAttendance / locationInfo.capacity) * 100) : 0
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

export const analyzeTemporalPatterns = (dayGroups, monthFilter) => {
  const patterns = {
    weeklyAverages: {},
    monthlyCalendar: {},
    serviceRegularity: 0,
    availableMonths: []
  };

  // 1. ✅ OBTENER TODOS LOS MESES DISPONIBLES (SIEMPRE)
  const allMonthsSet = new Set();
  dayGroups.forEach(group => {
    if (group.date) {
      try {
        const date = new Date(group.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        allMonthsSet.add(monthKey);
      } catch (e) {
        console.warn('Fecha inválida en dayGroups:', group.date);
      }
    }
  });
  patterns.availableMonths = Array.from(allMonthsSet).sort();

  // 2. ✅ GENERAR DATOS SEMANALES
  dayGroups.forEach(group => {
    if (!group.date) return;
    
    try {
      const date = new Date(group.date);
      const weekNumber = getWeekNumber(date);
      const weekKey = `${date.getFullYear()}-W${weekNumber}`;
      
      if (!patterns.weeklyAverages[weekKey]) {
        patterns.weeklyAverages[weekKey] = { 
          beneficiaries: 0, 
          sessions: 0, 
          week: weekNumber,
          year: date.getFullYear(),
          monthName: date.toLocaleDateString('es-ES', { month: 'short' })
        };
      }
      
      patterns.weeklyAverages[weekKey].beneficiaries += group.maxBeneficiaries;
      patterns.weeklyAverages[weekKey].sessions++;
    } catch (e) {
      console.warn('Error procesando fecha para semanas:', group.date, e);
    }
  });

  // Calcular promedios semanales
  Object.keys(patterns.weeklyAverages).forEach(weekKey => {
    const week = patterns.weeklyAverages[weekKey];
    week.average = week.sessions > 0 ? Math.round(week.beneficiaries / week.sessions) : 0;
  });

  // 3. ✅ GENERAR DATOS MENSUALES PARA TODOS LOS MESES (CORREGIDO)
  // Si hay un filtro específico, usarlo. Si no, generar para todos los meses disponibles
  const monthsToProcess = monthFilter ? [monthFilter] : patterns.availableMonths;
  
  monthsToProcess.forEach(currentMonth => {
    try {
      const [year, monthStr] = currentMonth.split('-');
      const month = parseInt(monthStr, 10);
      const daysInMonth = new Date(parseInt(year, 10), month, 0).getDate();
      
      // Generar datos para cada día del mes
      for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${monthStr}-${day.toString().padStart(2, '0')}`;
        
        // Filtrar actividades de este día específico
        const dayData = dayGroups.filter(g => g.date === dateKey);
        
        // Solo agregar días que tengan actividad
        if (dayData.length > 0) {
          patterns.monthlyCalendar[dateKey] = {
            date: dateKey,
            dayOfMonth: day,
            services: dayData.length,
            attendance: dayData.reduce((sum, g) => sum + g.maxBeneficiaries, 0),
            rations: dayData.reduce((sum, g) => sum + g.nutritionRations, 0),
            components: [...new Set(dayData.flatMap(g => Array.from(g.components)))]
          };
        }
      }
    } catch (e) {
      console.warn('Error procesando mes:', currentMonth, e);
    }
  });

  // 4. ✅ CALCULAR REGULARIDAD DEL SERVICIO
  const uniqueDates = [...new Set(dayGroups.map(g => g.date))];
  const totalDaysInPeriod = dayGroups.length > 0 ?
    Math.ceil((new Date(Math.max(...dayGroups.map(g => new Date(g.date)))) -
      new Date(Math.min(...dayGroups.map(g => new Date(g.date))))) / (1000 * 60 * 60 * 24)) + 1 : 0;
  
  patterns.serviceRegularity = totalDaysInPeriod > 0 ? 
    (uniqueDates.length / totalDaysInPeriod) * 100 : 0;

  console.log('📊 Patrones temporales generados:', {
    availableMonths: patterns.availableMonths,
    weeklyData: Object.keys(patterns.weeklyAverages).length,
    monthlyData: Object.keys(patterns.monthlyCalendar).length,
    serviceRegularity: patterns.serviceRegularity.toFixed(1)
  });

  return patterns;
};

export const analyzeWeaknesses = (avgAttendance, capacity, components, dayGroups, isCenter) => {
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

  // CORREGIDO: Cálculo mejorado de regularidad del servicio
  const uniqueDates = [...new Set(dayGroups.map(g => g.date))];
  const totalDaysInPeriod = dayGroups.length > 0 ?
    Math.ceil((new Date(Math.max(...dayGroups.map(g => new Date(g.date)))) -
      new Date(Math.min(...dayGroups.map(g => new Date(g.date))))) / (1000 * 60 * 60 * 24)) + 1 : 0;
  
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
      message: `Servicio irregular: solo ${uniqueDates.length} de ${expectedServiceDays} días esperados para un ${locationTypeText} (${serviceRegularity.toFixed(1)}%)`,
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
      totalDaysInPeriod
    } 
  };
};

// Función auxiliar para calcular número de semana ISO
const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
};