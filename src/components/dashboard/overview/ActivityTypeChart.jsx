// src/components/dashboard/overview/ActivityTypeChart.jsx - ACTUALIZADO

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, Typography, Box, useTheme, useMediaQuery } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { getActivityTypeLabel, PIE_COLORS } from '../common/helpers';

const ActivityTypeChart = ({ activities, title = "Distribución de Tipos de Actividades" }) => {
  const [data, setData] = useState([]);
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  
  useEffect(() => {
    setData(prepareData());
  }, [activities]);
  
  // FUNCIÓN CORREGIDA - Usar nueva estructura de datos
  const prepareData = () => {
    if (!activities || activities.length === 0) return [];
    
    const typeCount = {
      nutrition: 0,
      physical: 0,
      psychosocial: 0,
      unknown: 0
    };
    
    activities.forEach(activity => {
      // CORRECCIÓN: Solo considerar actividades educativas con nueva estructura
      if (!activity || !activity.educationalActivity || !activity.educationalActivity.included) {
        return;
      }
      
      const type = activity.educationalActivity.type;
      
      if (!type) {
        typeCount.unknown += 1;
        return;
      }
      
      if (typeCount[type] !== undefined) {
        typeCount[type] += 1;
      } else {
        typeCount.unknown += 1;
      }
    });
    
    // Remover tipos con 0 actividades
    const result = Object.entries(typeCount)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => ({
        name: getActivityTypeLabel(type, activities[0]?.contractor),
        value: count,
        fill: PIE_COLORS[type]
      }));
    
    return result;
  };
  
  // Resto del componente igual...
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
    if (percent < 0.05) return null;
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        style={{ fontSize: isSmall ? '10px' : '12px', fontWeight: 'bold' }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };
  
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <Box sx={{ 
          bgcolor: 'background.paper', 
          p: 1.5, 
          border: '1px solid #ccc',
          borderRadius: 1, 
          boxShadow: 1 
        }}>
          <Typography variant="subtitle2" color="textPrimary">
            {payload[0].name}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {`${payload[0].value} actividades (${((payload[0].value / total) * 100).toFixed(1)}%)`}
          </Typography>
        </Box>
      );
    }
    return null;
  };
  
  if (!data.length) {
    return (
      <Card>
        <CardHeader 
          title={title} 
          subheader="Solo actividades educativas" 
        />
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <Typography variant="body1" color="textSecondary">
              No hay actividades educativas para mostrar en el gráfico
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader 
        title={title} 
        subheader="Solo actividades educativas (no incluye entregas de alimentos)" 
      />
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={isSmall ? 80 : 100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill || PIE_COLORS[index % 4]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        
        <Box sx={{ 
          display: 'flex', 
          flexDirection: isSmall ? 'column' : 'row', 
          justifyContent: 'space-around', 
          alignItems: 'center', 
          mt: 2 
        }}>
          {data.map((item, index) => (
            <Box 
              key={index} 
              sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                mb: isSmall ? 1 : 0 
              }}
            >
              <Typography variant="subtitle2" gutterBottom>
                {item.name}
              </Typography>
              <Typography 
                variant="h6" 
                color="textPrimary" 
                sx={{ color: item.fill || PIE_COLORS[index % 4] }}
              >
                {item.value} <small>({((item.value / total) * 100).toFixed(1)}%)</small>
              </Typography>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default ActivityTypeChart;