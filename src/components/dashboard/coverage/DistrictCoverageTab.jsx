// src/components/dashboard/coverage/DistrictCoverageTab.jsx
//
// Cobertura de sedes para el Distrito: todas las sedes registradas (de todos los
// contratistas o del contratista filtrado), incluidas las que nunca recibieron atención.

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, CircularProgress } from '@mui/material';
import LocationCoveragePanel from '../../coverage/LocationCoveragePanel';
import locationsService from '../../../services/locationsService';
import { getLocationType } from '../common/helpers';

const isAllContractors = (contractor) => !contractor || contractor === 'all' || contractor === 'Todos';

const DistrictCoverageTab = ({ activities, contractor, locationType = 'all', referenceDate }) => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    locationsService.getAllLocations()
      .then((data) => {
        if (!cancelled) setLocations(data);
      })
      .catch((err) => {
        console.error('Error al cargar sedes:', err);
        if (!cancelled) setError('No se pudieron cargar las sedes registradas.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleLocations = useMemo(() => locations.filter((location) => {
    if (!isAllContractors(contractor) && location.contractor !== contractor) return false;
    if (locationType !== 'all' && getLocationType(location) !== locationType) return false;
    return true;
  }), [locations, contractor, locationType]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <LocationCoveragePanel
      locations={visibleLocations}
      activities={activities}
      showContractor={isAllContractors(contractor)}
      referenceDate={referenceDate}
      title="Cobertura de sedes"
    />
  );
};

export default DistrictCoverageTab;
