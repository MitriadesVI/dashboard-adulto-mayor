// src/components/dashboard/Dashboard.jsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  Container, Grid, Paper, Typography, Box,
  CircularProgress, LinearProgress, Tab, Tabs, Alert
} from '@mui/material';

// Importar componentes modulares
import FilterPanel, { ACTIVITY_TYPE_OPTIONS, LOCATION_TYPE_OPTIONS } from './filters/FilterPanel';
import KPICards from './overview/KPICards';
import DashboardSummary from './overview/DashboardSummary';
import ActivityTypeChart from './overview/ActivityTypeChart';
import ActivityTimeline from './activities/ActivityTimeline';
import ActivitySubtypeChart from './activities/ActivitySubtypeChart';
import LocationDistribution from './ubicaciones/LocationDistribution';
import BeneficiariesByLocation from './ubicaciones/BeneficiariesByLocation';
import GoalsSummary from './goals/GoalsSummary';
import DetailedGoalsChart from './goals/DetailedGoalsChart';
import GoalsProgressEnhanced from './goals/GoalsProgressEnhanced';
import AlertsPanel from './alerts/AlertsPanel';
import LocationManager from './ubicaciones/LocationManager';
import NoDataMessage from './common/NoDataMessage';
import NutritionStats from './overview/NutritionStats';
import ModalityDistributionChart from './activities/ModalityDistributionChart';
import LocationAnalysis from './ubicaciones/LocationAnalysis';
import DistrictCoverageTab from './coverage/DistrictCoverageTab';

// Nuevos componentes de modalidad
import ModalityEfficiencyDashboard from './overview/ModalityEfficiencyDashboard';
import PerformanceComparison from './modality/PerformanceComparison';
import TemporalAnalysis from './modality/TemporalAnalysis';

// Importar servicios y utilidades
import { exportToCSV, formatDate, getLocationType, matchesActivityType } from './common/helpers';
import { CONTRACTORS, getContractorName } from '../../config/contractors';
import { parseActivityDate, startOfDay, endOfDay } from '../../utils/dates';

const DEFAULT_FILTERS = {
  contractor: 'all',
  type: 'all',
  locationType: 'all',
  startDate: '',
  endDate: ''
};

const isAllContractors = (contractor) => !contractor || contractor === 'all' || contractor === 'Todos';

// Filtra las actividades según los filtros aplicados (las fechas del filtro se leen en hora local)
const filterActivities = (activities, filters) => {
  if (!Array.isArray(activities)) return [];

  const start = filters.startDate ? startOfDay(filters.startDate) : null;
  const end = filters.endDate ? endOfDay(filters.endDate) : null;

  return activities.filter(activity => {
    if (!activity) return false;
    if (!isAllContractors(filters.contractor) && activity.contractor !== filters.contractor) return false;
    if (!matchesActivityType(activity, filters.type)) return false;
    if (filters.locationType !== 'all' && getLocationType(activity.location) !== filters.locationType) return false;

    if (start || end) {
      const date = parseActivityDate(activity.date);
      if (!date || (start && date < start) || (end && date > end)) return false;
    }
    return true;
  });
};

// Texto legible de los filtros aplicados
const describeFilters = (filters) => {
  const parts = [];
  if (!isAllContractors(filters.contractor)) parts.push(`Contratista: ${getContractorName(filters.contractor)}`);
  const type = ACTIVITY_TYPE_OPTIONS.find(option => option.value === filters.type);
  if (type) parts.push(`Tipo de actividad: ${type.label}`);
  const locationType = LOCATION_TYPE_OPTIONS.find(option => option.value === filters.locationType);
  if (locationType) parts.push(`Tipo de ubicación: ${locationType.label}`);
  if (filters.startDate) parts.push(`Desde: ${formatDate(filters.startDate)}`);
  if (filters.endDate) parts.push(`Hasta: ${formatDate(filters.endDate)}`);
  return parts.length > 0 ? parts.join(' · ') : 'sin filtros (todos los contratistas y fechas)';
};

function TabPanel(props) {
  const { children, value, index, loading = false, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={40} sx={{ mr: 2 }} />
              <Typography variant="h6">Cargando datos del dashboard...</Typography>
            </Box>
          ) : children}
        </Box>
      )}
    </div>
  );
}

