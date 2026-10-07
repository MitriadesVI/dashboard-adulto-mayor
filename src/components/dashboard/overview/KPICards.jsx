// src/components/dashboard/overview/KPICards.jsx

import React, { useMemo } from 'react';
import { Grid } from '@mui/material';
import DashboardCard from '../common/DashboardCard';
import PeopleIcon from '@mui/icons-material/People';
import EventNoteIcon from '@mui/icons-material/EventNote';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import FastfoodIcon from '@mui/icons-material/Fastfood';
import { 
  getNutritionCountByLocationType, 
  getLocationType,
  calculateUniqueAttendance,
  calculateAverageAttendance
} from '../common/helpers';

// Calcula todos los indicadores de una vez (se memoiza por actividades)
const calculateKPIs = (activities) => {
  const list = Array.isArray(activities) ? activities.filter(Boolean) : [];

  // Solo actividades educativas (excluye entregas de alimentos)
  const educationalActivities = list.filter(activity => 
    activity.educationalActivity?.included === true
  );
  const centerActivities = educationalActivities.filter(a => getLocationType(a.location) === 'center');
  const parkActivities = educationalActivities.filter(a => getLocationType(a.location) === 'park');

  const locationNames = new Set(list.map(a => a.location?.name).filter(Boolean));

  return {
    totalActivities: educationalActivities.length,
    // Asistencia sin doble conteo (máximo por ubicación + fecha + jornada)
    totalBeneficiaries: calculateUniqueAttendance(list),
    uniqueLocations: locationNames.size,
    // Promedio de asistencia por jornada de servicio (asistencia única / número de jornadas)
    averages: {
      total: calculateAverageAttendance(educationalActivities),
      center: calculateAverageAttendance(centerActivities),
      park: calculateAverageAttendance(parkActivities)
    },
    nutritionStats: getNutritionCountByLocationType(list)
  };
};

const KPICards = ({ activities }) => {
  const { totalActivities, totalBeneficiaries, uniqueLocations, averages, nutritionStats } = useMemo(
    () => calculateKPIs(activities),
    [activities]
  );
  
  return (
    <Grid container spacing={3}>
      {/* Tarjeta Total Actividades */}
      <Grid item xs={12} sm={6} md={3}>
        <DashboardCard 
          title="Total Actividades"
          value={totalActivities}
          icon={<EventNoteIcon sx={{ fontSize: 40 }} />}
          color="primary"
          subtitle="Excluye entregas de alimentos"
        />
      </Grid>
      
      {/* Tarjeta Total Beneficiarios - CORREGIDA */}
      <Grid item xs={12} sm={6} md={3}>
        <DashboardCard 
          title="Total Beneficiarios"
          value={totalBeneficiaries}
          icon={<PeopleIcon sx={{ fontSize: 40 }} />}
          color="success"
          subtitle="Evita duplicados por jornada"
        />
      </Grid>
      
      {/* Tarjeta Ubicaciones Atendidas */}
      <Grid item xs={12} sm={6} md={3}>
        <DashboardCard 
          title="Ubicaciones Atendidas"
          value={uniqueLocations}
          icon={<LocationOnIcon sx={{ fontSize: 40 }} />}
          color="secondary"
        />
      </Grid>
      
      {/* Tarjeta Promedio Asistentes */}
      <Grid item xs={12} sm={6} md={3}>
        <DashboardCard 
          title="Promedio Asistentes"
          value={averages.total}
          subtitle="Por jornada de servicio"
          icon={<AssignmentTurnedInIcon sx={{ fontSize: 40 }} />}
          color="warning"
        />
      </Grid>

      {/* Promedio asistentes por centro */}
      <Grid item xs={12} sm={6} md={3}>
        <DashboardCard 
          title="Promedio Asistentes"
          value={averages.center}
          subtitle="Por jornada, en Centros de Vida"
          icon={<AssignmentTurnedInIcon sx={{ fontSize: 40 }} />}
          color="info"
        />
      </Grid>

      {/* Promedio asistentes por parque/espacio */}
      <Grid item xs={12} sm={6} md={3}>
        <DashboardCard 
          title="Promedio Asistentes"
          value={averages.park}
          subtitle="Por jornada, en Parques/Espacios"
          icon={<AssignmentTurnedInIcon sx={{ fontSize: 40 }} />}
          color="error"
        />
      </Grid>

      {/* Tarjeta Raciones en Centros */}
      <Grid item xs={12} sm={6} md={3}>
        <DashboardCard 
          title="Raciones (Centros)"
          value={nutritionStats.centers}
          icon={<RestaurantIcon sx={{ fontSize: 40 }} />}
          color="info"
        />
      </Grid>

      {/* Tarjeta Meriendas en Parques */}
      <Grid item xs={12} sm={6} md={3}>
        <DashboardCard 
          title="Meriendas (Parques)"
          value={nutritionStats.parks}
          icon={<FastfoodIcon sx={{ fontSize: 40 }} />}
          color="error"
        />
      </Grid>

      {/* Tarjeta Total Beneficios Alimentarios */}
      <Grid item xs={12} sm={6} md={3}>
        <DashboardCard 
          title="Total Beneficios Alim."
          value={nutritionStats.total}
          icon={<FastfoodIcon sx={{ fontSize: 40 }} />}
          color="primary"
          subtitle="Raciones + Meriendas"
        />
      </Grid>
    </Grid>
  );
};

export default KPICards;