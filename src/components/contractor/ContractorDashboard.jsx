// src/components/contractor/ContractorDashboard.jsx

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Container, Grid, Paper, Typography, Box,
  CircularProgress, Tab, Tabs, Button,
  FormControl, InputLabel, Select, MenuItem,
  TextField, Alert, LinearProgress, Card, CardContent
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

import activitiesService from '../../services/activitiesService';
import goalsService from '../../services/goalsService';
import locationsService from '../../services/locationsService';
import { getContractorName } from '../../config/contractors';
import { parseActivityDate, toDateKey, startOfDay, endOfDay, todayKey } from '../../utils/dates';
import { getActivityTypeLabel, calculateUniqueAttendance, exportToCSV } from '../dashboard/common/helpers';

// IMPORTAR COMPONENTES MODULARES
import LocationCoveragePanel from '../coverage/LocationCoveragePanel';
import { computeLocationCoverage } from '../coverage/coverageUtils';
import OverviewTab, { getOverallProgress } from './dashboard/OverviewTab';
import ActivitiesTab from './dashboard/ActivitiesTab';
import UsersReportTab from './dashboard/UsersReportTab';

const KpiCard = ({ label, value, caption, color = 'text.primary', sx }) => (
  <Card variant="outlined" sx={sx}>
    <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3 }}>
        {label}
      </Typography>
      <Typography variant="h5" component="div" sx={{ color, fontWeight: 700, lineHeight: 1.3 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', minHeight: '1.5em' }}>
        {caption || ' '}
      </Typography>
    </CardContent>
  </Card>
);

const ContractorDashboard = ({ user }) => {
  const contractor = user?.contractor;
  const currentYear = new Date().getFullYear();

  const [tabValue, setTabValue] = useState(0);
  const [activities, setActivities] = useState([]); // TODOS los estados del contratista
  const [locations, setLocations] = useState([]);
  const [goals, setGoals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [locationsError, setLocationsError] = useState(false);
  const [goalsError, setGoalsError] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');

  // Evita que una carga lenta pise a una más reciente o actualice un componente desmontado
  const loadIdRef = useRef(0);

  const loadData = useCallback(async (isRefresh = false) => {
    const loadId = ++loadIdRef.current;
    if (!contractor) {
      setLoading(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setLoadError(null);

    try {
      const [contractorActivities, contractorLocations] = await Promise.all([
        activitiesService.getActivitiesByContractor(contractor),
        locationsService.getLocationsByContractor(contractor).catch((error) => {
          console.error('Error cargando sedes:', error);
          return null;
        })
      ]);
      if (loadId !== loadIdRef.current) return;

      setActivities(contractorActivities);
      setLocations(contractorLocations || []);
      setLocationsError(contractorLocations === null);

      // Las metas solo cuentan actividades aprobadas del año
      try {
        const approvedActivities = contractorActivities.filter((a) => a.status === 'approved');
        const goalsData = await goalsService.calculateProgress(contractor, currentYear, approvedActivities);
        if (loadId !== loadIdRef.current) return;
        setGoals(goalsData);
        setGoalsError(false);
      } catch (error) {
        console.error('Error cargando metas:', error);
        if (loadId !== loadIdRef.current) return;
        setGoals(null);
        setGoalsError(true);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      if (loadId !== loadIdRef.current) return;
      setLoadError('No se pudieron cargar los datos del dashboard. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      if (loadId === loadIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [contractor, currentYear]);

  useEffect(() => {
    loadData();
    return () => {
      loadIdRef.current += 1; // invalida cargas en curso al desmontar o cambiar de contratista
    };
  }, [loadData]);

  // Actividades aprobadas: base de métricas, metas, filtros y exportación
  const approvedActivities = useMemo(
    () => activities.filter((a) => a && a.status === 'approved'),
    [activities]
  );

  const filteredActivities = useMemo(() => {
    const start = filterDateStart ? startOfDay(filterDateStart) : null;
    const end = filterDateEnd ? endOfDay(filterDateEnd) : null;

    return approvedActivities.filter((a) => {
      if (filterType !== 'all') {
        const matchesEducational = a.educationalActivity?.included && a.educationalActivity.type === filterType;
        // Las entregas de raciones/meriendas pertenecen al componente nutricional
        const matchesNutritionDelivery = filterType === 'nutrition' && a.nutritionDelivery?.included;
        if (!matchesEducational && !matchesNutritionDelivery) return false;
      }

      if (start || end) {
        const activityDate = parseActivityDate(a.date);
        if (!activityDate) return false;
        if (start && activityDate < start) return false;
        if (end && activityDate > end) return false;
      }
      return true;
    });
  }, [approvedActivities, filterType, filterDateStart, filterDateEnd]);

  // Indicadores del encabezado
  const kpis = useMemo(() => {
    const monthPrefix = todayKey().slice(0, 7);
    const approvedThisMonth = approvedActivities.filter((a) =>
      (a.dateKey || toDateKey(a.date) || '').startsWith(monthPrefix)
    );
    const coverage = computeLocationCoverage(locations, activities);

    return {
      approvedThisMonth: approvedThisMonth.length,
      beneficiariesThisMonth: calculateUniqueAttendance(approvedThisMonth),
      pending: activities.filter((a) => a && a.status === 'pending').length,
      totalLocations: coverage.summary.total,
      locationsNeedingAttention: coverage.summary.needsAttention,
      overallProgress: getOverallProgress(goals)
    };
  }, [approvedActivities, activities, locations, goals]);

  const invalidDateRange = Boolean(filterDateStart && filterDateEnd && filterDateStart > filterDateEnd);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleExport = () => {
    exportToCSV(filteredActivities);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!contractor) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Alert severity="warning">
            Tu usuario no tiene un contratista asignado, por lo que no es posible mostrar el dashboard.
          </Alert>
        </Box>
      </Container>
    );
  }

  const showFilters = tabValue === 1 || tabValue === 2;
  const monthName = new Date().toLocaleDateString('es-CO', { month: 'long' });

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
          <Typography variant="h4" component="h1">
            Dashboard de {getContractorName(contractor)}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            {refreshing ? 'Actualizando...' : 'Actualizar'}
          </Button>
        </Box>

        {refreshing && <LinearProgress sx={{ mb: 2 }} />}

        {loadError && (
          <Alert
            severity="error"
            sx={{ mb: 3 }}
            action={<Button color="inherit" size="small" onClick={() => loadData(true)}>Reintentar</Button>}
          >
            {loadError}
          </Alert>
        )}

        {/* INDICADORES CLAVE */}
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            mb: 3,
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              sm: 'repeat(3, minmax(0, 1fr))',
              md: 'repeat(5, minmax(0, 1fr))'
            }
          }}
        >
          <KpiCard
            label="Actividades aprobadas del mes"
            value={kpis.approvedThisMonth}
            caption={monthName}
            color="primary.main"
          />
          <KpiCard
            label="Beneficiarios del mes"
            value={kpis.beneficiariesThisMonth.toLocaleString('es-CO')}
            caption="Sin duplicados por jornada"
            color="primary.main"
          />
          <KpiCard
            label="Pendientes por aprobar"
            value={kpis.pending}
            caption={kpis.pending > 0 ? 'Requieren tu revisión' : 'Todo al día'}
            color={kpis.pending > 0 ? 'warning.main' : 'success.main'}
          />
          <KpiCard
            label="Sedes sin atención >14 días"
            value={kpis.totalLocations > 0 ? kpis.locationsNeedingAttention : '—'}
            caption={kpis.totalLocations > 0 ? `de ${kpis.totalLocations} sedes activas` : (locationsError ? 'No se cargaron las sedes' : 'Sin sedes registradas')}
            color={kpis.locationsNeedingAttention > 0 ? 'error.main' : 'success.main'}
          />
          <KpiCard
            label={`Avance promedio de metas ${currentYear}`}
            value={kpis.overallProgress === null ? '—' : `${Math.round(kpis.overallProgress)}%`}
            caption={kpis.overallProgress === null ? 'Sin metas cargadas' : 'Promedio de componentes'}
            color="primary.main"
            sx={{ gridColumn: { xs: 'span 2', sm: 'auto' } }}
          />
        </Box>

        {goals && !goals.hasGoals && (
          <Alert severity="info" sx={{ mb: 3 }}>
            El distrito aún no ha cargado las metas de {currentYear} para {getContractorName(contractor)}.
            Cuando estén disponibles, aquí verás tu avance por componente.
          </Alert>
        )}

        {goalsError && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            No se pudo calcular el avance de metas en este momento. Intenta actualizar más tarde.
          </Alert>
        )}

        {/* PESTAÑAS */}
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          indicatorColor="primary"
          textColor="primary"
          sx={{ mb: 3 }}
        >
          <Tab label="Cobertura de sedes" />
          <Tab label="Resumen" />
          <Tab label="Actividades" />
          <Tab label="Reporte de Usuarios" />
        </Tabs>

        {/* FILTROS (solo aplican a Resumen y Actividades; también definen lo que se exporta) */}
        {showFilters && (
          <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel id="contractor-filter-type-label">Tipo de Actividad</InputLabel>
                  <Select
                    labelId="contractor-filter-type-label"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    label="Tipo de Actividad"
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    <MenuItem value="nutrition">{getActivityTypeLabel('nutrition', contractor)}</MenuItem>
                    <MenuItem value="physical">{getActivityTypeLabel('physical', contractor)}</MenuItem>
                    <MenuItem value="psychosocial">{getActivityTypeLabel('psychosocial', contractor)}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
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

              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Hasta"
                  type="date"
                  value={filterDateEnd}
                  onChange={(e) => setFilterDateEnd(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  error={invalidDateRange}
                  helperText={invalidDateRange ? 'Debe ser posterior a la fecha inicial' : undefined}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<FileDownloadIcon />}
                  onClick={handleExport}
                  disabled={filteredActivities.length === 0}
                >
                  Exportar CSV ({filteredActivities.length})
                </Button>
              </Grid>
            </Grid>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Mostrando {filteredActivities.length} de {approvedActivities.length} actividades aprobadas.
              El CSV exporta las actividades con los filtros aplicados.
            </Typography>
          </Paper>
        )}

        {/* CONTENIDO DE PESTAÑAS */}
        {tabValue === 0 && (
          <>
            {locationsError && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                No se pudieron cargar las sedes registradas. Intenta actualizar; si el problema continúa, avisa al distrito.
              </Alert>
            )}
            <LocationCoveragePanel
              locations={locations}
              activities={activities}
              title="Cobertura de sedes"
            />
          </>
        )}

        {tabValue === 1 && (
          <OverviewTab
            activities={filteredActivities}
            goals={goals}
            user={user}
          />
        )}

        {tabValue === 2 && (
          <ActivitiesTab
            activities={filteredActivities}
            goals={goals}
            user={user}
          />
        )}

        {tabValue === 3 && (
          <UsersReportTab
            activities={activities}
            user={user}
          />
        )}
      </Box>
    </Container>
  );
};

export default ContractorDashboard;
