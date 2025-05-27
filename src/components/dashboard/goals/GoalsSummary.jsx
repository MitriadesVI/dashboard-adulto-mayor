// src/components/dashboard/goals/GoalsSummary.jsx

import React from 'react';
import { Card, CardContent, CardHeader, Grid, Typography, Box, Chip } from '@mui/material';
import { 
  ResponsiveContainer, BarChart, Bar, CartesianGrid, 
  XAxis, YAxis, Tooltip, Legend, ReferenceLine
} from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AssessmentIcon from '@mui/icons-material/Assessment';

const GoalsSummary = ({ goals, contractor, title }) => {
  // Preparar datos para el gráfico
  const prepareAverageProgressChartData = () => {
    if (!goals || !goals.averages) return [];
    
    const getActionName = (type) => {
      const actionNames = {
        nutrition: contractor === 'CUC' ? 'Educación Nutricional' : 'Salud Nutricional',
        physical: contractor === 'CUC' ? 'Educación en Salud Física' : 'Salud Física', 
        psychosocial: contractor === 'CUC' ? 'Educación Psicosocial' : 'Salud Psicosocial'
      };
      return actionNames[type] || type;
    };

    const getColorByPercentage = (percentage) => {
      if (percentage >= 75) return '#4CAF50'; // Verde
      if (percentage >= 50) return '#FF9800'; // Naranja
      if (percentage >= 25) return '#FF5722'; // Rojo-naranja
      return '#F44336'; // Rojo
    };

    return [
      { 
        name: getActionName('nutrition'), 
        value: Math.min(100, Math.round(goals.averages.nutrition * 100) / 100), 
        fill: getColorByPercentage(goals.averages.nutrition),
        type: 'nutrition'
      },
      { 
        name: getActionName('physical'), 
        value: Math.min(100, Math.round(goals.averages.physical * 100) / 100), 
        fill: getColorByPercentage(goals.averages.physical),
        type: 'physical'
      },
      { 
        name: getActionName('psychosocial'), 
        value: Math.min(100, Math.round(goals.averages.psychosocial * 100) / 100), 
        fill: getColorByPercentage(goals.averages.psychosocial),
        type: 'psychosocial'
      }
    ];
  };

  const data = prepareAverageProgressChartData();
  const displayTitle = title || `Resumen por Acción - ${contractor}`;
  
  // Calcular métricas generales
  const overallAverage = data.length > 0 ? 
    Math.round(data.reduce((sum, item) => sum + item.value, 0) / data.length) : 0;
  
  const bestAction = data.length > 0 ? 
    data.reduce((best, current) => current.value > best.value ? current : best) : null;
  
  const worstAction = data.length > 0 ? 
    data.reduce((worst, current) => current.value < worst.value ? current : worst) : null;

  const getStatusChip = (percentage) => {
    if (percentage >= 75) return { label: 'Excelente', color: 'success' };
    if (percentage >= 50) return { label: 'Bueno', color: 'warning' };
    if (percentage >= 25) return { label: 'Bajo', color: 'error' };
    return { label: 'Crítico', color: 'error' };
  };

  if (!data.length) {
    return (
      <Card>
        <CardHeader title={displayTitle} />
        <CardContent>
          <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
            No hay datos de progreso disponibles para mostrar el resumen por acción.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader 
        title={displayTitle}
        subheader="Promedio de cumplimiento por tipo de acción"
      />
      <CardContent>
        {/* Métricas superiores */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
              <AssessmentIcon sx={{ fontSize: 30, mb: 1, color: 'primary.contrastText' }} />
              <Typography variant="h4" fontWeight="bold" color="primary.contrastText">
                {overallAverage}%
              </Typography>
              <Typography variant="body2" color="primary.contrastText">
                Promedio General
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
              <TrendingUpIcon sx={{ fontSize: 30, mb: 1, color: 'success.contrastText' }} />
              <Typography variant="h6" fontWeight="bold" color="success.contrastText">
                {bestAction ? bestAction.name : 'N/A'}
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="success.contrastText">
                {bestAction ? bestAction.value : 0}%
              </Typography>
              <Typography variant="body2" color="success.contrastText">
                Mejor Acción
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
              <TrendingDownIcon sx={{ fontSize: 30, mb: 1, color: 'error.contrastText' }} />
              <Typography variant="h6" fontWeight="bold" color="error.contrastText">
                {worstAction ? worstAction.name : 'N/A'}
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="error.contrastText">
                {worstAction ? worstAction.value : 0}%
              </Typography>
              <Typography variant="body2" color="error.contrastText">
                Acción a Mejorar
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Gráfico de barras */}
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-15}
              textAnchor="end"
              height={60}
              fontSize={12}
            />
            <YAxis 
              domain={[0, 100]}
              label={{ value: 'Porcentaje (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={(value) => [`${value}%`, 'Cumplimiento']}
              labelStyle={{ color: '#000' }}
            />
            <Legend />
            <ReferenceLine y={100} stroke="red" strokeDasharray="3 3" />
            <ReferenceLine y={75} stroke="green" strokeDasharray="2 2" opacity={0.5} />
            <ReferenceLine y={50} stroke="orange" strokeDasharray="2 2" opacity={0.5} />
            <ReferenceLine y={25} stroke="red" strokeDasharray="2 2" opacity={0.5} />
            <Bar 
              dataKey="value" 
              name="% Cumplimiento"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Resumen por acción */}
        <Grid container spacing={2} sx={{ mt: 2 }}>
          {data.map((item, index) => {
            const status = getStatusChip(item.value);
            return (
              <Grid item xs={12} sm={4} key={index}>
                <Box sx={{ 
                  p: 2, 
                  border: 1, 
                  borderColor: 'divider', 
                  borderRadius: 1,
                  textAlign: 'center'
                }}>
                  <Typography variant="subtitle1" gutterBottom>
                    {item.name}
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" sx={{ color: item.fill, mb: 1 }}>
                    {item.value}%
                  </Typography>
                  <Chip 
                    label={status.label} 
                    color={status.color} 
                    size="small"
                  />
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default GoalsSummary;