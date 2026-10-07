// src/components/dashboard/activities/ActivityTimeline.jsx
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@mui/material';
import { 
  ResponsiveContainer, LineChart, Line, CartesianGrid, 
  XAxis, YAxis, Tooltip, Legend 
} from 'recharts';
import { formatDate } from '../common/helpers';
import { toDateKey } from '../../../utils/dates';

const ActivityTimeline = ({ activities, title = "Actividades por Fecha" }) => {
  // Cuenta solo actividades educativas por fecha: las entregas de alimentos no se cuentan como actividades
  const data = useMemo(() => {
    if (!activities || !activities.length) return [];
    
    const counts = {};
    
    activities.forEach(activity => {
      if (!activity || !activity.educationalActivity?.included) return;
      
      // Clave 'YYYY-MM-DD' en hora local
      const dateStr = activity.dateKey || toDateKey(activity.date);
      if (!dateStr) return;
      counts[dateStr] = (counts[dateStr] || 0) + 1;
    });
    
    // Convertir a array y ordenar por fecha
    return Object.entries(counts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [activities]);

  return (
    <Card>
      <CardHeader 
        title={title} 
        subheader="No incluye entregas de raciones y meriendas" 
      />
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={(value) => formatDate(value).slice(0, 5)} />
            <YAxis allowDecimals={false} />
            <Tooltip 
              formatter={(value) => [`${value} actividades`, 'Cantidad']}
              labelFormatter={(value) => `Fecha: ${formatDate(value)}`}
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