import React from 'react';
import { Grid, Paper, Typography } from '@mui/material';

const LocationMetricsPanel = ({ summary, selectedLocationInfo }) => {
  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={6} sm={4} md={2}>
        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <Typography variant="h4">{summary.totalActivities}</Typography>
          <Typography variant="subtitle2">Actividades</Typography>
        </Paper>
      </Grid>
      <Grid item xs={6} sm={4} md={2}>
        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light', color: 'warning.contrastText' }}>
          <Typography variant="h4">{summary.totalRations}</Typography>
          <Typography variant="subtitle2">Raciones</Typography>
        </Paper>
      </Grid>
      <Grid item xs={6} sm={4} md={2}>
        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.main', color: 'info.contrastText' }}>
          <Typography variant="h4">{summary.averageAttendance}</Typography>
          <Typography variant="subtitle2">Prom. Asistencia</Typography>
        </Paper>
      </Grid>
      <Grid item xs={6} sm={4} md={2}>
        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
          <Typography variant="h4">{summary.uniqueServiceDays}</Typography>
          <Typography variant="subtitle2">Días de Servicio</Typography>
        </Paper>
      </Grid>
      {summary.capacity > 0 && (
        <Grid item xs={6} sm={4} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'secondary.main', color: 'secondary.contrastText' }}>
            <Typography variant="h4">{summary.utilizationRate}%</Typography>
            <Typography variant="subtitle2">Utilización</Typography>
            <Typography variant="caption">({summary.averageAttendance}/{summary.capacity})</Typography>
          </Paper>
        </Grid>
      )}
      {selectedLocationInfo?.type?.toLowerCase() === 'center' && summary.avgJ1 > 0 && (
        <Grid item xs={6} sm={4} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'secondary.light', color: 'text.primary' }}>
            <Typography variant="h4">{summary.avgJ1}</Typography>
            <Typography variant="subtitle2">Prom. J1</Typography>
          </Paper>
        </Grid>
      )}
      {selectedLocationInfo?.type?.toLowerCase() === 'center' && summary.avgJ2 > 0 && (
        <Grid item xs={6} sm={4} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'secondary.light', color: 'text.primary' }}>
            <Typography variant="h4">{summary.avgJ2}</Typography>
            <Typography variant="subtitle2">Prom. J2</Typography>
          </Paper>
        </Grid>
      )}
    </Grid>
  );
};

export default LocationMetricsPanel;