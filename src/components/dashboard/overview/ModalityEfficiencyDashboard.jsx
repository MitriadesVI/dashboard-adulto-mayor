// src/components/dashboard/overview/ModalityEfficiencyDashboard.jsx

import React from 'react';
import { 
  Card, CardContent, CardHeader, Grid, Typography, Box, 
  LinearProgress, Chip, Divider
} from '@mui/material';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, PieChart, Pie, Cell
} from 'recharts';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import GroupIcon from '@mui/icons-material/Group';
import EventIcon from '@mui/icons-material/Event';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { getModalityEfficiencyMetrics } from '../common/helpers';

const ModalityEfficiencyDashboard = ({ activities, title = "Análisis de Eficiencia por Modalidad" }) => {
  const metrics = getModalityEfficiencyMetrics(activities);
  
  // Colores para las modalidades
  const COLORS = {
    center: '#2196F3',
    park: '#4CAF50'
  };

  // Preparar datos para gráfico de barras comparativo
  const comparisonData = [
    {
      name: 'Actividades/Día',
      'Centros Fijos': metrics.centers.activitiesPerDay || 0,
      'Parques/Espacios': metrics.parks.activitiesPerDay || 0
    },
    {
      name: 'Beneficiarios Promedio',
      'Centros Fijos': metrics.centers.averageBeneficiaries || 0,
      'Parques/Espacios': metrics.parks.averageBeneficiaries || 0
    },
    {
      name: 'Actividades/Ubicación',
      'Centros Fijos': metrics.centers.activitiesPerLocation || 0,
      'Parques/Espacios': metrics.parks.activitiesPerLocation || 0
    }
  ];

  // Datos para gráfico de distribución
  const distributionData = [
    { name: 'Centros Fijos', value: metrics.centers.totalActivities, fill: COLORS.center },
    { name: 'Parques/Espacios', value: metrics.parks.totalActivities, fill: COLORS.park }
  ];

  const getEfficiencyLevel = (efficiency) => {
    if (efficiency >= 2) return { level: 'Alta', color: 'success' };
    if (efficiency >= 1) return { level: 'Media', color: 'warning' };
    return { level: 'Baja', color: 'error' };
  };

  if (metrics.summary.totalEducational === 0) {
    return (
      <Card>
        <CardHeader title={title} />
        <CardContent>
          <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
            No hay actividades educativas para analizar la eficiencia por modalidad.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader 
        title={title}
        subheader="Análisis comparativo de rendimiento entre modalidades de atención"
      />
      <CardContent>
        {/* Métricas generales */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
              <EventIcon sx={{ fontSize: 40, mb: 1, color: 'primary.contrastText' }} />
              <Typography variant="h4" fontWeight="bold" color="primary.contrastText">
                {metrics.summary.totalEducational}
              </Typography>
              <Typography variant="body2" color="primary.contrastText">
                Actividades Educativas
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
              <LocationOnIcon sx={{ fontSize: 40, mb: 1, color: 'info.contrastText' }} />
              <Typography variant="h4" fontWeight="bold" color="info.contrastText">
                {metrics.centers.uniqueLocations + metrics.parks.uniqueLocations}
              </Typography>
              <Typography variant="body2" color="info.contrastText">
                Ubicaciones Activas
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
              <GroupIcon sx={{ fontSize: 40, mb: 1, color: 'success.contrastText' }} />
              <Typography variant="h4" fontWeight="bold" color="success.contrastText">
                {metrics.centers.totalBeneficiaries + metrics.parks.totalBeneficiaries}
              </Typography>
              <Typography variant="body2" color="success.contrastText">
                Total Beneficiarios
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
              <TrendingUpIcon sx={{ fontSize: 40, mb: 1, color: 'warning.contrastText' }} />
              <Typography variant="h4" fontWeight="bold" color="warning.contrastText">
                {Math.round((metrics.centers.efficiency + metrics.parks.efficiency) / 2 * 100) / 100}
              </Typography>
              <Typography variant="body2" color="warning.contrastText">
                Eficiencia Promedio
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Distribución por modalidad */}
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Distribución de Actividades
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Grid>

          {/* Comparativa de métricas */}
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Comparativa de Eficiencia
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    fontSize={10}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Centros Fijos" fill={COLORS.center} />
                  <Bar dataKey="Parques/Espacios" fill={COLORS.park} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Detalles por modalidad */}
        <Grid container spacing={3}>
          {/* Centros Fijos */}
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom sx={{ color: COLORS.center }}>
                📍 Centros Fijos
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Actividades</Typography>
                  <Typography variant="h6">{metrics.centers.totalActivities}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Ubicaciones</Typography>
                  <Typography variant="h6">{metrics.centers.uniqueLocations}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Días Operativos</Typography>
                  <Typography variant="h6">{metrics.centers.operatingDays}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Act./Día</Typography>
                  <Typography variant="h6">{metrics.centers.activitiesPerDay}</Typography>
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Eficiencia (esperado: 5 días/semana)
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(metrics.centers.efficiency * 20, 100)}
                    sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                  />
                  <Chip 
                    label={getEfficiencyLevel(metrics.centers.efficiency).level} 
                    color={getEfficiencyLevel(metrics.centers.efficiency).color}
                    size="small"
                  />
                </Box>
              </Box>

              {/* Distribución de jornadas */}
              {Object.keys(metrics.centers.scheduleDistribution).length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Distribución de Jornadas
                  </Typography>
                  {Object.entries(metrics.centers.scheduleDistribution).map(([schedule, count]) => (
                    <Box key={schedule} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption">{schedule}</Typography>
                      <Typography variant="caption" fontWeight="bold">{count}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Grid>

          {/* Parques/Espacios */}
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom sx={{ color: COLORS.park }}>
                🏞️ Parques/Espacios
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Actividades</Typography>
                  <Typography variant="h6">{metrics.parks.totalActivities}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Ubicaciones</Typography>
                  <Typography variant="h6">{metrics.parks.uniqueLocations}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Días Operativos</Typography>
                  <Typography variant="h6">{metrics.parks.operatingDays}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Act./Ubicación</Typography>
                  <Typography variant="h6">{metrics.parks.activitiesPerLocation}</Typography>
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Intensidad de Uso (act./ubicación)
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(metrics.parks.activitiesPerLocation * 10, 100)}
                    sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                  />
                  <Chip 
                    label={getEfficiencyLevel(metrics.parks.activitiesPerLocation).level} 
                    color={getEfficiencyLevel(metrics.parks.activitiesPerLocation).color}
                    size="small"
                  />
                </Box>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Promedio de beneficiarios: <strong>{metrics.parks.averageBeneficiaries}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total beneficiarios: <strong>{metrics.parks.totalBeneficiaries}</strong>
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default ModalityEfficiencyDashboard;