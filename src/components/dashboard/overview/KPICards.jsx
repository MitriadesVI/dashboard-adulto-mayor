// src/components/dashboard/overview/KPICards.jsx

import React from 'react';
import { Grid } from '@mui/material';
import DashboardCard from '../common/DashboardCard';
import PeopleIcon from '@mui/icons-material/People';
import EventNoteIcon from '@mui/icons-material/EventNote';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';

const KPICards = ({ activities }) => {
  // Calcular estadísticas
  const getTotalActivities = () => activities?.length || 0;
  
  const getTotalBeneficiaries = () => 
    activities?.reduce((sum, activity) => sum + (Number(activity?.beneficiaries) || 0), 0) || 0;
  
  const getUniqueLocations = () => {
    if (!activities?.length) return 0;
    const locationNames = new Set();
    activities.forEach(activity => {
      if (activity?.location?.name) {
        locationNames.add(activity.location.name);
      }
    });
    return locationNames.size;
  };
  
  const getAverageAttendance = () => {
    if (!activities?.length) return 0;
    const total = getTotalBeneficiaries();
    return Math.round(total / activities.length);
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <DashboardCard 
          title="Total Actividades"
          value={getTotalActivities()}
          icon={<EventNoteIcon sx={{ fontSize: 40 }} />}
          color="primary"
        />
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <DashboardCard 
          title="Total Beneficiarios"
          value={getTotalBeneficiaries()}
          icon={<PeopleIcon sx={{ fontSize: 40 }} />}
          color="success"
        />
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <DashboardCard 
          title="Ubicaciones Atendidas"
          value={getUniqueLocations()}
          icon={<LocationOnIcon sx={{ fontSize: 40 }} />}
          color="secondary"
        />
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <DashboardCard 
          title="Promedio Asistentes"
          value={getAverageAttendance()}
          subtitle="Por actividad"
          icon={<AssignmentTurnedInIcon sx={{ fontSize: 40 }} />}
          color="warning"
        />
      </Grid>
    </Grid>
  );
};

export default KPICards;