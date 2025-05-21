// src/components/dashboard/locations/LocationDistribution.jsx

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
  // Función para contar actividades por ubicación
  const getActivityCountsByLocation = () => {
    if (!activities || !activities.length) return [];
    
    const counts = {};
    activities.forEach(activity => {
      if (!activity || !activity.location || !activity.location.name) {
        return;
      }
      
      const locationName = activity.location.name;
      counts[locationName] = (counts[locationName] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);  // Limitar a 'limit' para legibilidad
  };

  const data = getActivityCountsByLocation();

  return (
    <Card>
      <CardHeader title={title} />
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
              name="Actividades" 
              fill="#8884d8" 
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default LocationDistribution;