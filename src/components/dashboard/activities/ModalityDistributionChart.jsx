// src/components/dashboard/activities/ModalityDistributionChart.jsx

import React, { useState, useEffect } from 'react';
import { 
  Card, CardContent, CardHeader, Grid, Typography, Box
} from '@mui/material';
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { COLORS } from '../common/helpers';

// Componente para el tooltip personalizado que muestra cantidad y porcentaje
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <Box 
        sx={{ 
          bgcolor: 'background.paper', 
          p: 1, 
          border: '1px solid #ccc',
          borderRadius: 1,
          boxShadow: 1
        }}
      >
        <Typography variant="body2" color="text.primary">
          <b>{data.name}</b>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Cantidad: {data.value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Porcentaje: {data.percent.toFixed(1)}%
        </Typography>
      </Box>
    );
  }
  return null;
};

const ModalityDistributionChart = ({ activities }) => {
  const [data, setData] = useState({
    all: [],
    byContractor: {}
  });
  
  useEffect(() => {
    if (!activities || !Array.isArray(activities) || activities.length === 0) {
      setData({ all: [], byContractor: {} });
      return;
    }
    
    // Filtrar actividades educativas (excluyendo entregas de alimentos)
    const educationalActivities = activities.filter(activity => 
      activity && 
      activity.educationalActivity && 
      activity.educationalActivity.included === true
    );
    
    if (educationalActivities.length === 0) {
      setData({ all: [], byContractor: {} });
      return;
    }
    
    // Contar por modalidad de atención (tipo de ubicación)
    const modalityCounts = {};
    const contractorModalityCounts = {};
    
    educationalActivities.forEach(activity => {
      if (!activity.location || !activity.location.type) return;
      
      // DEBUG: Mostrar el tipo real que llega desde Firebase
      console.log("Tipo de ubicación desde Firebase:", activity.location.type, "para ubicación:", activity.location.name);
      
      // Normalizar el tipo de ubicación con mapeo más específico
      let locationType = activity.location.type.toLowerCase().trim();
      
      // Mapear a categorías estándar usando diferentes variantes posibles
      if (locationType === 'center' || 
          locationType === 'centro' || 
          locationType.includes('centro') ||
          locationType === 'centro de vida' ||
          locationType === 'centro fijo') {
        locationType = 'Centro de Vida';
      } else if (locationType === 'park' || 
                 locationType === 'parque' || 
                 locationType.includes('parque') ||
                 locationType === 'espacio comunitario' ||
                 locationType.includes('espacio')) {
        locationType = 'Parque/Espacio Comunitario';
      } else if (locationType.includes('salon') || 
                 locationType.includes('salón')) {
        locationType = 'Salón Comunal';
      } else {
        // En lugar de "Otro", usar el tipo original para debugging
        locationType = `Tipo: ${activity.location.type}`;
        console.warn("Tipo de ubicación no reconocido:", activity.location.type);
      }
      
      // Contar para estadísticas globales
      modalityCounts[locationType] = (modalityCounts[locationType] || 0) + 1;
      
      // Contar por contratista
      if (activity.contractor) {
        if (!contractorModalityCounts[activity.contractor]) {
          contractorModalityCounts[activity.contractor] = {};
        }
        
        contractorModalityCounts[activity.contractor][locationType] = 
          (contractorModalityCounts[activity.contractor][locationType] || 0) + 1;
      }
    });
    
    // DEBUG: Mostrar conteos finales
    console.log("Conteos por modalidad:", modalityCounts);
    
    // Convertir a formato para gráficos
    const totalActivities = educationalActivities.length;
    
    // Datos globales
    const allData = Object.entries(modalityCounts).map(([name, value], index) => ({
      name,
      value,
      percent: (value / totalActivities) * 100,
      fill: COLORS[index % COLORS.length]
    }));
    
    // Datos por contratista
    const contractorData = {};
    Object.entries(contractorModalityCounts).forEach(([contractor, counts]) => {
      const contractorTotal = Object.values(counts).reduce((sum, count) => sum + count, 0);
      
      contractorData[contractor] = Object.entries(counts).map(([name, value], index) => ({
        name,
        value, 
        percent: (value / contractorTotal) * 100,
        fill: COLORS[index % COLORS.length]
      }));
    });
    
    setData({
      all: allData,
      byContractor: contractorData
    });
    
  }, [activities]);
  
  // Obtener los dos principales contratistas (o menos si no hay suficientes)
  const topContractors = Object.keys(data.byContractor).slice(0, 2);
  
  return (
    <Card>
      <CardHeader 
        title="Distribución por Modalidad de Atención" 
        subheader="Porcentaje de actividades educativas por tipo de ubicación" 
      />
      <CardContent>
        {data.all.length > 0 ? (
          <Grid container spacing={3}>
            {/* Gráfico global */}
            <Grid item xs={12} md={4}>
              <Typography variant="h6" align="center" gutterBottom>
                General
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.all}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ percent }) => `${percent.toFixed(0)}%`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {data.all.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Grid>
            
            {/* Gráficos por contratista */}
            {topContractors.map((contractor, index) => (
              <Grid item xs={12} md={4} key={contractor}>
                <Typography variant="h6" align="center" gutterBottom>
                  {contractor}
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.byContractor[contractor]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ percent }) => `${percent.toFixed(0)}%`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {data.byContractor[contractor].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Grid>
            ))}
            
            {/* Si solo hay un contratista, añadir espacio vacío */}
            {topContractors.length === 1 && (
              <Grid item xs={12} md={4}>
                <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No hay datos para un segundo contratista
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="subtitle1" color="text.secondary">
              No hay datos de actividades para mostrar
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ModalityDistributionChart;