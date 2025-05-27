import React, { useState } from 'react';
import {
  Box, Grid, Paper, Typography, ToggleButton, ToggleButtonGroup,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Alert, Card, CardContent
} from '@mui/material';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

// Colores específicos por componente
const COMPONENT_COLORS = {
  'Nutricional': '#4CAF50',
  'Salud Física': '#2196F3',
  'Psicosocial': '#9C27B0'
};

const STRATEGY_COLORS = [
  '#81C784', '#64B5F6', '#BA68C8', '#FFB74D', '#FF8A65', 
  '#90A4AE', '#A5D6A7', '#FFCC02', '#FFAB91', '#CE93D8'
];

const ComponentsDistributionChart = ({ data, components }) => {
  const [viewMode, setViewMode] = useState('pie');

  // ========== FUNCIONES AUXILIARES AL INICIO ==========
  const formatComponentName = (component) => {
    const names = {
      nutrition: 'Nutricional',
      physical: 'Salud Física',
      psychosocial: 'Psicosocial'
    };
    return names[component] || component;
  };

  const getTotalSessions = () => {
    return data?.strategies?.reduce((sum, s) => sum + s.count, 0) || 0;
  };

  // Tooltip personalizado
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Paper sx={{ p: 1.5, maxWidth: 300, boxShadow: 3 }}>
          <Typography variant="subtitle2" fontWeight="bold">
            {data.fullName || data.name}
          </Typography>
          {data.component && (
            <Typography variant="body2" color="text.secondary">
              Componente: {formatComponentName(data.component)}
            </Typography>
          )}
          <Typography variant="body2">
            <strong>{data.count || data.value} sesiones educativas</strong> ({data.percentage}%)
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  // ========== VALIDACIÓN DE DATOS ==========
  if (!data || !data.strategies || data.strategies.length === 0) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info">
            <Typography variant="h6" gutterBottom>Sin datos de estrategias educativas</Typography>
            <Typography variant="body2">
              No se encontraron actividades educativas registradas para esta ubicación en el período seleccionado.
              Las entregas de alimentos NO se cuentan como actividades educativas.
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // ========== PREPARACIÓN DE DATOS ==========
  const pieData = data.components.map((comp, index) => ({
    name: comp.name,
    value: parseInt(comp.count),
    percentage: comp.percentage,
    color: COMPONENT_COLORS[comp.name] || STRATEGY_COLORS[index % STRATEGY_COLORS.length]
  }));

  const barData = data.strategies.slice(0, 10).map((strategy, index) => ({
    strategy: strategy.strategy.length > 20 ? 
      strategy.strategy.substring(0, 20) + '...' : strategy.strategy,
    fullName: strategy.strategy,
    component: strategy.component,
    count: strategy.count,
    percentage: strategy.percentage,
    color: COMPONENT_COLORS[formatComponentName(strategy.component)] || STRATEGY_COLORS[index % STRATEGY_COLORS.length]
  }));

  return (
    <Box>
      {/* Selector de vista */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, newMode) => newMode && setViewMode(newMode)}
          size="small"
        >
          <ToggleButton value="pie">Por Componente</ToggleButton>
          <ToggleButton value="bar">Por Estrategia</ToggleButton>
          <ToggleButton value="table">Detalle Completo</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Vista de Pie Chart - Distribución por Componente */}
      {viewMode === 'pie' && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2, height: 400 }}>
              <Typography variant="h6" gutterBottom align="center">
                Distribución de Actividades Educativas por Componente
              </Typography>
              <ResponsiveContainer width="100%" height="85%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, height: 400 }}>
              <Typography variant="h6" gutterBottom>Resumen</Typography>
              {pieData.map((comp, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      backgroundColor: comp.color,
                      borderRadius: '4px',
                      mr: 2
                    }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" fontWeight="medium">
                      {comp.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {comp.value} sesiones ({comp.percentage}%)
                    </Typography>
                  </Box>
                </Box>
              ))}
              <Box sx={{ mt: 3, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                <Typography variant="h6" color="primary.contrastText" align="center">
                  {getTotalSessions()}
                </Typography>
                <Typography variant="caption" color="primary.contrastText" align="center" display="block">
                  Total Sesiones Educativas
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Vista de Gráfico de Barras - Por Estrategia */}
      {viewMode === 'bar' && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom align="center">
            Top 10 Estrategias Educativas Más Utilizadas
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
            Solo se muestran actividades educativas reales (NO entregas de alimentos)
          </Typography>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart 
              data={barData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="strategy" 
                angle={-45}
                textAnchor="end"
                height={120}
                interval={0}
                fontSize={11}
              />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]}>
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      )}

      {/* Vista de Tabla Detallada */}
      {viewMode === 'table' && (
        <Paper>
          <TableContainer sx={{ maxHeight: 500 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Componente</strong></TableCell>
                  <TableCell><strong>Estrategia Educativa</strong></TableCell>
                  <TableCell align="center"><strong>Sesiones</strong></TableCell>
                  <TableCell align="center"><strong>%</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.strategies.map((strategy, index) => (
                  <TableRow key={index} hover>
                    <TableCell>
                      <Chip 
                        label={formatComponentName(strategy.component)}
                        size="small"
                        sx={{ 
                          backgroundColor: COMPONENT_COLORS[formatComponentName(strategy.component)] || '#757575',
                          color: 'white',
                          fontWeight: 'bold',
                          minWidth: '100px'
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {strategy.strategy}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight="medium">
                        {strategy.count}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">
                        {strategy.percentage}%
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Panel de métricas resumidas */}
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light' }}>
            <Typography variant="h6" color="success.contrastText">
              {data.strategies.length}
            </Typography>
            <Typography variant="caption" color="success.contrastText">
              Estrategias Diferentes
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light' }}>
            <Typography variant="h6" color="info.contrastText">
              {data.components.length}
            </Typography>
            <Typography variant="caption" color="info.contrastText">
              Componentes Activos
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light' }}>
            <Typography variant="h6" color="primary.contrastText">
              {getTotalSessions()}
            </Typography>
            <Typography variant="caption" color="primary.contrastText">
              Total Sesiones
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'secondary.light' }}>
            <Typography variant="h6" color="secondary.contrastText">
              {data.strategies.length > 0 ? Math.round(getTotalSessions() / data.strategies.length) : 0}
            </Typography>
            <Typography variant="caption" color="secondary.contrastText">
              Promedio por Estrategia
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Nota aclaratoria */}
      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="body2">
          <strong>Importante:</strong> Este gráfico muestra únicamente las actividades educativas reales 
          (talleres, charlas, actividades físicas, etc.). Las entregas de raciones y meriendas 
          son beneficios alimentarios y NO se cuentan como actividades educativas.
        </Typography>
      </Alert>
    </Box>
  );
};

export default ComponentsDistributionChart;