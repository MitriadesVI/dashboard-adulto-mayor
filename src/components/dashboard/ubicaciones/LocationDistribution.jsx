// src/components/dashboard/ubicaciones/LocationDistribution.jsx - ACTUALIZADO

import React from 'react';
import { Card, CardContent, CardHeader } from '@mui/material';
import { 
  ResponsiveContainer, BarChart, Bar, CartesianGrid, 
  XAxis, YAxis, Tooltip, Legend 
} from 'recharts';

const LocationDistribution = ({ 
  activities, 
  title = "Distribución por Ubicación", 
  vertical = false,
  limit = 10
}) => {
  // FUNCIÓN CORREGIDA - Usar nueva estructura de datos
  const getActivityCountsByLocation = () => {
    if (!activities || !activities.length) return [];
    
    const counts = {};
    activities.forEach(activity => {
      if (!activity || !activity.location || !activity.location.name) {
        return;
      }
      
      // CORRECCIÓN: Solo contar actividades educativas reales
      if (!activity.educationalActivity || !activity.educationalActivity.included) {
        return; // Saltamos las que no son actividades educativas
      }
      
      const locationName = activity.location.name;
      counts[locationName] = (counts[locationName] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
  };

  const data = getActivityCountsByLocation();

  return (
    <Card>
      <CardHeader 
        title={title} 
        subheader="Solo actividades educativas (no incluye entregas de alimentos)" 
      />
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            layout={vertical ? "vertical" : "horizontal"}
            margin={vertical ? 
              { top: 5, right: 30, left: 80, bottom: 5 } : 
              { top: 5, right: 30, left: 20, bottom: 5 }
            }
          >
            <CartesianGrid strokeDasharray="3 3" />
            {vertical ? (
              <>
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={80} />
              </>
            ) : (
              <>
                <XAxis dataKey="name" />
                <YAxis />
              </>
            )}
            <Tooltip />
            <Legend />
            <Bar 
              dataKey="value" 
              name="Actividades Educativas" 
              fill="#8884d8" 
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default LocationDistribution;