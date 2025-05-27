import React from 'react';
import { Typography, Box, Alert, Grid, Paper } from '@mui/material';
import { 
  ResponsiveContainer, ComposedChart, Bar, Line, 
  CartesianGrid, XAxis, YAxis, Tooltip, Legend 
} from 'recharts';
import { COLORS } from '../../common/helpers';

// Tooltip personalizado para mostrar información detallada
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <Box sx={{ 
        backgroundColor: 'white', 
        p: 1.5, 
        border: '1px solid #ccc',
        borderRadius: 1,
        boxShadow: 2,
        minWidth: 200
      }}>
        <Typography variant="subtitle2" fontWeight="bold">
          Día {label}
        </Typography>
        <Typography variant="body2" sx={{ color: COLORS[2] || '#ffc658' }}>
          Asistencia Total: {data.asistencia}
        </Typography>
        <Typography variant="body2" sx={{ color: COLORS[3] || '#FF8042' }}>
          Raciones Entregadas: {data.raciones}
        </Typography>
        <Typography variant="body2" sx={{ color: COLORS[4] || '#8884d8' }}>
          Sesiones de Servicio: {data.servicios}
        </Typography>
        {data.components && data.components.length > 0 && (
          <Typography variant="caption" color="text.secondary">
            Componentes: {data.components.join(', ')}
          </Typography>
        )}
      </Box>
    );
  }
  return null;
};

const MonthlyCalendarChart = ({ data, currentMonth }) => {
  // Validación mejorada
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        <Typography variant="h6" gutterBottom>Sin actividad en este mes</Typography>
        <Typography variant="body2">
          No se registraron actividades en {currentMonth ? 
            new Date(currentMonth + '-01').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) : 
            'el mes seleccionado'
          }. 
          {currentMonth && (
            <span> Use las flechas de navegación para ver otros meses con datos.</span>
          )}
        </Typography>
      </Alert>
    );
  }

  // Calcular estadísticas del mes
  const totalDays = data.length;
  const totalAttendance = data.reduce((sum, day) => sum + day.asistencia, 0);
  const totalRations = data.reduce((sum, day) => sum + day.raciones, 0);
  const totalSessions = data.reduce((sum, day) => sum + day.servicios, 0);
  const avgAttendancePerDay = Math.round(totalAttendance / totalDays);

  // Ordenar datos por día para mejor visualización
  const sortedData = [...data].sort((a, b) => a.day - b.day);

  return (
    <Box>
      {/* Estadísticas del mes */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'primary.light' }}>
            <Typography variant="h6" color="primary.contrastText">{totalDays}</Typography>
            <Typography variant="caption" color="primary.contrastText">
              Días con Actividad
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'success.light' }}>
            <Typography variant="h6" color="success.contrastText">{totalAttendance}</Typography>
            <Typography variant="caption" color="success.contrastText">
              Total Asistencia
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'warning.light' }}>
            <Typography variant="h6" color="warning.contrastText">{totalRations}</Typography>
            <Typography variant="caption" color="warning.contrastText">
              Total Raciones
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'info.light' }}>
            <Typography variant="h6" color="info.contrastText">{avgAttendancePerDay}</Typography>
            <Typography variant="caption" color="info.contrastText">
              Promedio Diario
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Gráfico principal */}
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={sortedData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis 
            dataKey="day" 
            label={{ value: 'Día del Mes', position: 'insideBottom', offset: -5 }}
            tick={{ fontSize: 11 }}
            type="number"
            domain={['dataMin', 'dataMax']}
          />
          <YAxis 
            yAxisId="left" 
            label={{ value: 'Asistencia / Raciones', angle: -90, position: 'insideLeft' }}
            tick={{ fontSize: 11 }}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            label={{ value: 'Nº Servicios', angle: -90, position: 'insideRight' }}
            tick={{ fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          
          {/* Barras de asistencia */}
          <Bar 
            yAxisId="left" 
            dataKey="asistencia" 
            fill={COLORS[2] || '#ffc658'} 
            name="Asistencia Total"
            radius={[2, 2, 0, 0]}
            opacity={0.8}
          />
          
          {/* Barras de raciones */}
          <Bar 
            yAxisId="left" 
            dataKey="raciones" 
            fill={COLORS[3] || '#FF8042'} 
            name="Raciones Entregadas"
            radius={[2, 2, 0, 0]}
            opacity={0.7}
          />
          
          {/* Línea de sesiones de servicio */}
          <Line 
            yAxisId="right" 
            type="monotone" 
            dataKey="servicios" 
            stroke={COLORS[4] || '#8884d8'} 
            name="Sesiones de Servicio" 
            strokeWidth={3}
            activeDot={{ r: 6 }}
            dot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Información adicional */}
      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary" display="block">
          <strong>Nota:</strong> Solo se muestran los días con actividad registrada. 
          La asistencia representa beneficiarios únicos (sin doble conteo entre actividades educativas y entregas de alimentos).
        </Typography>
        {currentMonth && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            <strong>Período:</strong> {new Date(currentMonth + '-01').toLocaleDateString('es-ES', { 
              month: 'long', 
              year: 'numeric' 
            })}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default MonthlyCalendarChart;