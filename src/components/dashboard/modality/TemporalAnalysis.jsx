// src/components/dashboard/modality/TemporalAnalysis.jsx

import React from 'react';
import { 
  Card, CardContent, CardHeader, Grid, Typography, Box, Chip, LinearProgress // <-- LinearProgress AÑADIDO AQUÍ
} from '@mui/material';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, LineChart, Line
} from 'recharts';
import { getTemporalAnalysisByModality } from '../common/helpers';

const TemporalAnalysis = ({ activities, title = "Análisis Temporal por Modalidad" }) => {
  const temporalData = getTemporalAnalysisByModality(activities);

  // Preparar datos para gráfico por día de la semana
  const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const weeklyData = dayNames.map(day => ({
    day,
    'Centros Fijos': temporalData.byDay.center[day]?.count || 0,
    'Parques/Espacios': temporalData.byDay.park[day]?.count || 0,
    'Beneficiarios Centros': temporalData.byDay.center[day]?.beneficiaries || 0,
    'Beneficiarios Parques': temporalData.byDay.park[day]?.beneficiaries || 0
  }));

  // Preparar datos para tendencia semanal
  const weeklyTrend = Object.entries(temporalData.byWeek)
    .sort(([weekA], [weekB]) => weekA.localeCompare(weekB)) // '2026-W05' ordena cronológicamente
    .map(([week, data]) => ({
      week,
      'Centros': data.center,
      'Parques': data.park,
      'Total': data.total
    }));

  // Calcular insights
  const insights = {
    peakDay: weeklyData.reduce((peak, current) => 
      (current['Centros Fijos'] + current['Parques/Espacios']) > 
      (peak['Centros Fijos'] + peak['Parques/Espacios']) ? current : peak
    ),
    centerMostActiveDay: Object.entries(temporalData.byDay.center)
      .reduce((max, [day, data]) => data.count > (max[1]?.count || 0) ? [day, data] : max, ['', { count: 0 }]),
    parkMostActiveDay: Object.entries(temporalData.byDay.park)
      .reduce((max, [day, data]) => data.count > (max[1]?.count || 0) ? [day, data] : max, ['', { count: 0 }])
  };

  const COLORS = {
    center: '#2196F3',
    park: '#4CAF50'
  };

  if (weeklyData.every(d => d['Centros Fijos'] === 0 && d['Parques/Espacios'] === 0)) {
    return (
      <Card>
        <CardHeader title={title} />
        <CardContent>
          <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
            No hay suficientes datos temporales para realizar el análisis.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader 
        title={title}
        subheader="Patrones de actividad por día de la semana y tendencias temporales"
      />
      <CardContent>
        {/* Insights rápidos */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
              <Typography variant="h6" color="primary.contrastText">
                Día Más Activo
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="primary.contrastText">
                {insights.peakDay.day}
              </Typography>
              <Typography variant="body2" color="primary.contrastText">
                {insights.peakDay['Centros Fijos'] + insights.peakDay['Parques/Espacios']} actividades
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
              <Typography variant="h6" color="info.contrastText">
                Centros Más Activos
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="info.contrastText">
                {insights.centerMostActiveDay[0]}
              </Typography>
              <Typography variant="body2" color="info.contrastText">
                {insights.centerMostActiveDay[1].count} actividades
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
              <Typography variant="h6" color="success.contrastText">
                Parques Más Activos
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="success.contrastText">
                {insights.parkMostActiveDay[0]}
              </Typography>
              <Typography variant="body2" color="success.contrastText">
                {insights.parkMostActiveDay[1].count} actividades
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Gráfico por día de la semana */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Actividades por Día de la Semana
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Centros Fijos" fill={COLORS.center} />
              <Bar dataKey="Parques/Espacios" fill={COLORS.park} />
            </BarChart>
          </ResponsiveContainer>
        </Box>

        {/* Tendencia semanal */}
        {weeklyTrend.length > 1 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Tendencia Semanal
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Centros" stroke={COLORS.center} strokeWidth={2} />
                <Line type="monotone" dataKey="Parques" stroke={COLORS.park} strokeWidth={2} />
                <Line type="monotone" dataKey="Total" stroke="#FF9800" strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}

        {/* Análisis de patrones */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Análisis de Patrones
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                🏢 Centros Fijos - Patrón Semanal
              </Typography>
              {dayNames.map(day => {
               const dayData = temporalData.byDay.center[day];
               const intensity = dayData ? dayData.count : 0;
               const isWeekend = day === 'Sábado' || day === 'Domingo';
               
               return (
                 <Box key={day} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                   <Typography variant="body2" sx={{ minWidth: 80 }}>
                     {day}:
                   </Typography>
                   <Box sx={{ flexGrow: 1, mx: 2 }}>
                     <LinearProgress
                       variant="determinate"
                       value={(intensity / Math.max(1, ...weeklyData.map(d => d['Centros Fijos']))) * 100} // Evitar división por cero si max es 0
                       sx={{ 
                         height: 8, 
                         borderRadius: 4,
                         bgcolor: isWeekend ? 'grey.200' : 'primary.100',
                         '& .MuiLinearProgress-bar': {
                           bgcolor: isWeekend ? 'grey.500' : COLORS.center
                         }
                       }}
                     />
                   </Box>
                   <Typography variant="body2" sx={{ minWidth: 40, textAlign: 'right' }}>
                     {intensity}
                   </Typography>
                   {isWeekend && intensity > 0 && (
                     <Chip label="Fin de semana" size="small" sx={{ ml: 1 }} />
                   )}
                 </Box>
               );
              })}
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                🏞️ Parques/Espacios - Patrón Semanal
              </Typography>
              {dayNames.map(day => {
               const dayData = temporalData.byDay.park[day];
               const intensity = dayData ? dayData.count : 0;
               const isWeekend = day === 'Sábado' || day === 'Domingo';
               
               return (
                 <Box key={day} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                   <Typography variant="body2" sx={{ minWidth: 80 }}>
                     {day}:
                   </Typography>
                   <Box sx={{ flexGrow: 1, mx: 2 }}>
                     <LinearProgress
                       variant="determinate"
                       value={(intensity / Math.max(1, ...weeklyData.map(d => d['Parques/Espacios']))) * 100} // Evitar división por cero si max es 0
                       sx={{ 
                         height: 8, 
                         borderRadius: 4,
                         bgcolor: isWeekend ? 'grey.200' : 'success.100',
                         '& .MuiLinearProgress-bar': {
                           bgcolor: isWeekend ? 'grey.500' : COLORS.park
                         }
                       }}
                     />
                   </Box>
                   <Typography variant="body2" sx={{ minWidth: 40, textAlign: 'right' }}>
                     {intensity}
                   </Typography>
                   {isWeekend && intensity > 0 && (
                     <Chip label="Fin de semana" size="small" sx={{ ml: 1 }} />
                   )}
                 </Box>
               );
              })}
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TemporalAnalysis;