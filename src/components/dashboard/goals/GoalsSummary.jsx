// src/components/dashboard/goals/GoalsSummary.jsx

import React from 'react';
import { Card, CardContent, CardHeader } from '@mui/material';
import { 
  ResponsiveContainer, BarChart, Bar, CartesianGrid, 
  XAxis, YAxis, Tooltip, Legend, ReferenceLine
} from 'recharts';

const GoalsSummary = ({ goals, contractor, title }) => {
  // Prepare data for chart
  const prepareAverageProgressChartData = () => {
    if (!goals) return [];
    
    return [
      { name: 'Nutrición', value: Math.min(100, goals.averages.nutrition), fill: '#4CAF50' },
      { name: 'Física', value: Math.min(100, goals.averages.physical), fill: '#2196F3' },
      { name: 'Psicosocial', value: Math.min(100, goals.averages.psychosocial), fill: '#9C27B0' }
    ];
  };

  const data = prepareAverageProgressChartData();
  const displayTitle = title || `Progreso General - ${contractor}`;

  return (
    <Card>
      <CardHeader title={displayTitle} />
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />
            <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
            <Legend />
            <ReferenceLine y={100} stroke="red" strokeDasharray="3 3" />
            <Bar dataKey="value" name="% Cumplimiento" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default GoalsSummary;