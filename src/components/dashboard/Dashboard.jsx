// src/components/dashboard/Dashboard.jsx

import React, { useState, useEffect, useRef } from 'react';
import {
  Container, Grid, Paper, Typography, Box,
  CircularProgress, Tab, Tabs, Alert
} from '@mui/material';

// Importar componentes modulares
import FilterPanel from './filters/FilterPanel';
import KPICards from './overview/KPICards';
import DashboardSummary from './overview/DashboardSummary';
import ActivityTypeChart from './overview/ActivityTypeChart';
import ActivityTimeline from './activities/ActivityTimeline';
import ActivitySubtypeChart from './activities/ActivitySubtypeChart';
import LocationDistribution from './locations/LocationDistribution';
import BeneficiariesByLocation from './locations/BeneficiariesByLocation';
import GoalsSummary from './goals/GoalsSummary';
import DetailedGoalsChart from './goals/DetailedGoalsChart';
import AlertsPanel from './alerts/AlertsPanel';
import LocationManager from './locations/LocationManager';
import NoDataMessage from './common/NoDataMessage';

// Importar servicios
import { exportToCSV } from './common/helpers';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const Dashboard = ({ user, activities, goals, loading, onFilterChange }) => {
  // Ref para controlar montaje y evitar bucles
  const isInitialMount = useRef(true);
  const hasAppliedInitialFilters = useRef(false);

  // Estado para pestañas y filtros
  const [tabValue, setTabValue] = useState(0);
  const [filterContractor, setFilterContractor] = useState('all');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [filteredActivitiesLocal, setFilteredActivitiesLocal] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [debugMode, setDebugMode] = useState(false); // Modo depuración
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [error, setError] = useState(null);

  // Manejar cambio de filtros
  const handleFilterSubmit = () => {
    setLoadingFilters(true);
    setError(null);
    console.log("Aplicando filtros en dashboard:", {
        contractor: filterContractor, type: filterType, locationType: filterLocation,
        startDate: filterDateStart, endDate: filterDateEnd
    });
    
    if (onFilterChange) {
      try {
        onFilterChange({
          contractor: filterContractor, 
          type: filterType, 
          locationType: filterLocation,
          startDate: filterDateStart, 
          endDate: filterDateEnd
        });
      } catch (err) {
        console.error("Error al aplicar filtros:", err);
        setError("Error al cargar datos con filtros: " + err.message);
      } finally {
        setLoadingFilters(false);
      }
    } else {
      setLoadingFilters(false);
    }
  };

  // Aplicar filtros iniciales
  useEffect(() => {
    if (isInitialMount.current) {
      console.log("Primera carga del Dashboard");
      isInitialMount.current = false;
    }
    
    if (!hasAppliedInitialFilters.current && onFilterChange) {
      console.log("Aplicando filtros iniciales (solo una vez)");
      hasAppliedInitialFilters.current = true;
      
      setTimeout(() => {
        onFilterChange({
          contractor: 'all',
          type: 'all', 
          locationType: 'all',
          startDate: '',
          endDate: ''
        });
      }, 500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtrar actividades localmente
  useEffect(() => {
    if (!activities || !Array.isArray(activities)) {
      setFilteredActivitiesLocal([]);
      return;
    }
    
    // Validar datos y aplicar filtros locales
    const validActivities = activities.filter(activity => !!activity);
    let tempFiltered = [...validActivities];
    
    // Aplicar filtros (filtrado local secundario)
    if (filterContractor !== 'all' && filterContractor !== 'Todos') {
      tempFiltered = tempFiltered.filter(activity => activity.contractor === filterContractor);
    }
    
    if (filterType !== 'all') {
      tempFiltered = tempFiltered.filter(activity => activity.type === filterType);
    }
    
    if (filterLocation !== 'all') {
      tempFiltered = tempFiltered.filter(activity => 
        activity.location && activity.location.type === filterLocation
      );
    }
    
    // Filtros de fecha
    if (filterDateStart) {
      try {
        const startDate = new Date(filterDateStart); 
        startDate.setHours(0,0,0,0);
        tempFiltered = tempFiltered.filter(activity => {
          if (!activity.date) return false;
          try {
            const activityDate = new Date(activity.date);
            return activityDate >= startDate;
          } catch (e) {
            return false;
          }
        });
      } catch(e) { 
        console.error("Error parseando fecha inicio:", e); 
      }
    }
    
    if (filterDateEnd) {
      try {
        const endDate = new Date(filterDateEnd); 
        endDate.setHours(23,59,59,999);
        tempFiltered = tempFiltered.filter(activity => {
          if (!activity.date) return false;
          try {
            const activityDate = new Date(activity.date);
            return activityDate <= endDate;
          } catch (e) {
            return false;
          }
        });
      } catch(e) { 
        console.error("Error parseando fecha fin:", e); 
      }
    }
    
    setFilteredActivitiesLocal(tempFiltered);
  }, [activities, filterContractor, filterType, filterLocation, filterDateStart, filterDateEnd]);

  // Resetear filtros
  const handleResetFilters = () => {
    setFilterContractor('all');
    setFilterType('all');
    setFilterLocation('all');
    setFilterDateStart('');
    setFilterDateEnd('');
    
    // Actualizar con nuevos filtros
    if (onFilterChange) {
      onFilterChange({
        contractor: 'all',
        type: 'all',
        locationType: 'all',
        startDate: '',
        endDate: ''
      });
    }
  };

  // Pantalla de carga
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress size={50} sx={{ mb: 3 }} />
        <Typography variant="h6">Cargando datos del dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard - Programa Adulto Mayor
        </Typography>
        <Typography variant="subtitle1" gutterBottom color="text.secondary">
          Monitoreo de actividades de los contratistas
        </Typography>

        {/* Mensaje de error si existe */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Panel de filtros */}
        <FilterPanel 
          filterContractor={filterContractor}
          setFilterContractor={setFilterContractor}
          filterType={filterType}
          setFilterType={setFilterType}
          filterLocation={filterLocation}
          setFilterLocation={setFilterLocation}
          filterDateStart={filterDateStart}
          setFilterDateStart={setFilterDateStart}
          filterDateEnd={filterDateEnd}
          setFilterDateEnd={setFilterDateEnd}
          onSubmit={handleFilterSubmit}
          loading={loadingFilters}
          debugMode={debugMode}
          setDebugMode={setDebugMode}
        />

        {/* Tabs principales */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs 
            value={tabValue} 
            onChange={(_, newValue) => setTabValue(newValue)}
            aria-label="dashboard tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Visión General" />
            <Tab label="Detalle de Actividades" />
            <Tab label="Progreso de Metas" />
            <Tab label="Alertas" />
            <Tab label="Gestión de Espacios" />
          </Tabs>
        </Box>
        
        {/* Información de depuración */}
        {debugMode && (
          <DashboardSummary 
            activities={activities}
            filteredActivities={filteredActivitiesLocal}
            onExportCSV={() => exportToCSV(filteredActivitiesLocal)}
          />
        )}
        
        {/* Tab: Visión General */}
        <TabPanel value={tabValue} index={0}>
          {filteredActivitiesLocal.length > 0 ? ( 
            <>
              <KPICards activities={filteredActivitiesLocal} />
              
              <Grid container spacing={3} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <ActivityTypeChart activities={filteredActivitiesLocal} />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <LocationDistribution activities={filteredActivitiesLocal} />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <LocationDistribution 
                    activities={filteredActivitiesLocal}
                    vertical={true} 
                    title="Top Ubicaciones"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <ActivityTimeline activities={filteredActivitiesLocal} />
                </Grid>
              </Grid>
            </>
          ) : (
            <NoDataMessage 
              onResetFilters={handleResetFilters}
              onRefreshData={handleFilterSubmit}
              debugInfo={{
                activities: activities?.length || 0,
                filteredActivities: filteredActivitiesLocal?.length || 0,
                filters: {
                  contractor: filterContractor,
                  type: filterType,
                  location: filterLocation,
                  dateStart: filterDateStart,
                  dateEnd: filterDateEnd
                }
              }}
            />
          )}
        </TabPanel>

        {/* Tab: Detalle de Actividades */}
        <TabPanel value={tabValue} index={1}>
          {filteredActivitiesLocal.length > 0 ? (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <ActivitySubtypeChart activities={filteredActivitiesLocal} />
              </Grid>
              
              <Grid item xs={12}>
                <BeneficiariesByLocation activities={filteredActivitiesLocal} />
              </Grid>
            </Grid>
          ) : (
            <NoDataMessage 
              onResetFilters={handleResetFilters}
              onRefreshData={handleFilterSubmit}
            />
          )}
        </TabPanel>

        {/* Tab: Progreso de Metas */}
        <TabPanel value={tabValue} index={2}>
          {filterContractor !== 'all' && filterContractor !== 'Todos' ? (
            goals ? (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <GoalsSummary 
                    goals={goals} 
                    contractor={filterContractor} 
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <DetailedGoalsChart 
                    goals={goals}
                  />
                </Grid>
              </Grid>
            ) : (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h6">No hay metas configuradas para este contratista.</Typography>
              </Paper>
            )
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6">Seleccione un contratista específico para ver su progreso de metas.</Typography>
            </Paper>
          )}
        </TabPanel>
        
        {/* Tab: Alertas */}
        <TabPanel value={tabValue} index={3}>
          <AlertsPanel 
            activities={filteredActivitiesLocal}
            goals={goals}
            contractor={filterContractor}
          />
        </TabPanel>
        
        {/* Tab: Gestión de Espacios */}
        <TabPanel value={tabValue} index={4}>
          <LocationManager user={user} />
        </TabPanel>
      </Box>
    </Container>
  );
};

export default Dashboard;