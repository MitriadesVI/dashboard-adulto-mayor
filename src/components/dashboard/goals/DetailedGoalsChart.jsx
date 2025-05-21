// src/components/dashboard/goals/DetailedGoalsChart.jsx

import React from 'react';
import { Card, CardContent, CardHeader } from '@mui/material';
import { 
  ResponsiveContainer, BarChart, Bar, CartesianGrid, 
  XAxis, YAxis, Tooltip, Legend, ReferenceLine 
} from 'recharts';

const DetailedGoalsChart = ({ goals, title = "Progreso Detallado por Actividad" }) => {
  // Prepare data for chart
  const prepareProgressChartData = () => {
    if (!goals) return [];
    
    const progressData = [];
    
    // Nutrición
    Object.entries(goals.progress.nutrition).forEach(([key, value]) => {
      progressData.push({
        name: key === 'workshops' ? 'Talleres Nutrición' : 'Raciones',
        progress: Math.min(100, value),
        meta: 100,
        actual: Math.round(value),
        category: 'nutrition'
      });
    });
    
    // Física
    Object.entries(goals.progress.physical).forEach(([key, value]) => {
      let name = 'Desconocido';
      if (key === 'preventionTalks') name = 'Charlas Prevención';
      if (key === 'therapeuticActivity') name = 'Act. Terapéutica';
      if (key === 'rumbaTherapy') name = 'Rumbaterapia';
      if (key === 'walkingClub') name = 'Club Caminantes';
      
      progressData.push({
        name,
        progress: Math.min(100, value),
        meta: 100,
        actual: Math.round(value),
        category: 'physical'
      });
    });
    
    // Psicosocial
    Object.entries(goals.progress.psychosocial).forEach(([key, value]) => {
      let name = 'Desconocido';
      if (key === 'mentalHealth') name = 'Salud Mental';
      if (key === 'cognitive') name = 'Cognitivos';
      if (key === 'abusePreventionWorkshops') name = 'Prev. Maltrato';
      if (key === 'artsAndCrafts') name = 'Artes y Oficios';
      if (key === 'intergenerational') name = 'Intergeneracional';
      
      progressData.push({
        name,
        progress: Math.min(100, value),
        meta: 100,
        actual: Math.round(value),
        category: 'psychosocial'
      });
    });
    
    return progressData;
  };

  const data = prepareProgressChartData();

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
            <XAxis type="number" domain={[0, 100]} />
            <YAxis type="category" dataKey="name" width={150} />
            <Tooltip 
              formatter={(value, name) => [
                name === 'progress' ? `${value.toFixed(1)}%` : value, 
                name === 'progress' ? 'Cumplimiento' : 'Meta'
              ]}
            />
            <Legend />
            <ReferenceLine x={100} stroke="red" strokeDasharray="3 3" />
            <Bar dataKey="progress" name="% Cumplimiento" fill="#4CAF50" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default DetailedGoalsChart;