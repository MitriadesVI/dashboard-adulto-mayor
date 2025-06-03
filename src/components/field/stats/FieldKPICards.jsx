// src/components/field/stats/FieldKPICards.jsx
import React from 'react';
import { Grid } from '@mui/material';
import DashboardCard from '../../dashboard/common/DashboardCard'; // Reutilizamos el DashboardCard genérico
import EventNoteIcon from '@mui/icons-material/EventNote';
import PeopleIcon from '@mui/icons-material/People';
import BarChartIcon from '@mui/icons-material/BarChart'; // Para promedio

const FieldKPICards = ({ kpiData }) => {
  if (!kpiData) {
    return null; // O un loader/mensaje si se prefiere
  }

  const {
    totalEducationalActivities,
    uniqueBeneficiaries,
    avgBeneficiariesPerActivity,
  } = kpiData;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={4}>
        <DashboardCard
          title="Total Actividades Educativas"
          value={totalEducationalActivities !== undefined ? totalEducationalActivities : 'N/A'}
          icon={<EventNoteIcon sx={{ fontSize: 40 }} />}
          color="primary"
          subtitle="En el período seleccionado"
        />
      </Grid>

      <Grid item xs={12} sm={6} md={4}>
        <DashboardCard
          title="Beneficiarios Únicos (Educativas)"
          value={uniqueBeneficiaries !== undefined ? uniqueBeneficiaries : 'N/A'}
          icon={<PeopleIcon sx={{ fontSize: 40 }} />}
          color="success"
          subtitle="Conteo único por jornada"
        />
      </Grid>

      <Grid item xs={12} sm={6} md={4}>
        <DashboardCard
          title="Promedio Beneficiarios / Actividad"
          value={avgBeneficiariesPerActivity !== undefined ? avgBeneficiariesPerActivity : 'N/A'}
          icon={<BarChartIcon sx={{ fontSize: 40 }} />}
          color="warning"
          subtitle="Para actividades educativas"
        />
      </Grid>
    </Grid>
  );
};

export default FieldKPICards;