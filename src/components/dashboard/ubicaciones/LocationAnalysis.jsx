import React from 'react';
import { Box } from '@mui/material';

// Hooks personalizados
import { useLocationData } from './hooks/useLocationData';
import { useLocationAnalysis } from './hooks/useLocationAnalysis';

// Componentes modulares
import LocationAnalysisFilters from './analysis/LocationAnalysisFilters';
import LocationMetricsPanel from './analysis/LocationMetricsPanel';
import LocationWeaknessPanel from './analysis/LocationWeaknessPanel';
import LocationInsightsPanel from './analysis/LocationInsightsPanel';
import LocationAnalysisTabs from './analysis/LocationAnalysisTabs';

const LocationAnalysis = ({ activities }) => {
  const { availableLocations, loading: loadingLocations } = useLocationData(activities);
  const { analysisData, loading: loadingAnalysis, analyzeLocation } = useLocationAnalysis();

  const handleAnalyzeLocation = (selectedLocationInfo, filters) => {
    // Filtrar actividades por ubicación
    const locationActivities = activities.filter(
      activity => activity.location && activity.location.name === selectedLocationInfo.name
    );
    
    analyzeLocation(locationActivities, selectedLocationInfo, filters);
  };

  return (
    <Box>
      <LocationAnalysisFilters
        availableLocations={availableLocations}
        onAnalyze={handleAnalyzeLocation}
        loading={loadingAnalysis || loadingLocations}
      />

      {analysisData && (
        <>
          <LocationMetricsPanel 
            summary={analysisData.summary} 
            selectedLocationInfo={availableLocations.find(loc => loc.name === analysisData.locationName)}
          />
          <LocationWeaknessPanel weaknesses={analysisData.weaknesses} />
          <LocationInsightsPanel insights={analysisData.insights} />
          {/* Al analizar otra ubicación o mes se reinicia la pestaña y el mes mostrado */}
          <LocationAnalysisTabs
            key={`${analysisData.locationName}|${analysisData.selectedMonth}`}
            analysisData={analysisData}
          />
        </>
      )}
    </Box>
  );
};

export default LocationAnalysis;