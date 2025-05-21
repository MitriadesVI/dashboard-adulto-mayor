// Añade este archivo: src/components/contractor/ContractorDashboard.jsx

import React, { useState, useEffect } from 'react';
import {
  Container, Grid, Paper, Typography, Box,
  CircularProgress, Tab, Tabs, Button,
  FormControl, InputLabel, Select, MenuItem,
  TextField, Card, CardContent, CardHeader
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
  ReferenceLine
} from 'recharts';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import activitiesService from '../../services/activitiesService';
import goalsService from '../../services/goalsService';

const ContractorDashboard = ({ user }) => {
  const [tabValue, setTabValue] = useState(0);
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [goals, setGoals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#E53935', '#1976D2', '#8E24AA'];
  
  useEffect(() => {
    loadData();
  }, [user]);
  
  useEffect(() => {
    applyFilters();
  }, [activities, filterType, filterDateStart, filterDateEnd]);
  
  const loadData = async () => {
    setLoading(true);
    try {
      // Cargar actividades aprobadas del contratista
      const allActivities = await activitiesService.getAllActivities();
      const contractorActivities = allActivities
        .filter(a => a && a.contractor === user.contractor && a.status === 'approved');
      
      setActivities(contractorActivities);
      
      // Cargar metas
      try {
        const goalsData = await goalsService.calculateProgress(
          user.contractor, 
          currentYear, 
          contractorActivities
        );
        setGoals(goalsData);
      } catch (error) {
        console.error("Error cargando metas:", error);
      }
      
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const applyFilters = () => {
    if (!activities || !Array.isArray(activities)) {
      setFilteredActivities([]);
      return;
    }
    
    let filtered = [...activities];
    
    // Filtrar por tipo
    if (filterType !== 'all') {
      filtered = filtered.filter(a => a.type === filterType);
    }
    
    // Filtrar por fecha inicio
    if (filterDateStart) {
      const startDate = new Date(filterDateStart);
      startDate.setHours(0,0,0,0);
      filtered = filtered.filter(a => {
        if (!a.date) return false;
        const activityDate = new Date(a.date);
        return activityDate >= startDate;
      });
    }
    
    // Filtrar por fecha fin
    if (filterDateEnd) {
      const endDate = new Date(filterDateEnd);
      endDate.setHours(23,59,59,999);
      filtered = filtered.filter(a => {
        if (!a.date) return false;
        const activityDate = new Date(a.date);
        return activityDate <= endDate;
      });
    }
    
    setFilteredActivities(filtered);
  };
  
  const handleRefresh = () => {
    loadData();
  };
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Funciones de etiquetas
  const getActivityTypeLabel = (type, contractor) => {
    if (type === 'nutrition') {
      return contractor === 'CUC' ? 'Educación Nutricional' : 'Salud Nutricional';
    } else if (type === 'physical') {
      return contractor === 'CUC' ? 'Educación en Salud Física' : 'Salud Física';
    } else if (type === 'psychosocial') {
      return contractor === 'CUC' ? 'Educación Psicosocial' : 'Salud Psicosocial';
    }
    return type;
  };
  
  // Funciones de datos para gráficos
  const getActivityCountsByType = () => {
    if (!filteredActivities.length) return [];
    
    const counts = {};
    filteredActivities.forEach(activity => {
      if (!activity || !activity.type) return;
      
      const label = getActivityTypeLabel(activity.type, activity.contractor);
      counts[label] = (counts[label] || 0) + 1;
    });
    
    return Object.entries(counts).map(([name, value]) => ({ 
      name, 
      value 
    }));
  };
  
  const getActivityCountsByDate = () => {
    if (!filteredActivities.length) return [];
    
    const counts = {};
    
    filteredActivities.forEach(activity => {
      if (!activity || !activity.date) return;
      
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
  
  const getBeneficiariesTotal = () => {
    return filteredActivities.reduce((sum, activity) => {
      return sum + (Number(activity?.beneficiaries) || 0);
    }, 0);
  };
  
  // Datos para gráficos
  const dataByType = getActivityCountsByType();
  const dataByDate = getActivityCountsByDate();
  const progressData = goals ? Object.entries(goals.averages).map(([key, value]) => ({
    name: key === 'nutrition' ? 'Nutrición' : key === 'physical' ? 'Física' : 'Psicosocial',
    value: Math.min(100, value)
  })) : [];
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard de {user.contractor} - Avance de Actividades
        </Typography>
        
        <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo de Actividad</InputLabel>
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  label="Tipo de Actividad"
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="nutrition">Nutricional</MenuItem>
                  <MenuItem value="physical">Salud Física</MenuItem>
                  <MenuItem value="psychosocial">Psicosocial</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Desde"
                type="date"
                value={filterDateStart}
                onChange={(e) => setFilterDateStart(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Hasta"
                type="date"
                value={filterDateEnd}
                onChange={(e) => setFilterDateEnd(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Button 
                variant="contained" 
                fullWidth
                onClick={handleRefresh}
              >
                Actualizar
              </Button>
            </Grid>
          </Grid>
        </Paper>
        
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="fullWidth" 
          indicatorColor="primary"
          textColor="primary"
          sx={{ mb: 3 }}
        >
          <Tab label="Resumen" />
          <Tab label="Avance de Metas" />
        </Tabs>
        
        {tabValue === 0 && (
          <Box>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom align="center">
                      Total de Actividades
                    </Typography>
                    <Typography variant="h3" align="center" color="primary">
                      {filteredActivities.length}
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
                  <CardHeader title="Actividades por Tipo" />
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
        )}
        
        {tabValue === 1 && (
          <Box>
            {goals ? (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Card>
                    <CardHeader title="Progreso de Metas por Componente" />
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={progressData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                          <Legend />
                          <ReferenceLine y={100} stroke="red" strokeDasharray="3 3" />
                          <Bar dataKey="value" name="% Cumplimiento" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12}>
                  <Card>
                    <CardHeader title="Detalle de Metas por Actividad" />
                    <CardContent>
                      <Typography variant="subtitle1">Avance Detallado</Typography>
                      
                      {/* Aquí puedes añadir una tabla detallada con el avance por cada tipo de actividad */}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            ) : (
              <Typography variant="h6" align="center" sx={{ p: 4 }}>
                No hay metas configuradas para este año.
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default ContractorDashboard;