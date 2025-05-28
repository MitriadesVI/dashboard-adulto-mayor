import { useState, useEffect } from 'react';
import locationsService from '../../../../services/locationsService';
export const useLocationData = (activities) => {
  const [availableLocations, setAvailableLocations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadAvailableLocations = async () => {
      if (!activities || !activities.length) {
        setAvailableLocations([]);
        return;
      }

      setLoading(true);
      try {
        const allLocations = await locationsService.getAllLocations();
        const uniqueLocationsMap = new Map();
        
        activities.forEach(activity => {
          if (activity.location && activity.location.name) {
            if (!uniqueLocationsMap.has(activity.location.name)) {
              uniqueLocationsMap.set(activity.location.name, {
                name: activity.location.name,
                type: activity.location.type,
                contractor: activity.contractor
              });
            }
          }
        });

        const availableLocsWithDetails = Array.from(uniqueLocationsMap.values()).map(loc => {
          const fbLocation = allLocations.find(fbLoc => fbLoc.name === loc.name);
          return {
            ...loc,
            capacity: fbLocation?.capacity || 0,
            id: fbLocation?.id || null
          };
        });

        setAvailableLocations(availableLocsWithDetails);
      } catch (error) {
        console.error('Error cargando ubicaciones:', error);
        // Fallback a datos básicos
        const uniqueLocationsMap = new Map();
        activities.forEach(activity => {
          if (activity.location && activity.location.name) {
            if (!uniqueLocationsMap.has(activity.location.name)) {
              uniqueLocationsMap.set(activity.location.name, {
                name: activity.location.name,
                type: activity.location.type,
                contractor: activity.contractor,
                capacity: 0
              });
            }
          }
        });
        setAvailableLocations(Array.from(uniqueLocationsMap.values()));
      } finally {
        setLoading(false);
      }
    };

    loadAvailableLocations();
  }, [activities]);

  return { availableLocations, loading };
};