// src/components/field/stats/FieldStatsChart.jsx
import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import { Paper, Typography, Box, useTheme } from '@mui/material';
import { PIE_COLORS } from '../../dashboard/common/helpers'; // Colores base

const FieldStatsChart = ({ title, data, dataKey = "value", nameKey = "name" }) => {
  const theme = useTheme();

  if (!data || data.length === 0 || data.every(item => item[dataKey] === 0)) {
    return (
      <Paper elevation={3} sx={{ p: 2, textAlign: 'center', height: '100%' }}>
        <Typography variant="h6" gutterBottom sx={{ color: theme.palette.text.primary }}>
          {title}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
          <Typography variant="body2" color="text.secondary">
            No hay datos suficientes para mostrar este gráfico.
          </Typography>
        </Box>
      </Paper>
    );
  }

  // Asignar colores a las barras. Usaremos PIE_COLORS como base.
  // Si hay más barras que colores, Recharts ciclará.
  // Los datos de 'getStatsByComponent' ya vienen con 'name' que puede mapear a PIE_COLORS
  // Los datos de 'getStatsByModality' son 'Centro de Vida' y 'Parque/Espacio'
  const colorMapping = {
    [PIE_COLORS.nutrition]: PIE_COLORS.nutrition, // Para 'Nutrición'
    [PIE_COLORS.physical]: PIE_COLORS.physical,   // Para 'Salud Física'
    [PIE_COLORS.psychosocial]: PIE_COLORS.psychosocial, // Para 'Psicosocial'
    'Centro de Vida': theme.palette.primary.main, // Color para Centro de Vida
    'Parque/Espacio': theme.palette.secondary.main, // Color para Parque
  };
  
  const defaultColor = theme.palette.grey[400];


  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ color: theme.palette.text.primary, textAlign: 'center', mb: 2 }}>
        {title}
      </Typography>
      <Box sx={{ height: 300 }}> {/* Contenedor con altura fija para el gráfico */}
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 5,
              right: 20,
              left: 0,
              bottom: 5,
            }}
            barGap={10}
            barSize={data.length > 5 ? 20 : 40} // Ajustar tamaño de barra si hay muchos datos
          >
            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
            <XAxis 
              dataKey={nameKey} 
              tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
              interval={0} // Mostrar todos los labels si es posible
              // angle={data.length > 3 ? -15 : 0} // Rotar labels si hay muchos
              // textAnchor={data.length > 3 ? "end" : "middle"}
            />
            <YAxis 
              allowDecimals={false} 
              tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
            />
            <Tooltip
              cursor={{ fill: theme.palette.action.hover }}
              contentStyle={{
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: theme.shape.borderRadius,
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <Bar dataKey={dataKey} name="Actividades">
              {data.map((entry, index) => {
                  // Intentar mapear el color por nombre, si no, usar un color de PIE_COLORS cíclicamente
                  const colorByName = colorMapping[entry[nameKey]];
                  const pieColorKeys = Object.keys(PIE_COLORS);
                  const fallbackColor = PIE_COLORS[pieColorKeys[index % pieColorKeys.length]] || defaultColor;
                return (
                  <Cell key={`cell-${index}`} fill={colorByName || fallbackColor} />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default FieldStatsChart;