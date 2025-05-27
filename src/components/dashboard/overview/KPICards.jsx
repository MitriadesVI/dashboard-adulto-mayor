// src/components/dashboard/overview/KPICards.jsx

import React from 'react';
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
  calculateUniqueAttendance  // ← NUEVA IMPORTACIÓN
} from '../common/helpers';

const KPICards = ({ activities }) => {
  // Contar solo actividades educativas
  const getTotalActivities = () => {
    if (!activities || !Array.isArray(activities)) return 0;
    
    return activities.filter(activity => 
      activity?.educationalActivity?.included === true
    ).length;
  };
  
  // ========== FUNCIÓN CORREGIDA: EVITA DOBLE CONTEO ==========
  const getTotalBeneficiaries = () => {
    if (!activities || !Array.isArray(activities)) return 0;
    
    // ANTES: return activities?.reduce((sum, activity) => sum + (Number(activity?.totalBeneficiaries) || 0), 0) || 0;
    
    // DESPUÉS: Usar función que evita duplicados
    return calculateUniqueAttendance(activities);
  };
  
  // Contar ubicaciones únicas
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
  
  // ========== FUNCIÓN CORREGIDA: CALCULAR PROMEDIOS SIN DUPLICADOS ==========
  const getAverageAttendanceByType = () => {
    // Filtrar solo actividades educativas
    const educationalActivities = activities?.filter(a => 
      a?.educationalActivity?.included === true
    ) || [];
    
    if (educationalActivities.length === 0) {
      return { total: 0, center: 0, park: 0 };
    }
    
    // Usar función corregida para cada modalidad
    const centerActivities = educationalActivities.filter(a => 
      getLocationType(a?.location) === 'center'
    );
    
    const parkActivities = educationalActivities.filter(a => 
      getLocationType(a?.location) === 'park'
    );
    
    // Calcular beneficiarios únicos por modalidad
    const totalBeneficiaries = calculateUniqueAttendance(educationalActivities);
    const centerBeneficiaries = calculateUniqueAttendance(centerActivities);
    const parkBeneficiaries = calculateUniqueAttendance(parkActivities);
    
    // Calcular promedios
    return {
      total: educationalActivities.length > 0 ? Math.round(totalBeneficiaries / educationalActivities.length) : 0,
      center: centerActivities.length > 0 ? Math.round(centerBeneficiaries / centerActivities.length) : 0,
      park: parkActivities.length > 0 ? Math.round(parkBeneficiaries / parkActivities.length) : 0
    };
  };

  // Estadísticas de raciones/meriendas
  const nutritionStats = getNutritionCountByLocationType(activities);
  const averages = getAverageAttendanceByType();
  
  return (
    <Grid container spacing={3}>
      {/* Tarjeta Total Actividades */}
      <Grid item xs={12} sm={6} md={3}>
        <DashboardCard 
          title="Total Actividades"
          value={getTotalActivities()}
          icon={<EventNoteIcon sx={{ fontSize: 40 }} />}
          color="primary"
          subtitle="Excluye entregas de alimentos"
        />
      </Grid>
      
      {/* Tarjeta Total Beneficiarios - CORREGIDA */}
      <Grid item xs={12} sm={6} md={3}>
        <DashboardCard 
          title="Total Beneficiarios"
          value={getTotalBeneficiaries()}
          icon={<PeopleIcon sx={{ fontSize: 40 }} />}
          color="success"
          subtitle="Evita duplicados por jornada"
        />
      </Grid>
      
      {/* Tarjeta Ubicaciones Atendidas */}
      <Grid item xs={12} sm={6} md={3}>
        <DashboardCard 
          title="Ubicaciones Atendidas"
          value={getUniqueLocations()}
          icon={<LocationOnIcon sx={{ fontSize: 40 }} />}
          color="secondary"
        />
      </Grid>
      
      {/* Tarjeta Promedio Asistentes */}
      <Grid item xs={12} sm={6} md={3}>
        <DashboardCard 
          title="Promedio Asistentes"
          value={averages.total}
          subtitle="Por actividad real"
          icon={<AssignmentTurnedInIcon sx={{ fontSize: 40 }} />}
          color="warning"
        />
      </Grid>

      {/* Promedio asistentes por centro */}
      <Grid item xs={12} sm={6} md={3}>
        <DashboardCard 
          title="Promedio Asistentes"
          value={averages.center}
          subtitle="En Centros de Vida"
          icon={<AssignmentTurnedInIcon sx={{ fontSize: 40 }} />}
          color="info"
        />
      </Grid>

      {/* Promedio asistentes por parque/espacio */}
      <Grid item xs={12} sm={6} md={3}>
        <DashboardCard 
          title="Promedio Asistentes"
          value={averages.park}
          subtitle="En Parques/Espacios"
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