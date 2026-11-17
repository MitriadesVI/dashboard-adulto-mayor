// src/components/field/FieldUserDashboard.jsx - REFACTORIZACIÓN COMPLETA
import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  Divider as MuiDivider
} from '@mui/material';

// Servicios
import activitiesService from '../../services/activitiesService'; 

// Helpers específicos del personal de campo
import {
  calculateFieldUserKPIs,
  getStatsByStrategy,
  getStatsByModality,
  calculateActiveStreak,
  getComparativeData,
  generateAchievements,
  generateInsights,
  fetchUserActivitiesForPeriodAndComparison, 
  getDateRangeForPeriod, 
  filterByDateRange,
} from './utils/fieldHelpers';

// Componentes del dashboard de campo
import FieldKPICards from './stats/FieldKPICards';
import FieldStatsChart from './stats/FieldStatsChart';
import FieldStrategiesTable from './stats/FieldStrategiesTable';
import FieldExportButton from './stats/FieldExportButton';
import FieldAchievements from './gamification/FieldAchievements';
import FieldInsights from './gamification/FieldInsights';

// Constantes
const PERIOD_OPTIONS = [
  { value: '7days', label: 'Últimos 7 días' },
  { value: '30days', label: 'Últimos 30 días' },
  { value: '90days', label: 'Últimos 90 días' },
];

