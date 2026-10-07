import { useState } from 'react';
import { 
  performDetailedAnalysis, 
  analyzeComponents, 
  analyzeTemporalPatterns, 
  analyzeWeaknesses 
} from '../utils/analysisCalculations';
import { generateChartData } from '../utils/chartDataProcessing';
import { generateInsights } from '../utils/insightsGenerator';
import { getLocationType } from '../../common/helpers';
import { parseActivityDate, startOfDay, endOfDay, todayKey } from '../../../../utils/dates';

export const useLocationAnalysis = () => {
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyzeLocation = async (locationActivities, selectedLocationInfo, filters = {}) => {
    if (!selectedLocationInfo || !locationActivities) return;

    setLoading(true);

    try {
      // Filtrar actividades por fechas si están definidas (las fechas del filtro se leen en hora local)
      let filteredActivities = [...locationActivities];
      
      if (filters.startDate) {
        const filterStartDate = startOfDay(filters.startDate);
        filteredActivities = filteredActivities.filter(activity => {
          const activityDate = parseActivityDate(activity.date);
          return !!activityDate && !!filterStartDate && activityDate >= filterStartDate;
        });
      }

      if (filters.endDate) {
        const filterEndDate = endOfDay(filters.endDate);
        filteredActivities = filteredActivities.filter(activity => {
          const activityDate = parseActivityDate(activity.date);
          return !!activityDate && !!filterEndDate && activityDate <= filterEndDate;
        });
      }

      // Fin de la ventana de análisis: la fecha final del filtro (sin pasar de hoy) o, si no hay, hoy.
      // La regularidad del servicio se mide hasta ahí para que una ubicación abandonada no parezca regular.
      const today = todayKey();
      const windowEndKey = filters.endDate && filters.endDate < today ? filters.endDate : today;

      // 1. Realizar análisis principal (métricas y agrupación)
      const mainAnalysis = performDetailedAnalysis(filteredActivities, selectedLocationInfo);

      // 2. Análisis de componentes
      const componentAnalysis = analyzeComponents(filteredActivities);

      // 3. Análisis temporal (patrones semanales/mensuales)
      const temporalAnalysis = analyzeTemporalPatterns(mainAnalysis.dayGroups, windowEndKey);

      // 4. Análisis de debilidades
      const weaknessAnalysis = analyzeWeaknesses(
        mainAnalysis.summary.averageAttendance, 
        Number(selectedLocationInfo.capacity) || 0, 
        componentAnalysis,
        mainAnalysis.dayGroups, 
        getLocationType(selectedLocationInfo) === 'center',
        windowEndKey
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
        locationInfo: selectedLocationInfo, // Info completa de la ubicación
        selectedMonth: filters.selectedMonth // Mes que se muestra primero en el calendario mensual
      });

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