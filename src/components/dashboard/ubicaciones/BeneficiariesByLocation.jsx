// src/components/dashboard/ubicaciones/BeneficiariesByLocation.jsx

import React from 'react';
import { Card, CardContent, CardHeader } from '@mui/material';
import { 
  ResponsiveContainer, BarChart, Bar, CartesianGrid, 
  XAxis, YAxis, Tooltip, Legend, Cell
} from 'recharts';
import { getAverageBeneficiariesByLocation } from '../common/helpers';

const BeneficiariesByLocation = ({ 
  activities, 
  title = "Promedio de Beneficiarios por Ubicación", 
  topCount = 3 // Mostrar top 3 de cada modalidad
}) => {
  // Usar la función auxiliar para calcular promedios
  const data = getAverageBeneficiariesByLocation(activities, topCount);

  // Función para obtener color según tipo de ubicación
  const getBarColor = (entry) => {
    return entry.type === 'Centro de Vida' ? '#2196F3' : '#4CAF50';
  };

  return (
    <Card>
      <CardHeader 
        title={title} 
        subheader={`Top ${topCount} de cada modalidad (Centros y Parques)`} 
      />
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={150} 
              tickFormatter={(value) => `${value} (${data.find(item => item.name === value)?.type})`}
            />
            <Tooltip 
              formatter={(value) => [`${value} beneficiarios (promedio)`, 'Promedio']}
              labelFormatter={(value) => {
                const item = data.find(item => item.name === value);
                return `${value} (${item?.type})`;
              }}
            />
            <Legend />
            <Bar 
              dataKey="value" 
              name="Promedio Beneficiarios"
              fill="#8884d8"
              isAnimationActive={true}
              animationDuration={500}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getBarColor(entry)} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default BeneficiariesByLocation;