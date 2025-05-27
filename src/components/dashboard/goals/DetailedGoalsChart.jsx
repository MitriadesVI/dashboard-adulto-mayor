// src/components/dashboard/goals/DetailedGoalsChart.jsx

import React from 'react';
import { Card, CardContent, CardHeader, Typography, Box, Divider } from '@mui/material';
import { 
  ResponsiveContainer, BarChart, Bar, CartesianGrid, 
  XAxis, YAxis, Tooltip, Legend, ReferenceLine 
} from 'recharts';

const DetailedGoalsChart = ({ goals, contractor, title = "Progreso Detallado por Estrategia" }) => {
  
  const prepareProgressChartData = () => {
    if (!goals || !goals.progress || !goals.counts || !goals.goals) {
      console.log('Datos incompletos para DetailedGoalsChart:', goals);
      return [];
    }
    
    const progressData = [];
    const { progress, counts, goals: targets } = goals;
    
    // Función para obtener nombres de acción
    const getActionName = (type) => {
      const actionNames = {
        nutrition: contractor === 'CUC' ? 'Educación Nutricional' : 'Salud Nutricional',
        physical: contractor === 'CUC' ? 'Educación en Salud Física' : 'Salud Física', 
        psychosocial: contractor === 'CUC' ? 'Educación Psicosocial' : 'Salud Psicosocial'
      };
      return actionNames[type] || type;
    };

    // Función para obtener color según rendimiento
    const getColorByPercentage = (percentage) => {
      if (percentage >= 75) return '#4CAF50'; // Verde
      if (percentage >= 50) return '#FF9800'; // Naranja
      if (percentage >= 25) return '#FF5722'; // Rojo-naranja
      return '#F44336'; // Rojo
    };
    
    // Educación/Salud Nutricional
    if (progress.nutrition && targets.nutrition) {
      // Solo talleres educativos (tienen meta específica)
      if (targets.nutrition.workshops > 0) {
        progressData.push({
          name: 'Talleres Educativos',
          fullName: 'Talleres educativos/Jornadas de promoción',
          progress: Math.round(progress.nutrition.workshops * 100) / 100,
          actual: counts.nutrition?.workshops || 0,
          target: targets.nutrition.workshops,
          action: getActionName('nutrition'),
          category: 'nutrition',
          fill: getColorByPercentage(progress.nutrition.workshops)
        });
      }
    }
    
    // Educación/Salud Física
    if (progress.physical && targets.physical) {
      const physicalStrategies = [
        { key: 'preventionTalks', name: 'Charlas Prevención', fullName: 'Charlas de prevención de enfermedad' },
        { key: 'therapeuticActivity', name: 'Act. Terapéutica', fullName: 'Actividad física terapéutica' },
        { key: 'rumbaTherapy', name: 'Rumbaterapia', fullName: 'Rumbaterapia y ejercicios dirigidos' },
        { key: 'walkingClub', name: 'Club Caminantes', fullName: 'Club de caminantes' }
      ];
      
      physicalStrategies.forEach(({ key, name, fullName }) => {
        if (targets.physical[key] > 0) {
          progressData.push({
            name,
            fullName,
            progress: Math.round(progress.physical[key] * 100) / 100,
            actual: counts.physical?.[key] || 0,
            target: targets.physical[key],
            action: getActionName('physical'),
            category: 'physical',
            fill: getColorByPercentage(progress.physical[key])
          });
        }
      });
    }
    
    // Educación/Salud Psicosocial
    if (progress.psychosocial && targets.psychosocial) {
      const psychosocialStrategies = [
        { key: 'mentalHealth', name: 'Salud Mental', fullName: 'Jornadas/talleres en salud mental' },
        { key: 'cognitive', name: 'Cognitivos', fullName: 'Jornadas/talleres cognitivos' },
        { key: 'abusePreventionWorkshops', name: 'Prev. Maltrato', fullName: 'Talleres en prevención al maltrato' },
        { key: 'artsAndCrafts', name: 'Artes y Oficios', fullName: 'Talleres en artes y oficios' },
        { key: 'intergenerational', name: 'Intergeneracional', fullName: 'Encuentros intergeneracionales' }
      ];
      
      psychosocialStrategies.forEach(({ key, name, fullName }) => {
        if (targets.psychosocial[key] > 0) {
          progressData.push({
            name,
            fullName,
            progress: Math.round(progress.psychosocial[key] * 100) / 100,
            actual: counts.psychosocial?.[key] || 0,
            target: targets.psychosocial[key],
            action: getActionName('psychosocial'),
            category: 'psychosocial',
            fill: getColorByPercentage(progress.psychosocial[key])
          });
        }
      });
    }
    
    console.log('Datos preparados para DetailedGoalsChart:', progressData);
    return progressData;
  };

  const data = prepareProgressChartData();
  
  // Tooltip personalizado
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Box sx={{
          bgcolor: 'background.paper',
          p: 2,
          border: '1px solid #ccc',
          borderRadius: 1,
          boxShadow: 2,
          minWidth: 200
        }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            {data.action}
          </Typography>
          <Typography variant="body2" gutterBottom>
            {data.fullName}
          </Typography>
          <Divider sx={{ my: 1 }} />
          <Typography variant="body2">
            <strong>Progreso:</strong> {data.progress}%
          </Typography>
          <Typography variant="body2">
            <strong>Realizado:</strong> {data.actual}
          </Typography>
          <Typography variant="body2">
            <strong>Meta:</strong> {data.target}
          </Typography>
          <Typography variant="body2">
            <strong>Faltante:</strong> {Math.max(0, data.target - data.actual)}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader title={title} />
        <CardContent>
          <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
            No hay estrategias con metas configuradas para mostrar en el gráfico detallado.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader 
        title={title}
        subheader={`${contractor} - Solo estrategias con metas específicas`}
      />
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(400, data.length * 40)}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 50, left: 120, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              type="number" 
              domain={[0, 100]}
              label={{ value: 'Porcentaje (%)', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={120}
              fontSize={12}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <ReferenceLine x={100} stroke="red" strokeDasharray="3 3" />
            <ReferenceLine x={75} stroke="green" strokeDasharray="2 2" opacity={0.5} />
            <ReferenceLine x={50} stroke="orange" strokeDasharray="2 2" opacity={0.5} />
            <ReferenceLine x={25} stroke="red" strokeDasharray="2 2" opacity={0.5} />
            <Bar 
              dataKey="progress" 
              name="% Cumplimiento"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
        
        {/* Resumen de colores */}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, bgcolor: '#4CAF50', borderRadius: 1 }} />
            <Typography variant="caption">Excelente (≥75%)</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, bgcolor: '#FF9800', borderRadius: 1 }} />
            <Typography variant="caption">Bueno (50-74%)</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, bgcolor: '#FF5722', borderRadius: 1 }} />
            <Typography variant="caption">Bajo (25-49%)</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, bgcolor: '#F44336', borderRadius: 1 }} />
            <Typography variant="caption">Crítico (&lt;25%)</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default DetailedGoalsChart;