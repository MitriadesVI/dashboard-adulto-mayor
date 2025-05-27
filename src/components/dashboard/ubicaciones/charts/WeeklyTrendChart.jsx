import React from 'react';
import { Typography, Box, Alert } from '@mui/material';
import { 
  ResponsiveContainer, ComposedChart, Line, Bar, 
  CartesianGrid, XAxis, YAxis, Tooltip, Legend 
} from 'recharts';
import { COLORS } from '../../common/helpers';

// Tooltip mejorado con más información
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <Box sx={{ 
        backgroundColor: 'white', 
        p: 1.5, 
        border: '1px solid #ccc',
        borderRadius: 1,
        boxShadow: 2
      }}>
        <Typography variant="subtitle2" fontWeight="bold">
          {label} {data.monthName && `(${data.monthName})`}
        </Typography>
        <Typography variant="body2" sx={{ color: COLORS[0] || '#8884d8' }}>
          Promedio: {data.promedio} asistentes
        </Typography>
        <Typography variant="body2" sx={{ color: COLORS[1] || '#82ca9d' }}>
          Sesiones: {data.sesiones}
        </Typography>
        <Typography variant="body2" sx={{ color: COLORS[2] || '#ffc658' }}>
          Total beneficiarios: {data.totalBeneficiaries}
        </Typography>
        {data.year && data.originalWeek && (
          <Typography variant="caption" color="text.secondary">
            Año {data.year}, Semana ISO #{data.originalWeek}
          </Typography>
        )}
      </Box>
    );
  }
  return null;
};

const WeeklyTrendChart = ({ data }) => {
  // Validación mejorada
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        <Typography variant="h6" gutterBottom>Sin datos semanales</Typography>
        <Typography variant="body2">
          No hay suficientes datos para mostrar tendencias semanales. Se necesitan al menos 
          actividades en diferentes semanas para generar el gráfico.
        </Typography>
      </Alert>
    );
  }

  // Calcular algunas estadísticas para mostrar contexto
  const totalWeeks = data.length;
  const avgAttendance = Math.round(data.reduce((sum, week) => sum + week.promedio, 0) / totalWeeks);
  const totalSessions = data.reduce((sum, week) => sum + week.sesiones, 0);

  return (
    <Box>
      {/* Información contextual */}
      <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="caption" align="center">
          <strong>{totalWeeks}</strong><br/>Semanas con datos
        </Typography>
        <Typography variant="caption" align="center">
          <strong>{avgAttendance}</strong><br/>Promedio general
        </Typography>
        <Typography variant="caption" align="center">
          <strong>{totalSessions}</strong><br/>Total sesiones
        </Typography>
      </Box>

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis 
            dataKey="week" 
            tick={{ fontSize: 11 }}
            tickLine={{ stroke: '#666' }}
          />
          <YAxis 
            yAxisId="left" 
            label={{ value: 'Promedio Asistencia', angle: -90, position: 'insideLeft' }}
            tick={{ fontSize: 11 }}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            label={{ value: 'Número de Sesiones', angle: -90, position: 'insideRight' }}
            tick={{ fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          
          {/* Línea de tendencia de asistencia */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="promedio"
            stroke={COLORS[0] || '#8884d8'}
            strokeWidth={3}
            name="Promedio de Asistencia"
            activeDot={{ r: 6, fill: COLORS[0] || '#8884d8' }}
            dot={{ r: 4 }}
          />
          
          {/* Barras de sesiones */}
          <Bar 
            yAxisId="right" 
            dataKey="sesiones" 
            fill={COLORS[1] || '#82ca9d'} 
            name="Sesiones de Servicio"
            opacity={0.7}
            radius={[2, 2, 0, 0]}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Nota explicativa */}
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
        Semanas ordenadas cronológicamente desde la primera actividad registrada. 
        S1 = primera semana con datos, S2 = segunda semana, etc.
      </Typography>
    </Box>
  );
};

export default WeeklyTrendChart;