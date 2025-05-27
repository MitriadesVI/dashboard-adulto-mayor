export const generateInsights = (analysisData, selectedLocationInfo, locationActivities) => {
  const insights = [];
  const summary = analysisData.summary;
  const components = analysisData.components;
  const weaknesses = analysisData.weaknesses;
  const dayGroups = analysisData.rawGroups;
  
  // 1. INSIGHTS DE RENDIMIENTO Y CAPACIDAD
  if (selectedLocationInfo?.type?.toLowerCase() === 'center' && summary.capacity > 0) {
    if (summary.utilizationRate >= 85) {
      insights.push({
        type: 'success',
        category: 'rendimiento',
        message: `🎯 Excelente utilización: ${summary.utilizationRate}% de capacidad. Este centro está operando de manera óptima.`,
        priority: 'high'
      });
    } else if (summary.utilizationRate >= 70) {
      insights.push({
        type: 'info',
        category: 'rendimiento',
        message: `📊 Buena utilización: ${summary.utilizationRate}% de capacidad (${summary.averageAttendance}/${summary.capacity}). Cerca del objetivo del 80%.`,
        priority: 'medium'
      });
    } else if (summary.utilizationRate < 50) {
      insights.push({
        type: 'warning',
        category: 'rendimiento',
        message: `⚠️ Baja utilización: Solo ${summary.utilizationRate}% de capacidad. Considere estrategias de convocatoria.`,
        priority: 'high'
      });
    }
  }

  // 2. INSIGHTS DE JORNADAS (solo para centros)
  if (selectedLocationInfo?.type?.toLowerCase() === 'center' && summary.avgJ1 > 0 && summary.avgJ2 > 0) {
    const j1vsJ2Diff = ((summary.avgJ1 - summary.avgJ2) / summary.avgJ2) * 100;
    if (Math.abs(j1vsJ2Diff) > 20) {
      const betterSession = j1vsJ2Diff > 0 ? 'J1 (mañana)' : 'J2 (tarde)';
      const percentage = Math.abs(j1vsJ2Diff).toFixed(0);
      insights.push({
        type: 'info',
        category: 'jornadas',
        message: `🕐 ${betterSession} tiene ${percentage}% más asistencia (J1: ${summary.avgJ1}, J2: ${summary.avgJ2}). Considere programar actividades principales en la jornada de mayor asistencia.`,
        priority: 'medium'
      });
    } else {
      insights.push({
        type: 'success',
        category: 'jornadas',
        message: `⚖️ Asistencia equilibrada entre jornadas (J1: ${summary.avgJ1}, J2: ${summary.avgJ2}). Buen aprovechamiento del día completo.`,
        priority: 'low'
      });
    }
  }

  // 3. INSIGHTS DE COMPONENTES
  const totalServices = components.nutrition.activities + components.nutrition.deliveries + 
                       components.physical.activities + components.psychosocial.activities;
  
  if (totalServices > 0) {
    const componentStats = [
      { name: 'nutricional', count: components.nutrition.activities + components.nutrition.deliveries, emoji: '🍎' },
      { name: 'salud física', count: components.physical.activities, emoji: '🏃‍♂️' },
      { name: 'psicosocial', count: components.psychosocial.activities, emoji: '🧠' }
    ].sort((a, b) => b.count - a.count);

    const dominant = componentStats[0];
    const dominantPercentage = ((dominant.count / totalServices) * 100).toFixed(0);
    
    if (dominantPercentage > 60) {
      insights.push({
        type: 'warning',
        category: 'componentes',
        message: `${dominant.emoji} Componente ${dominant.name} representa ${dominantPercentage}% de los servicios. Considere diversificar actividades.`,
        priority: 'medium'
      });
    }

    componentStats.forEach(comp => {
      if (comp.count === 0) {
        insights.push({
          type: 'error',
          category: 'componentes',
          message: `${comp.emoji} Sin actividades de ${comp.name}. Es importante incluir este componente para atención integral.`,
          priority: 'high'
        });
      }
    });

    if (components.nutrition.deliveries > 0 && components.nutrition.rations > 0) {
      const avgRationsPerDelivery = Math.round(components.nutrition.rations / components.nutrition.deliveries);
      insights.push({
        type: 'info',
        category: 'nutrición',
        message: `🍽️ Promedio de ${avgRationsPerDelivery} raciones por entrega nutricional. Total: ${components.nutrition.rations} raciones en ${components.nutrition.deliveries} entregas.`,
        priority: 'low'
      });
    }
  }

  // 4. INSIGHTS TEMPORALES
  if (dayGroups.length > 0) {
    // Análisis de días de la semana
    const dayOfWeekStats = {};
    dayGroups.forEach(group => {
      const date = new Date(group.date);
      const dayName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][date.getDay()];
      if (!dayOfWeekStats[dayName]) {
        dayOfWeekStats[dayName] = { count: 0, totalAttendance: 0 };
      }
      dayOfWeekStats[dayName].count++;
      dayOfWeekStats[dayName].totalAttendance += group.maxBeneficiaries;
    });

    // Encontrar el mejor día
    const dayStats = Object.entries(dayOfWeekStats).map(([day, stats]) => ({
      day,
      average: stats.count > 0 ? Math.round(stats.totalAttendance / stats.count) : 0,
      sessions: stats.count
    })).sort((a, b) => b.average - a.average);

    if (dayStats.length > 1) {
      const bestDay = dayStats[0];
      const worstDay = dayStats[dayStats.length - 1];
      
      if (bestDay.sessions >= 2 && worstDay.sessions >= 2) {
        const improvement = ((bestDay.average - worstDay.average) / worstDay.average * 100).toFixed(0);
        if (improvement > 25) {
          insights.push({
            type: 'info',
            category: 'temporal',
            message: `📅 ${bestDay.day} es el mejor día con ${bestDay.average} asistentes promedio, ${improvement}% más que ${worstDay.day} (${worstDay.average}).`,
            priority: 'medium'
          });
        }
      }
    }

    // Análisis de tendencia temporal
    if (dayGroups.length >= 6) {
      const sortedGroups = [...dayGroups].sort((a, b) => new Date(a.date) - new Date(b.date));
      const firstHalf = sortedGroups.slice(0, Math.floor(sortedGroups.length / 2));
      const secondHalf = sortedGroups.slice(Math.floor(sortedGroups.length / 2));
      
      const firstHalfAvg = firstHalf.reduce((sum, g) => sum + g.maxBeneficiaries, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, g) => sum + g.maxBeneficiaries, 0) / secondHalf.length;
      
      const trendPercentage = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg * 100);
      
      if (trendPercentage > 15) {
        insights.push({
          type: 'success',
          category: 'tendencia',
          message: `📈 Tendencia positiva: La asistencia ha mejorado ${trendPercentage.toFixed(0)}% en el período reciente (${Math.round(secondHalfAvg)} vs ${Math.round(firstHalfAvg)}).`,
          priority: 'medium'
        });
      } else if (trendPercentage < -15) {
        insights.push({
          type: 'warning',
          category: 'tendencia',
          message: `📉 Tendencia negativa: La asistencia ha bajado ${Math.abs(trendPercentage).toFixed(0)}% recientemente (${Math.round(secondHalfAvg)} vs ${Math.round(firstHalfAvg)}). Revisar causas.`,
          priority: 'high'
        });
      }
    }

    // 5. INSIGHTS DE SERVICIOS MIXTOS
    const mixedSessions = dayGroups.filter(g => g.hasEducational && g.hasNutrition);
    const educationalOnly = dayGroups.filter(g => g.hasEducational && !g.hasNutrition);
    const nutritionOnly = dayGroups.filter(g => !g.hasEducational && g.hasNutrition);
    
    if (mixedSessions.length > 0 && (educationalOnly.length > 0 || nutritionOnly.length > 0)) {
      const mixedAvg = mixedSessions.reduce((sum, g) => sum + g.maxBeneficiaries, 0) / mixedSessions.length;
      const otherAvg = [...educationalOnly, ...nutritionOnly].reduce((sum, g) => sum + g.maxBeneficiaries, 0) / (educationalOnly.length + nutritionOnly.length);
      
      if (mixedAvg > otherAvg * 1.1) {
        const improvement = ((mixedAvg - otherAvg) / otherAvg * 100).toFixed(0);
        insights.push({
          type: 'success',
          category: 'estrategia',
          message: `🔄 Los servicios mixtos (educación + nutrición) tienen ${improvement}% más asistencia (${Math.round(mixedAvg)} vs ${Math.round(otherAvg)}). Estrategia efectiva.`,
          priority: 'medium'
        });
      }
    }

    // 6. INSIGHTS DE PRODUCTIVIDAD
    const weeksInPeriod = Math.max(1, Math.ceil(summary.uniqueServiceDays / 7));
    const sessionsPerWeek = summary.serviceSessions / weeksInPeriod;
    
    if (selectedLocationInfo?.type?.toLowerCase() === 'center') {
      if (sessionsPerWeek > 8) {
        insights.push({
          type: 'success',
          category: 'productividad',
          message: `⚡ Alta productividad: ${sessionsPerWeek.toFixed(1)} sesiones por semana. Excelente ritmo de atención.`,
          priority: 'low'
        });
      } else if (sessionsPerWeek < 4) {
        insights.push({
          type: 'warning',
          category: 'productividad',
          message: `🐌 Baja frecuencia: Solo ${sessionsPerWeek.toFixed(1)} sesiones por semana. Considere aumentar la programación.`,
          priority: 'medium'
        });
      }
    }
  }

  // 7. INSIGHTS DE UBICACIÓN MODELO
  if (weaknesses.weaknesses.length === 0 && totalServices > 5) {
    insights.push({
      type: 'success',
      category: 'general',
      message: `🌟 Ubicación modelo: Sin debilidades detectadas y con ${totalServices} servicios realizados. Ejemplo a seguir.`,
      priority: 'high'
    });
  }

  // Ordenar insights por prioridad
  const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
  return insights.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
};