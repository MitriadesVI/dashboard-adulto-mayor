// src/components/dashboard/ubicaciones/hooks/useLocationAnalysis.js

import { useState } from 'react';
import { 
  performDetailedAnalysis, 
  analyzeComponents, 
  analyzeTemporalPatterns, 
  analyzeWeaknesses 
} from '../utils/analysisCalculations';
import { generateChartData } from '../utils/chartDataProcessing';
import { generateInsights } from '../utils/insightsGenerator';

export const useLocationAnalysis = () => {
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyzeLocation = async (locationActivities, selectedLocationInfo, filters = {}) => {
    if (!selectedLocationInfo || !locationActivities) return;

    setLoading(true);
    console.log("Iniciando análisis para:", selectedLocationInfo.name, "Capacidad:", selectedLocationInfo.capacity);

    try {
      // Filtrar actividades por fechas si están definidas
      let filteredActivities = [...locationActivities];
      
      if (filters.startDate) {
        const filterStartDate = new Date(filters.startDate);
        filteredActivities = filteredActivities.filter(activity => {
          if (!activity.date) return false;
          const activityDate = new Date(activity.date);
          return activityDate >= new Date(filterStartDate.setHours(0,0,0,0));
        });
      }

      if (filters.endDate) {
        const filterEndDate = new Date(filters.endDate);
        filteredActivities = filteredActivities.filter(activity => {
          if (!activity.date) return false;
          const activityDate = new Date(activity.date);
          return activityDate <= new Date(filterEndDate.setHours(23,59,59,999));
        });
      }

      console.log(`Actividades filtradas: ${filteredActivities.length}`);

      // 1. Realizar análisis principal (métricas y agrupación)
      const mainAnalysis = performDetailedAnalysis(
        filteredActivities, 
        selectedLocationInfo, 
        filters.selectedMonth
      );

      // 2. Análisis de componentes
      const componentAnalysis = analyzeComponents(filteredActivities);

      // 3. Análisis temporal (patrones semanales/mensuales)
      const temporalAnalysis = analyzeTemporalPatterns(
        mainAnalysis.dayGroups, 
        filters.selectedMonth
      );

      // 4. Análisis de debilidades
      const weaknessAnalysis = analyzeWeaknesses(
        mainAnalysis.summary.averageAttendance, 
        selectedLocationInfo.capacity, 
        componentAnalysis,
        mainAnalysis.dayGroups, 
        selectedLocationInfo.type?.toLowerCase() === 'center'
      );

      // 5. Generar datos para gráficos
      const chartData = generateChartData(mainAnalysis.dayGroups, temporalAnalysis);

      // 6. Consolidar todos los datos de análisis
      const fullAnalysisData = {
        summary: mainAnalysis.summary,
        components: componentAnalysis,
        temporal: temporalAnalysis,
        weaknesses: weaknessAnalysis,
        charts: chartData,
        rawGroups: mainAnalysis.dayGroups
      };

      // 7. Generar insights automáticos
      const insights = generateInsights(
        fullAnalysisData, 
        selectedLocationInfo, 
        filteredActivities
      );

      // 8. Establecer datos finales del análisis
      setAnalysisData({
        ...fullAnalysisData,
        insights,
        locationName: selectedLocationInfo.name, // Para referencia en componentes
        locationInfo: selectedLocationInfo // Info completa de la ubicación
      });

      console.log("Análisis completado exitosamente para:", selectedLocationInfo.name);

    } catch (error) {
      console.error('Error en análisis:', error);
      setAnalysisData(null);
    } finally {
      setLoading(false);
    }
  };

  const clearAnalysis = () => {
    setAnalysisData(null);
  };

  return { 
    analysisData, 
    loading, 
    analyzeLocation,
    clearAnalysis 
  };
};

export default useLocationAnalysis;