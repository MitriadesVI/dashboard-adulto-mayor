// src/components/contractor/dashboard/ActivitiesTab.jsx

import React, { useMemo } from 'react';
import { Grid, Card, CardHeader, CardContent, Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Divider, Chip, Alert } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import SchoolIcon from '@mui/icons-material/School';
import RestaurantIcon from '@mui/icons-material/Restaurant';

import { getActivityTypeLabel, getActivitySubtypeLabel, getNutritionStats } from '../../dashboard/common/helpers';

const PROGRESS_LABELS = { nutrition: 'Nutrición', physical: 'Física', psychosocial: 'Psicosocial' };

const ActivitiesTab = ({ activities, goals, user }) => {
  const contractor = user?.contractor;

  const actionStrategiesData = useMemo(() => {
    if (!activities.length) return [];
    
    const actionStrategies = [];
    
    // 1. ACCIÓN NUTRICIONAL
    const nutritionStats = getNutritionStats(activities);
    
    actionStrategies.push({
      action: getActivityTypeLabel('nutrition', contractor),
      strategies: [
        {
          name: getActivitySubtypeLabel('nutrition', 'workshop', contractor),
          count: nutritionStats.workshops,
          type: 'educational'
        },
        {
          name: 'Entrega de raciones alimenticias (Centros)',
          count: nutritionStats.centerRations,
          type: 'nutrition',
          isBeneficiaries: true
        },
        {
          name: 'Entrega de meriendas (Parques/Espacios)',
          count: nutritionStats.parkSnacks,
          type: 'nutrition',
          isBeneficiaries: true
        }
      ]
    });

    // 2. ACCIÓN SALUD FÍSICA
    const physicalActivities = activities.filter(a => 
      a.educationalActivity?.included && a.educationalActivity.type === 'physical'
    );
    
    const physicalStrategies = {};
    physicalActivities.forEach(activity => {
      const subtype = activity.educationalActivity.subtype;
      const label = getActivitySubtypeLabel('physical', subtype, activity.contractor);
      physicalStrategies[label] = (physicalStrategies[label] || 0) + 1;
    });

    actionStrategies.push({
      action: getActivityTypeLabel('physical', contractor),
      strategies: Object.entries(physicalStrategies).map(([name, count]) => ({
        name,
        count,
        type: 'educational'
      }))
    });

    // 3. ACCIÓN PSICOSOCIAL
    const psychosocialActivities = activities.filter(a => 
      a.educationalActivity?.included && a.educationalActivity.type === 'psychosocial'
    );
    
    const psychosocialStrategies = {};
    psychosocialActivities.forEach(activity => {
      const subtype = activity.educationalActivity.subtype;
      const label = getActivitySubtypeLabel('psychosocial', subtype, activity.contractor);
      psychosocialStrategies[label] = (psychosocialStrategies[label] || 0) + 1;
    });

    actionStrategies.push({
      action: getActivityTypeLabel('psychosocial', contractor),
      strategies: Object.entries(psychosocialStrategies).map(([name, count]) => ({
        name,
        count,
        type: 'educational'
      }))
    });

    return actionStrategies;
  }, [activities, contractor]);

  // Solo se grafican los componentes que tienen alguna meta cargada
  const progressData = useMemo(() => {
    if (!goals?.hasGoals) return [];
    return Object.entries(goals.averages || {})
      .filter(([key]) => Object.values(goals.goals?.[key] || {}).some(value => Number(value) > 0))
      .map(([key, value]) => ({
        name: PROGRESS_LABELS[key] || key,
        value: Math.min(100, Number(value) || 0)
      }));
  }, [goals]);

  return (
    <Box>
      <Grid container spacing={3}>
        {/* SECCIÓN: ACUMULADO POR ACCIONES */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Acumulado por Acciones y Estrategias" />
            <CardContent>
              {actionStrategiesData.length === 0 && (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                  No hay actividades aprobadas para los filtros seleccionados.
                </Typography>
              )}
              {actionStrategiesData.map((actionData, actionIndex) => (
                <Box key={actionIndex} sx={{ mb: 4 }}>
                  <Typography variant="h6" gutterBottom sx={{ 
                    fontWeight: 'bold', 
                    color: 'primary.main',
                    borderBottom: '2px solid',
                    borderColor: 'primary.main',
                    pb: 1
                  }}>
                    {actionData.action}
                  </Typography>
                  
                  <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Estrategia</strong></TableCell>
                          <TableCell align="center"><strong>Cantidad</strong></TableCell>
                          <TableCell align="center"><strong>Tipo</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {actionData.strategies.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} align="center">
                              <Typography variant="body2" color="text.secondary">
                                Sin actividades registradas en este periodo
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                        {actionData.strategies.map((strategy, strategyIndex) => (
                          <TableRow key={strategyIndex}>
                            <TableCell>{strategy.name}</TableCell>
                            <TableCell align="center">
                              <Typography variant="body2" fontWeight="bold">
                                {strategy.count}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              {strategy.type === 'educational' ? (
                                <Chip 
                                  icon={<SchoolIcon />} 
                                  label="Actividad" 
                                  color="primary" 
                                  size="small" 
                                />
                              ) : (
                                <Chip 
                                  icon={<RestaurantIcon />} 
                                  label={strategy.isBeneficiaries ? "Beneficiarios" : "Entregas"} 
                                  color="secondary" 
                                  size="small" 
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  {actionIndex < actionStrategiesData.length - 1 && (
                    <Divider sx={{ mt: 3, mb: 2, borderWidth: 2 }} />
                  )}
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* GRÁFICO DE PROGRESO (SI HAY METAS) */}
        {goals && !goals.hasGoals && (
          <Grid item xs={12}>
            <Alert severity="info">
              El distrito aún no ha cargado las metas de {goals.year}; el progreso por componente aparecerá cuando estén disponibles.
            </Alert>
          </Grid>
        )}

        {progressData.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardHeader
                title="Progreso de Metas por Componente"
                subheader={`Metas ${goals.year} · solo actividades aprobadas del año`}
              />
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                    <Legend />
                    <ReferenceLine y={100} stroke="red" strokeDasharray="3 3" />
                    <Bar dataKey="value" name="% Cumplimiento" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default ActivitiesTab;