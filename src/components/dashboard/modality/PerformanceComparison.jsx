// src/components/dashboard/modality/PerformanceComparison.jsx

import React from 'react';
import { 
  Card, CardContent, CardHeader, Grid, Typography, Box,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, LinearProgress
} from '@mui/material';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { getPerformanceComparisons } from '../common/helpers';

const PerformanceComparison = ({ activities, title = "Análisis Comparativo de Rendimiento" }) => {
  const comparisons = getPerformanceComparisons(activities);

  // Preparar datos para gráfico de barras
  const chartData = Object.entries(comparisons.combined).map(([key, data]) => ({
    name: `${data.contractor}\n${data.modalityType}`,
    contractor: data.contractor,
    modalityType: data.modalityType,
    activities: data.activities,
    beneficiaries: data.beneficiaries,
    avgBeneficiaries: data.avgBeneficiaries,
    uniqueLocations: data.uniqueLocations,
    efficiency: data.uniqueLocations > 0 ? Math.round(data.activities / data.uniqueLocations * 100) / 100 : 0
  }));

  // Preparar datos para radar chart
  const radarData = Object.entries(comparisons.byContractor).map(([contractor, data]) => ({
    contractor,
    'Actividades': Math.min(data.activities / 10, 10), // Normalizar a escala 0-10
    'Beneficiarios': Math.min(data.avgBeneficiaries / 50, 10), // Normalizar
    'Cobertura': Math.min(data.uniqueLocations / 5, 10), // Normalizar
    'Eficiencia': Math.min(data.activities / data.uniqueLocations / 2, 10) // Normalizar
  }));

  const getPerformanceLevel = (value, type) => {
    if (type === 'efficiency') {
      if (value >= 3) return { level: 'Excelente', color: 'success' };
      if (value >= 2) return { level: 'Bueno', color: 'info' };
      if (value >= 1) return { level: 'Regular', color: 'warning' };
      return { level: 'Bajo', color: 'error' };
    }
    // Para otros tipos de métricas
    if (value >= 40) return { level: 'Alto', color: 'success' };
    if (value >= 25) return { level: 'Medio', color: 'info' };
    if (value >= 15) return { level: 'Regular', color: 'warning' };
    return { level: 'Bajo', color: 'error' };
  };

  const CONTRACTOR_COLORS = {
    'CUC': '#2196F3',
    'FUNDACARIBE': '#4CAF50',
    'Desconocido': '#9E9E9E'
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader title={title} />
        <CardContent>
          <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
            No hay suficientes datos para realizar el análisis comparativo de rendimiento.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader 
        title={title}
        subheader="Comparación de rendimiento entre contratistas y modalidades"
      />
      <CardContent>
        {/* Gráfico de barras comparativo */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Actividades y Beneficiarios por Contratista-Modalidad
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={10}
              />
              <YAxis yAxisId="left" orientation="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                formatter={(value, name, props) => {
                  if (name === 'activities') return [`${value} actividades`, 'Actividades'];
                  if (name === 'avgBeneficiaries') return [`${value} promedio`, 'Beneficiarios Promedio'];
                  return [value, name];
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload.length > 0) {
                    const data = payload[0].payload;
                    return `${data.contractor} - ${data.modalityType}`;
                  }
                  return label;
                }}
              />
              <Legend />
              <Bar 
                yAxisId="left"
                dataKey="activities" 
                name="Actividades" 
                fill="#8884d8"
              />
              <Bar 
                yAxisId="right"
                dataKey="avgBeneficiaries" 
                name="Beneficiarios Promedio" 
                fill="#82ca9d"
              />
            </BarChart>
          </ResponsiveContainer>
        </Box>

        {/* Radar chart de rendimiento */}
        {radarData.length > 1 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Análisis Multidimensional por Contratista
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="contractor" />
                <PolarRadiusAxis domain={[0, 10]} />
                {Object.keys(CONTRACTOR_COLORS).map((contractor, index) => (
                  <Radar
                    key={contractor}
                    name={contractor}
                    dataKey={contractor}
                    stroke={CONTRACTOR_COLORS[contractor]}
                    fill={CONTRACTOR_COLORS[contractor]}
                    fillOpacity={0.1}
                  />
                ))}
                <Tooltip />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </Box>
        )}

        {/* Tabla detallada */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Detalle Comparativo
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Contratista</strong></TableCell>
                  <TableCell><strong>Modalidad</strong></TableCell>
                  <TableCell align="right"><strong>Actividades</strong></TableCell>
                  <TableCell align="right"><strong>Ubicaciones</strong></TableCell>
                  <TableCell align="right"><strong>Total Benef.</strong></TableCell>
                  <TableCell align="right"><strong>Promedio Benef.</strong></TableCell>
                  <TableCell align="right"><strong>Eficiencia</strong></TableCell>
                  <TableCell align="center"><strong>Nivel</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {chartData.map((row, index) => {
                  const performanceLevel = getPerformanceLevel(row.efficiency, 'efficiency');
                  return (
                    <TableRow key={index}>
                      <TableCell>{row.contractor}</TableCell>
                      <TableCell>{row.modalityType}</TableCell>
                      <TableCell align="right">{row.activities}</TableCell>
                      <TableCell align="right">{row.uniqueLocations}</TableCell>
                      <TableCell align="right">{row.beneficiaries.toLocaleString()}</TableCell>
                      <TableCell align="right">{row.avgBeneficiaries}</TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight="bold">
                            {row.efficiency}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(row.efficiency * 20, 100)}
                            sx={{ width: 40, height: 6, borderRadius: 3 }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={performanceLevel.level}
                          color={performanceLevel.color}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PerformanceComparison;