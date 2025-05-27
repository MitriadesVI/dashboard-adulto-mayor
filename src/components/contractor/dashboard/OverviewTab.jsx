// src/components/contractor/dashboard/OverviewTab.jsx

import React from 'react';
import { Grid, Card, CardContent, CardHeader, Typography, Box } from '@mui/material';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// CORRECCIÓN: Ruta correcta para helpers (cambio de ../../../ a ../../)
import { 
  getActivityTypeLabel, 
  getEducationalActivityCount, 
  calculateUniqueAttendance  // NUEVA FUNCIÓN IMPORTADA
} from '../../dashboard/common/helpers';

const OverviewTab = ({ activities, goals, user }) => {
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#E53935', '#1976D2', '#8E24AA'];

  const getActivityCountsByType = () => {
    if (!activities.length) return [];
    
    const counts = {};
    activities.forEach(activity => {
      if (!activity || !activity.educationalActivity?.included) return;
      
      const type = activity.educationalActivity.type;
      const label = getActivityTypeLabel(type, activity.contractor);
      counts[label] = (counts[label] || 0) + 1;
    });
    
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  const getActivityCountsByDate = () => {
    if (!activities.length) return [];
    
    const counts = {};
    activities.forEach(activity => {
      if (!activity || !activity.date || !activity.educationalActivity?.included) return;
      
      try {
        const dateStr = new Date(activity.date).toISOString().split('T')[0];
        counts[dateStr] = (counts[dateStr] || 0) + 1;
      } catch (e) {
        console.warn("Error procesando fecha:", e);
      }
    });
    
    return Object.entries(counts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  // ========== FUNCIÓN CORREGIDA: EVITA DOBLE CONTEO ==========
  const getBeneficiariesTotal = () => {
    // ANTES: return activities.reduce((sum, activity) => sum + (Number(activity?.totalBeneficiaries) || 0), 0);
    
    // DESPUÉS: Usar función que agrupa por ubicación+fecha+jornada y toma el máximo
    return calculateUniqueAttendance(activities);
  };

  const dataByType = getActivityCountsByType();
  const dataByDate = getActivityCountsByDate();

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom align="center">
                Actividades Educativas
              </Typography>
              <Typography variant="h3" align="center" color="primary">
                {getEducationalActivityCount(activities)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom align="center">
                Total de Beneficiarios
              </Typography>
              <Typography variant="h3" align="center" color="primary">
                {getBeneficiariesTotal()}
              </Typography>
              <Typography variant="caption" align="center" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                (Evita duplicados por jornada)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom align="center">
                % Avance General
              </Typography>
              <Typography variant="h3" align="center" color="primary">
                {goals ? Math.round((goals.averages.nutrition + goals.averages.physical + goals.averages.psychosocial) / 3) : 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Actividades Educativas por Tipo" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dataByType}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {dataByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Actividades por Fecha" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dataByDate}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" name="Actividades" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OverviewTab;