const FieldUserDashboard = ({ user }) => {
  // ========== ESTADOS PRINCIPALES ==========
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('7days');
  const [dataLoaded, setDataLoaded] = useState(false);

  // Estados de datos (inicializados vacíos)
  const [kpiData, setKpiData] = useState(null);
  const [strategiesStats, setStrategiesStats] = useState([]);
  const [modalityStats, setModalityStats] = useState([]);
  const [activeStreak, setActiveStreak] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [achievements, setAchievements] = useState([]);
  const [insights, setInsights] = useState([]);

  // Cache de datos con useRef para evitar re-renders
  const cacheRef = useRef({
    userActivities: [],
    colleaguesActivities: [],
    lastLoadTime: null
  });

  const [currentDateRange, setCurrentDateRange] = useState(() => getDateRangeForPeriod('7days'));
  const [activitiesForExport, setActivitiesForExport] = useState([]);

  // ========== VALORES MEMOIZADOS ==========
  const userId = useMemo(() => user?.uid, [user?.uid]);
  const userContractor = useMemo(() => user?.contractor, [user?.contractor]);

  // ========== FUNCIÓN PARA PROCESAR DATOS (OPTIMIZADA) ==========
  const processDashboardData = useCallback(async (selectedPeriod) => {
    if (!userId || !userContractor) {
      setError("Usuario no definido correctamente.");
      return;
    }
    
    try {
      const userActivities = cacheRef.current.userActivities;
      const colleaguesActivities = cacheRef.current.colleaguesActivities;

      const {
        currentPeriodActivities,
        previousPeriodActivities,
        educationalActivitiesFullHistory,
        dateRange,
      } = await fetchUserActivitiesForPeriodAndComparison(
        userId,
        selectedPeriod,
        userActivities
      );

      setCurrentDateRange(dateRange);
      
      // Filtrar actividades para exportación (el botón excluye las rechazadas)
      setActivitiesForExport(
        filterByDateRange(userActivities, dateRange.currentStartDate, dateRange.currentEndDate)
      );

      // Las pendientes y rechazadas no cuentan en los KPIs ni en el ranking (solo aprobadas); se informan aparte
      setPendingCount(userActivities.filter(act => act.status === 'pending').length);
      setRejectedCount(userActivities.filter(act => act.status === 'rejected').length);

      // Calcular KPIs
      const kpis = calculateFieldUserKPIs(currentPeriodActivities);
      setKpiData(kpis);

      // Calcular estadísticas
      setStrategiesStats(getStatsByStrategy(currentPeriodActivities, userContractor));
      setModalityStats(getStatsByModality(currentPeriodActivities));
      // La racha cuenta los días en que se registraron actividades (aprobadas o pendientes, no rechazadas)
      setActiveStreak(calculateActiveStreak(userActivities.filter(act => act.status !== 'rejected')));
      
      // Datos comparativos
      const comparativeData = getComparativeData(
        currentPeriodActivities,
        colleaguesActivities,
        userContractor,
        userId,
        dateRange.currentStartDate,
        dateRange.currentEndDate
      );
      
      if (comparativeData.currentUserMetrics) {
        comparativeData.currentUserMetrics.rawActivities = currentPeriodActivities;
      }

      // Generar logros e insights
      const userAchievements = generateAchievements(comparativeData, userContractor);
      setAchievements(userAchievements);

      const userInsights = generateInsights(
        educationalActivitiesFullHistory,
        currentPeriodActivities,
        previousPeriodActivities
      );
      setInsights(userInsights);

      setDataLoaded(true);
      setError(null);

    } catch (err) {
      console.error("Error procesando datos:", err);
      setError(`Error al procesar datos: ${err.message}`);
    }
  }, [userId, userContractor]);

  // ========== FUNCIÓN DE CARGA DE DATOS (OPTIMIZADA) ==========
  const loadDataAndProcess = useCallback(async (selectedPeriod, forceReload = false) => {
    if (!userId || !userContractor) {
      setError("Usuario no válido.");
      return;
    }
    
    // Verificar si necesitamos recargar datos
    const now = Date.now();
    const lastLoad = cacheRef.current.lastLoadTime;
    const cacheValid = lastLoad && (now - lastLoad) < 5 * 60 * 1000; // 5 minutos
    
    if (!forceReload && cacheValid && cacheRef.current.userActivities.length > 0) {
      await processDashboardData(selectedPeriod);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // ========== CARGA OPTIMIZADA DE ACTIVIDADES DEL USUARIO ==========
      const userActivities = [];
      let lastDoc = null;
      let hasMore = true;
      let pageCount = 0;
      const MAX_PAGES = 20; // Límite de seguridad
      
      while (hasMore && pageCount < MAX_PAGES) {
        const response = await activitiesService.getActivitiesByUser(userId, null, 50, lastDoc);
        if (response?.activities?.length > 0) {
          userActivities.push(...response.activities);
          lastDoc = response.lastVisible;
          hasMore = response.activities.length === 50 && response.lastVisible;
        } else {
          hasMore = false;
        }
        pageCount++;
      }
      
      // ========== CARGA LIMITADA DE ACTIVIDADES COMPARATIVAS ==========
      const systemActivities = await activitiesService.getApprovedActivities({
        contractor: userContractor
      });
      
      // Filtrar solo lo necesario para comparación (el período más largo: últimos 90 días, en días locales)
      const { startDate: comparisonStart, endDate: comparisonEnd } = getDateRangeForPeriod('90days');
      
      const relevantActivities = filterByDateRange(
        systemActivities.filter(act => 
          act.educationalActivity?.included === true &&
          act.createdBy?.role === 'field'
        ),
        comparisonStart,
        comparisonEnd
      );
      
      // Actualizar caché
      cacheRef.current = {
        userActivities,
        colleaguesActivities: relevantActivities,
        lastLoadTime: now
      };

      // Procesar datos
      await processDashboardData(selectedPeriod);

    } catch (err) {
      console.error("Error cargando datos:", err);
      setError(`Error al cargar datos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [userId, userContractor, processDashboardData]);

  // ========== HANDLERS OPTIMIZADOS ==========
  const handlePeriodChange = useCallback((event) => {
    const newPeriod = event.target.value;
    setPeriod(newPeriod);
    
    // Si ya se cargaron los datos, re-procesar inmediatamente
    if (dataLoaded) {
      processDashboardData(newPeriod);
    }
  }, [dataLoaded, processDashboardData]);

  const handleRefresh = useCallback(() => {
    loadDataAndProcess(period, true); // Forzar recarga
  }, [loadDataAndProcess, period]);

  const handleLoadDashboard = useCallback(() => {
    loadDataAndProcess(period, false); // Usar caché si es válido
  }, [loadDataAndProcess, period]);

  // ========== ESTADOS DE CARGA Y ERROR ==========
  const currentPeriodLabel = useMemo(() => 
    PERIOD_OPTIONS.find(p => p.value === period)?.label || period
  , [period]);

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">Información de usuario no disponible.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}> 
      {/* Header */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center" justifyContent="space-between">
          <Grid item xs={12} md={6}>
            <Typography variant="h5" component="h1" gutterBottom>
              Mi Dashboard Personal
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Métricas, logros y análisis de tu desempeño.
            </Typography>
          </Grid>
          <Grid item xs={12} md="auto"> 
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Período</InputLabel>
                <Select 
                  value={period} 
                  label="Período" 
                  onChange={handlePeriodChange}
                  disabled={loading}
                >
                  {PERIOD_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                onClick={dataLoaded ? handleRefresh : handleLoadDashboard}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
              >
                {loading ? 'Cargando...' : dataLoaded ? 'Actualizar' : 'Cargar Dashboard'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Estado inicial */}
      {!dataLoaded && !loading && (
        <Paper sx={{ p: 4, textAlign: 'center', mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            🎯 Dashboard Personal
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Haz clic en "Cargar Dashboard" para ver tus estadísticas, logros y análisis de rendimiento.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={handleLoadDashboard}
            disabled={loading}
          >
            Cargar Mi Dashboard
          </Button>
        </Paper>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress size={50} />
          <Typography sx={{ ml: 2 }}>
            {dataLoaded ? 'Actualizando dashboard...' : 'Cargando tu dashboard...'}
          </Typography>
        </Box>
      )}

      {/* Dashboard content */}
      {dataLoaded && !loading && (
        <Grid container spacing={3}>
          {/* Aviso: las estadísticas solo cuentan actividades aprobadas */}
          {(pendingCount > 0 || rejectedCount > 0) && (
            <Grid item xs={12}>
              <Alert severity="info">
                Tus estadísticas solo cuentan las actividades aprobadas.
                {pendingCount > 0 && ` Tienes ${pendingCount} ${pendingCount === 1 ? 'actividad pendiente' : 'actividades pendientes'} de aprobación.`}
                {rejectedCount > 0 && ` Tienes ${rejectedCount} ${rejectedCount === 1 ? 'actividad rechazada' : 'actividades rechazadas'} por corregir.`}
              </Alert>
            </Grid>
          )}

          {/* KPIs */}
          <Grid item xs={12}>
            <FieldKPICards kpiData={kpiData} />
          </Grid>
          
          {/* Análisis de actividades */}
          <Grid item xs={12} sx={{ mt: 1, mb: 1 }}>
            <MuiDivider>
              <Chip label="Análisis de Actividades Educativas" />
            </MuiDivider>
          </Grid>

          <Grid item xs={12} md={6}>
            <FieldStrategiesTable 
              strategiesData={strategiesStats} 
              userContractor={userContractor} 
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FieldStatsChart 
              title="Actividades por Modalidad" 
              data={modalityStats} 
            />
          </Grid>

          {/* Motivación y rendimiento */}
          <Grid item xs={12} sx={{ mt: 2, mb: 1 }}>
            <MuiDivider>
              <Chip label="Motivación y Rendimiento" />
            </MuiDivider>
          </Grid>

          <Grid item xs={12} md={7}>
            <FieldAchievements 
              achievements={achievements} 
              activeStreak={activeStreak} 
            />
          </Grid>

          <Grid item xs={12} md={5}>
            <FieldInsights insights={insights} />
          </Grid>
          
          {/* Exportación */}
          <Grid item xs={12} sx={{ mt: 2, mb: 1 }}>
            <MuiDivider />
          </Grid>

          <Grid item xs={12} sx={{ textAlign: 'right', mt: 1 }}>
            <FieldExportButton
              activities={activitiesForExport} 
              userContractor={userContractor}
              dateRange={currentDateRange}
              periodLabel={currentPeriodLabel}
            />
          </Grid>

          {/* Información de datos */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="caption" color="text.secondary">
                📊 Datos cargados: {cacheRef.current.userActivities.length} actividades tuyas, {cacheRef.current.colleaguesActivities.length} de colegas para comparación. 
                {cacheRef.current.lastLoadTime && (
                  <> Última actualización: {new Date(cacheRef.current.lastLoadTime).toLocaleTimeString()}</>
                )}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Container>
  );
};

export default React.memo(FieldUserDashboard);