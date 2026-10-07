// src/components/dashboard/modality/PerformanceComparison.jsx

import React, { useMemo } from 'react';
import { 
  Card, CardContent, CardHeader, Typography, Box,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, LinearProgress
} from '@mui/material';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { getPerformanceComparisons } from '../common/helpers';
import { getContractorColor } from '../../../config/contractors';

const PerformanceComparison = ({ activities, title = "Análisis Comparativo de Rendimiento" }) => {
  const comparisons = useMemo(() => getPerformanceComparisons(activities), [activities]);

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

  // Radar: una fila por dimensión y una columna por contratista. Cada dimensión se normaliza a escala 0-10
  // respecto al mayor valor entre contratistas, para que sean comparables entre sí.
  const contractorNames = Object.keys(comparisons.byContractor);
  const radarMetrics = [
    { dimension: 'Actividades', getValue: (data) => data.activities },
    { dimension: 'Beneficiarios por jornada', getValue: (data) => data.avgBeneficiaries },
    { dimension: 'Cobertura (ubicaciones)', getValue: (data) => data.uniqueLocations },
    { dimension: 'Actividades por ubicación', getValue: (data) => (data.uniqueLocations > 0 ? data.activities / data.uniqueLocations : 0) }
  ];
  const radarData = radarMetrics.map(({ dimension, getValue }) => {
    const maxValue = Math.max(0, ...contractorNames.map(name => getValue(comparisons.byContractor[name])));
    const row = { dimension };
    contractorNames.forEach(name => {
      row[name] = maxValue > 0 ? Math.round((getValue(comparisons.byContractor[name]) / maxValue) * 100) / 10 : 0;
    });
    return row;
  });

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
            Actividades y Beneficiarios por Jornada, por Contratista-Modalidad
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
                name="Beneficiarios por jornada" 
                fill="#82ca9d"
              />
            </BarChart>
          </ResponsiveContainer>
        </Box>

        {/* Radar chart de rendimiento */}
        {contractorNames.length > 1 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Análisis Multidimensional por Contratista
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="dimension" />
                <PolarRadiusAxis domain={[0, 10]} />
                {contractorNames.map((contractor) => (
                  <Radar
                    key={contractor}
                    name={contractor}
                    dataKey={contractor}
                    stroke={getContractorColor(contractor)}
                    fill={getContractorColor(contractor)}
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
                  <TableCell align="right"><strong>Benef. por jornada</strong></TableCell>
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