// src/components/dashboard/activities/ActivityTimeline.jsx

import React from 'react';
import { Card, CardContent, CardHeader } from '@mui/material';
import { 
  ResponsiveContainer, LineChart, Line, CartesianGrid, 
  XAxis, YAxis, Tooltip, Legend 
} from 'recharts';

const ActivityTimeline = ({ activities, title = "Actividades por Fecha" }) => {
  // Función para agrupar actividades por fecha
  const getActivityCountsByDate = () => {
    if (!activities || !activities.length) return [];
    
    const counts = {};
    
    // Agrupar por fecha
    activities.forEach(activity => {
      if (!activity || !activity.date) return;
      
      try {
        // Formato YYYY-MM-DD
        const dateStr = new Date(activity.date).toISOString().split('T')[0];
        counts[dateStr] = (counts[dateStr] || 0) + 1;
      } catch (e) {
        console.warn("Error procesando fecha:", e);
      }
    });
    
    // Convertir a array y ordenar por fecha
    return Object.entries(counts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const data = getActivityCountsByDate();

  return (
    <Card>
      <CardHeader title={title} />
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip 
              formatter={(value) => [`${value} actividades`, 'Cantidad']}
              labelFormatter={(value) => `Fecha: ${new Date(value).toLocaleDateString('es-CO')}`}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="count" 
              name="Actividades" 
              stroke="#8884d8" 
              activeDot={{ r: 8 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ActivityTimeline;