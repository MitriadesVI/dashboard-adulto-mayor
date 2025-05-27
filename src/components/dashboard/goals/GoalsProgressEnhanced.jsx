// src/components/dashboard/goals/GoalsProgressEnhanced.jsx - NUEVO COMPONENTE COMPLETO

import React, { useState, useEffect } from 'react';
import { 
  Card, CardContent, CardHeader, Grid, Typography, Box, Paper, 
  Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, LinearProgress, Alert, IconButton
} from '@mui/material';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, PieChart, Pie, Cell
} from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const GoalsProgressEnhanced = ({ goals, contractor, onRefresh }) => {
  const [processedData, setProcessedData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (goals && goals.progress && goals.counts && goals.goals) {
      setProcessedData(processGoalsData(goals, contractor));
    }
  }, [goals, contractor]);

  // Procesar datos para visualización
  const processGoalsData = (goalsData, contractorName) => {
    const { progress, counts, goals: targets } = goalsData;
    
    // Mapear nombres según contratista
    const getActionName = (type) => {
      const actionNames = {
        nutrition: contractorName === 'CUC' ? 'Educación Nutricional' : 'Salud Nutricional',
        physical: contractorName === 'CUC' ? 'Educación en Salud Física' : 'Salud Física', 
        psychosocial: contractorName === 'CUC' ? 'Educación Psicosocial' : 'Salud Psicosocial'
      };
      return actionNames[type] || type;
    };

    // Crear estructura de datos para estrategias
    const strategies = [];
    
    // Educación/Salud Nutricional
    if (progress.nutrition && targets.nutrition) {
      // Talleres educativos
      if (targets.nutrition.workshops > 0) {
        strategies.push({
          action: getActionName('nutrition'),
          strategy: 'Talleres educativos/Jornadas de promoción',
          actual: counts.nutrition.workshops || 0,
          target: targets.nutrition.workshops,
          percentage: Math.round(progress.nutrition.workshops * 100) / 100,
          type: 'educational',
          category: 'nutrition'
        });
      }
      
      // Raciones (solo mostrar, sin meta)
      const totalRations = (counts.nutrition?.centerRations || 0) + (counts.nutrition?.parkSnacks || 0);
      if (totalRations > 0) {
        strategies.push({
          action: getActionName('nutrition'),
          strategy: 'Entregas nutricionales (raciones/meriendas)',
          actual: totalRations,
          target: 'Bajo demanda',
          percentage: null,
          type: 'nutrition_delivery',
          category: 'nutrition',
          details: {
            centerRations: counts.nutrition?.centerRations || 0,
            parkSnacks: counts.nutrition?.parkSnacks || 0
          }
        });
      }
    }
    
    // Educación/Salud Física
    if (progress.physical && targets.physical) {
      const physicalStrategies = [
        { key: 'preventionTalks', name: 'Charlas de prevención de enfermedad' },
        { key: 'therapeuticActivity', name: 'Actividad física terapéutica' },
        { key: 'rumbaTherapy', name: 'Rumbaterapia y ejercicios dirigidos' },
        { key: 'walkingClub', name: 'Club de caminantes' }
      ];
      
      physicalStrategies.forEach(({ key, name }) => {
        if (targets.physical[key] > 0) {
          strategies.push({
            action: getActionName('physical'),
            strategy: name,
            actual: counts.physical?.[key] || 0,
            target: targets.physical[key],
            percentage: Math.round(progress.physical[key] * 100) / 100,
            type: 'educational',
            category: 'physical'
          });
        }
      });
    }
    
    // Educación/Salud Psicosocial
    if (progress.psychosocial && targets.psychosocial) {
      const psychosocialStrategies = [
        { key: 'mentalHealth', name: 'Jornadas/talleres en salud mental' },
        { key: 'cognitive', name: 'Jornadas/talleres cognitivos' },
        { key: 'abusePreventionWorkshops', name: 'Talleres en prevención al maltrato' },
        { key: 'artsAndCrafts', name: 'Talleres en artes y oficios' },
        { key: 'intergenerational', name: 'Encuentros intergeneracionales' }
      ];
      
      psychosocialStrategies.forEach(({ key, name }) => {
        if (targets.psychosocial[key] > 0) {
          strategies.push({
            action: getActionName('psychosocial'),
            strategy: name,
            actual: counts.psychosocial?.[key] || 0,
            target: targets.psychosocial[key],
            percentage: Math.round(progress.psychosocial[key] * 100) / 100,
            type: 'educational',
            category: 'psychosocial'
          });
        }
      });
    }
    
    // Calcular métricas de rendimiento
    const educationalStrategies = strategies.filter(s => s.type === 'educational' && s.percentage !== null);
    const bestPerforming = educationalStrategies.length > 0 ? 
      educationalStrategies.reduce((best, current) => 
        current.percentage > best.percentage ? current : best
      ) : null;
    
    const worstPerforming = educationalStrategies.length > 0 ? 
      educationalStrategies.reduce((worst, current) => 
        current.percentage < worst.percentage ? current : worst
      ) : null;
    
    const averagePerformance = educationalStrategies.length > 0 ? 
      educationalStrategies.reduce((sum, s) => sum + s.percentage, 0) / educationalStrategies.length : 0;
    
    // Agrupar por acción para gráfico
    const actionGroups = {};
    strategies.forEach(strategy => {
      if (!actionGroups[strategy.action]) {
        actionGroups[strategy.action] = [];
      }
      actionGroups[strategy.action].push(strategy);
    });
    
    return {
      strategies,
      actionGroups,
      metrics: {
        best: bestPerforming,
        worst: worstPerforming,
        average: Math.round(averagePerformance * 100) / 100,
        total: educationalStrategies.length
      }
    };
  };

  // Función para obtener color según rendimiento
  const getPerformanceColor = (percentage) => {
    if (percentage === null) return '#757575'; // Gris para sin meta
    if (percentage >= 75) return '#4CAF50'; // Verde
    if (percentage >= 50) return '#FF9800'; // Naranja  
    if (percentage >= 25) return '#FF5722'; // Rojo-naranja
    return '#F44336'; // Rojo
  };

  // Función para obtener nivel de alerta
  const getAlertLevel = (percentage) => {
    if (percentage === null) return { level: 'info', text: 'Sin meta' };
    if (percentage >= 75) return { level: 'success', text: 'Excelente' };
    if (percentage >= 50) return { level: 'warning', text: 'Bueno' };
    if (percentage >= 25) return { level: 'error', text: 'Bajo' };
    return { level: 'error', text: 'Crítico' };
  };

  // Preparar datos para gráfico de barras
  const prepareChartData = () => {
    if (!processedData) return [];
    
    return processedData.strategies
      .filter(s => s.type === 'educational')
      .map(strategy => ({
        name: strategy.strategy.length > 25 ? 
          strategy.strategy.substring(0, 25) + '...' : 
          strategy.strategy,
        fullName: strategy.strategy,
        actual: strategy.actual,
        target: strategy.target,
        percentage: strategy.percentage,
        fill: getPerformanceColor(strategy.percentage)
      }));
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
    } finally {
      setLoading(false);
    }
  };

  if (!processedData) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" gutterBottom>
              No hay datos de progreso disponibles
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Seleccione un contratista y asegúrese de que existan metas configuradas
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const chartData = prepareChartData();

  return (
    <Box>
      {/* Resumen ejecutivo */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUpIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Mejor Rendimiento
              </Typography>
              {processedData.metrics.best ? (
                <>
                  <Typography variant="h4" fontWeight="bold">
                    {processedData.metrics.best.percentage}%
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {processedData.metrics.best.strategy}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2">No disponible</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingDownIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Menor Rendimiento
              </Typography>
              {processedData.metrics.worst ? (
                <>
                  <Typography variant="h4" fontWeight="bold">
                    {processedData.metrics.worst.percentage}%
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {processedData.metrics.worst.strategy}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2">No disponible</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <CheckCircleIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Promedio General
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {processedData.metrics.average}%
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                {processedData.metrics.total} estrategias
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Button 
                variant="contained" 
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                disabled={loading}
                fullWidth
              >
                {loading ? 'Actualizando...' : 'Actualizar Datos'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Gráfico de barras mejorado */}
      <Card sx={{ mb: 3 }}>
        <CardHeader 
          title="Progreso por Estrategia" 
          subheader={`${contractor} - Cumplimiento de metas por estrategia`}
        />
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  fontSize={12}
                />
                <YAxis 
                  label={{ value: 'Porcentaje (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value, name) => [
                    `${value}%`, 
                    'Cumplimiento'
                  ]}
                  labelFormatter={(label, payload) => {
                    if (payload && payload.length > 0) {
                      const data = payload[0].payload;
                      return `${data.fullName}: ${data.actual}/${data.target} (${data.percentage}%)`;
                    }
                    return label;
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="percentage" 
                  name="% Cumplimiento"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Typography variant="body1" color="text.secondary" textAlign="center">
              No hay datos disponibles para el gráfico
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Tabla detallada */}
      <Card>
        <CardHeader title="Detalle por Estrategia" />
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Acción</strong></TableCell>
                  <TableCell><strong>Estrategia</strong></TableCell>
                  <TableCell align="right"><strong>Actual</strong></TableCell>
                  <TableCell align="right"><strong>Meta</strong></TableCell>
                  <TableCell align="right"><strong>%</strong></TableCell>
                  <TableCell align="center"><strong>Estado</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {processedData.strategies.map((strategy, index) => {
                  const alert = getAlertLevel(strategy.percentage);
                  return (
                    <TableRow key={index}>
                      <TableCell>{strategy.action}</TableCell>
                      <TableCell>
                        {strategy.strategy}
                        {strategy.details && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            Centros: {strategy.details.centerRations} | Parques: {strategy.details.parkSnacks}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="h6" fontWeight="bold">
                          {strategy.actual}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {strategy.target}
                      </TableCell>
                      <TableCell align="right">
                        {strategy.percentage !== null ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="h6" fontWeight="bold">
                              {strategy.percentage}%
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(strategy.percentage, 100)}
                              sx={{ 
                                width: 50, 
                                height: 8, 
                                borderRadius: 4,
                                bgcolor: 'grey.300',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: getPerformanceColor(strategy.percentage)
                                }
                              }}
                            />
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            N/A
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={alert.text}
                          color={alert.level}
                          size="small"
                          icon={alert.level === 'success' ? <CheckCircleIcon /> : 
                                alert.level === 'error' ? <WarningIcon /> : undefined}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default GoalsProgressEnhanced;