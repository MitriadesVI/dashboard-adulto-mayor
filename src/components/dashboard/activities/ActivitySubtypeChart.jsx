// src/components/dashboard/activities/ActivitySubtypeChart.jsx

import React from 'react';
import { Card, CardContent, CardHeader } from '@mui/material';
import { 
  ResponsiveContainer, BarChart, Bar, CartesianGrid, 
  XAxis, YAxis, Tooltip, Legend 
} from 'recharts';
import { getActivitySubtypeLabel, COLORS } from '../common/helpers';

const ActivitySubtypeChart = ({ activities, title = "Actividades por Subtipo" }) => {
  // Función para contar actividades por subtipo
  const getActivityCountsBySubtype = () => {
    if (!activities || !activities.length) return [];
    
    const counts = {};
    activities.forEach(activity => {
      if (!activity || !activity.type || !activity.subtype || !activity.contractor) {
        return;
      }
      
      try {
        const label = getActivitySubtypeLabel(activity.type, activity.subtype, activity.contractor);
        counts[label] = (counts[label] || 0) + 1;
      } catch (e) {
        console.warn("Error obteniendo subtipo:", e);
      }
    });
    
    return Object.entries(counts).map(([name, value]) => ({ 
      name, 
      value,
      fill: COLORS[Object.keys(counts).indexOf(name) % COLORS.length]
    }));
  };

  const data = getActivityCountsBySubtype();

  return (
    <Card>
      <CardHeader title={title} />
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={150} />
            <Tooltip />
            <Legend />
            <Bar 
              dataKey="value" 
              name="Actividades" 
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ActivitySubtypeChart;