const Dashboard = ({ user, activities, goals, loading, onFilterChange }) => {
  // La carga inicial la hace el componente padre (App); aquí no se dispara ninguna carga al montar.

  // Estado para pestañas
  const [tabValue, setTabValue] = useState(0);

  // Filtros del panel (lo que el usuario está editando; no afectan los datos hasta pulsar "Actualizar")
  const [filterContractor, setFilterContractor] = useState(DEFAULT_FILTERS.contractor);
  const [filterDateStart, setFilterDateStart] = useState(DEFAULT_FILTERS.startDate);
  const [filterDateEnd, setFilterDateEnd] = useState(DEFAULT_FILTERS.endDate);
  const [filterType, setFilterType] = useState(DEFAULT_FILTERS.type);
  const [filterLocation, setFilterLocation] = useState(DEFAULT_FILTERS.locationType);

  // Filtros enviados con "Actualizar" y filtros aplicados. Los aplicados solo cambian cuando el padre
  // termina de recargar, así que coinciden con los filtros con los que se cargaron `activities` y `goals`.
  // Todas las pestañas (gráficos, metas, alertas y análisis por ubicación) usan los aplicados.
  const [requestedFilters, setRequestedFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);

  useEffect(() => {
    if (!loading) setAppliedFilters(requestedFilters);
  }, [loading, requestedFilters]);

  const [debugMode, setDebugMode] = useState(false);
  const [error, setError] = useState(null);

  const filteredActivities = useMemo(
    () => filterActivities(activities, appliedFilters),
    [activities, appliedFilters]
  );

  // Cobertura: respeta contratista y tipos, pero no la fecha "Desde" (una sede atendida antes
  // del periodo no es "nunca atendida"); la fecha "Hasta" es la fecha de corte.
  const coverageActivities = useMemo(
    () => filterActivities(activities, { ...appliedFilters, startDate: '', endDate: '' }),
    [activities, appliedFilters]
  );

  // Sin datos previos que mostrar mientras carga: se reemplaza el contenido de las pestañas por un indicador.
  // Si ya hay datos, se mantienen visibles (atenuados) con una barra de progreso.
  const waitingForData = !!loading && !(Array.isArray(activities) && activities.length > 0);

  // Aplicar filtros: registra los filtros y pide al padre recargar los datos
  const applyFilters = async (filters) => {
    setError(null);
    setRequestedFilters(filters);

    if (!onFilterChange) return;
    try {
      await onFilterChange(filters);
    } catch (err) {
      console.error('Error al aplicar filtros:', err);
      setError('Error al cargar datos con filtros: ' + err.message);
    }
  };

  // Manejar cambio de filtros
  const handleFilterSubmit = () => {
    if (filterDateStart && filterDateEnd && filterDateStart > filterDateEnd) {
      setError('La fecha "Desde" no puede ser posterior a la fecha "Hasta".');
      return;
    }

    applyFilters({
      contractor: filterContractor,
      type: filterType,
      locationType: filterLocation,
      startDate: filterDateStart,
      endDate: filterDateEnd
    });
  };

  // Resetear filtros
  const handleResetFilters = () => {
    setFilterContractor(DEFAULT_FILTERS.contractor);
    setFilterType(DEFAULT_FILTERS.type);
    setFilterLocation(DEFAULT_FILTERS.locationType);
    setFilterDateStart(DEFAULT_FILTERS.startDate);
    setFilterDateEnd(DEFAULT_FILTERS.endDate);
    applyFilters({ ...DEFAULT_FILTERS });
  };

  const appliedContractorName = getContractorName(appliedFilters.contractor);

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

        {/* Panel de filtros - Solo mostrar en pestañas que lo necesiten */}
        {tabValue !== 4 && ( // No mostrar filtros en la pestaña de análisis por ubicación
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
            loading={!!loading}
            debugMode={debugMode}
            setDebugMode={setDebugMode}
          />
        )}

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
            <Tab label="Cobertura de Sedes" />
            <Tab label="Detalle de Actividades" />
            <Tab label="Detalles por Tipo de Espacio" />
            <Tab label="Análisis por Ubicación" />
            <Tab label="Progreso de Metas" />
            <Tab label="Alertas" />
            <Tab label="Gestión de Espacios" />
          </Tabs>
        </Box>
        
        {/* Información de depuración */}
        {debugMode && tabValue !== 4 && (
          <DashboardSummary 
            activities={activities}
            filteredActivities={filteredActivities}
            onExportCSV={() => exportToCSV(filteredActivities)}
          />
        )}
        
        {/* Barra de progreso mientras se recargan los datos (las pestañas no se desmontan) */}
        <Box sx={{ height: 4, mb: 1 }}>
          {loading && <LinearProgress />}
        </Box>

        <Box
          aria-busy={!!loading}
          sx={{ opacity: loading ? 0.5 : 1, pointerEvents: loading ? 'none' : 'auto', transition: 'opacity 0.2s' }}
        >
        {/* Tab: Visión General */}
        <TabPanel value={tabValue} index={0} loading={waitingForData}>
          {filteredActivities.length > 0 ? ( 
            <>
              <KPICards activities={filteredActivities} />
              
              <Box sx={{ mt: 3 }}>
                <NutritionStats activities={filteredActivities} />
              </Box>
              
              {/* Nuevo componente de eficiencia */}
              <Box sx={{ mt: 3 }}>
                <ModalityEfficiencyDashboard activities={filteredActivities} />
              </Box>
              
              <Grid container spacing={3} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <ActivityTypeChart activities={filteredActivities} />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <LocationDistribution activities={filteredActivities} />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <LocationDistribution 
                    activities={filteredActivities}
                    vertical={true} 
                    title="Top Ubicaciones por Actividades Educativas"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <ActivityTimeline activities={filteredActivities} />
                </Grid>
              </Grid>
            </>
          ) : (
            <NoDataMessage 
              onResetFilters={handleResetFilters}
              onRefreshData={handleFilterSubmit}
              debugInfo={debugMode ? {
                activities: activities?.length || 0,
                filteredActivities: filteredActivities.length,
                filters: appliedFilters
              } : null}
            />
          )}
        </TabPanel>

        {/* Tab: Detalle de Actividades */}
        {/* Tab: Cobertura de Sedes (qué espacios no han recibido atención) */}
        <TabPanel value={tabValue} index={1} loading={waitingForData}>
          <DistrictCoverageTab
            activities={coverageActivities}
            contractor={appliedFilters.contractor}
            locationType={appliedFilters.locationType}
            referenceDate={appliedFilters.endDate || undefined}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={2} loading={waitingForData}>
          {filteredActivities.length > 0 ? (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <ActivitySubtypeChart activities={filteredActivities} />
              </Grid>
            </Grid>
          ) : (
            <NoDataMessage 
              onResetFilters={handleResetFilters}
              onRefreshData={handleFilterSubmit}
            />
          )}
        </TabPanel>

        {/* Tab: Detalles por Tipo de Espacio */}
        <TabPanel value={tabValue} index={3} loading={waitingForData}>
          {filteredActivities.length > 0 ? (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <PerformanceComparison activities={filteredActivities} />
              </Grid>
              
              <Grid item xs={12}>
                <TemporalAnalysis activities={filteredActivities} />
              </Grid>
              
              <Grid item xs={12}>
                <ModalityDistributionChart activities={filteredActivities} />
              </Grid>
              
              <Grid item xs={12}>
                <BeneficiariesByLocation activities={filteredActivities} />
              </Grid>
            </Grid>
          ) : (
            <NoDataMessage 
              onResetFilters={handleResetFilters}
              onRefreshData={handleFilterSubmit}
            />
          )}
        </TabPanel>

        {/* Tab: Análisis por Ubicación (el panel de filtros está oculto aquí: usa los filtros aplicados) */}
        <TabPanel value={tabValue} index={4} loading={waitingForData}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Este análisis usa los filtros aplicados en las demás pestañas: {describeFilters(appliedFilters)}.
            Para cambiarlos, vuelva a otra pestaña, ajuste los filtros y pulse "Actualizar".
          </Alert>
          <LocationAnalysis activities={filteredActivities} />
        </TabPanel>

        {/* Tab: Progreso de Metas (usa el contratista de los filtros aplicados, el mismo de `goals`) */}
        <TabPanel value={tabValue} index={5} loading={waitingForData}>
          {isAllContractors(appliedFilters.contractor) ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Seleccione un contratista específico
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Use los filtros superiores para seleccionar {CONTRACTORS.map(c => c.name).join(' o ')} y pulse "Actualizar" para ver su progreso de metas.
              </Typography>
            </Paper>
          ) : goals?.hasGoals ? (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Metas {goals.year} de {appliedContractorName}: solo cuentan las actividades aprobadas de ese año.
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <GoalsSummary 
                  goals={goals} 
                  contractor={appliedFilters.contractor} 
                />
              </Grid>
              
              <Grid item xs={12}>
                <DetailedGoalsChart 
                  goals={goals}
                  contractor={appliedFilters.contractor}
                />
              </Grid>
              
              <Grid item xs={12}>
                <GoalsProgressEnhanced 
                  goals={goals} 
                  contractor={appliedFilters.contractor}
                  onRefresh={() => applyFilters({ ...appliedFilters })}
                />
              </Grid>
            </Grid>
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                No hay metas configuradas para {appliedContractorName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Configure las metas en el Panel de Administración para ver el progreso.
              </Typography>
            </Paper>
          )}
        </TabPanel>
        
        {/* Tab: Alertas */}
        <TabPanel value={tabValue} index={6} loading={waitingForData}>
          <AlertsPanel 
            activities={filteredActivities}
            goals={goals}
            contractor={appliedFilters.contractor}
          />
        </TabPanel>
        
        {/* Tab: Gestión de Espacios */}
        <TabPanel value={tabValue} index={7}>
          <LocationManager user={user} />
        </TabPanel>
        </Box>
      </Box>
    </Container>
  );
};

export default Dashboard;