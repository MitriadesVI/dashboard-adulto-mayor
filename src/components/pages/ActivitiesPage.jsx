// src/components/pages/ActivitiesPage.jsx - REFACTORIZACIÓN COMPLETA
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  Button,
  Grid,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
  TextField,
  InputAdornment,
  DialogContentText,
  Card,
  CardContent
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import SchoolIcon from '@mui/icons-material/School';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import PersonIcon from '@mui/icons-material/Person';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DashboardIcon from '@mui/icons-material/Dashboard';

import ActivityForm from '../activities/ActivityForm';
import ProfilePanel from '../profile/ProfilePanel';
import activitiesService from '../../services/activitiesService';
import localStorageService from '../../services/localStorageService';
import syncService from '../../services/syncService';

import {
  getActivityTypeLabel,
  getActivitySubtypeLabel,
  formatDate,
  formatSchedule,
  formatLocationType
} from '../dashboard/common/helpers';

// ========== LAZY LOADING PARA FIELDDASHBOARD ==========
const FieldUserDashboard = React.lazy(() => import('../field/FieldUserDashboard'));

const ActivitiesPage = ({ user }) => {
  // ========== ESTADOS PRINCIPALES ==========
  const [mainTabValue, setMainTabValue] = useState(0);
  const [activitiesTabValue, setActivitiesTabValue] = useState(0);
  const [formVisible, setFormVisible] = useState(false);
  
  // Estados de datos
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados de paginación - usando useRef para evitar re-renders
  const lastVisibleRef = useRef(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Estados de UI
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [deletingActivity, setDeletingActivity] = useState(false);
  
  // Estados de conectividad
  const [offline, setOffline] = useState(!localStorageService.isOnline());
  const [pendingSync, setPendingSync] = useState(0);
  const [syncingActivities, setSyncingActivities] = useState(false);
  
  // Estado de notificaciones
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // ========== VALORES MEMOIZADOS ==========
  const userId = useMemo(() => user?.uid, [user?.uid]);
  const userContractor = useMemo(() => user?.contractor, [user?.contractor]);
  
  // ========== FUNCIONES CORE (SIN DEPENDENCIAS PROBLEMÁTICAS) ==========
  const checkPendingActivities = useCallback(() => {
    const pendingActivities = localStorageService.getPendingActivities();
    setPendingSync(pendingActivities.length);
  }, []);

  const getActivityDisplayLabel = useCallback((activity) => {
    if (!activity) return 'Actividad';
    const parts = [];
    if (activity.educationalActivity?.included) {
      const type = activity.educationalActivity.type;
      const subtype = activity.educationalActivity.subtype;
      parts.push(getActivitySubtypeLabel(type, subtype, activity.contractor));
    }
    if (activity.nutritionDelivery?.included) {
      const locationType = activity.location?.type;
      if (locationType === 'center') {
        parts.push('+ Entrega de Raciones');
      } else {
        parts.push('+ Entrega de Meriendas');
      }
    }
    return parts.length > 0 ? parts.join(' ') : 'Actividad';
  }, []);

  // ========== FUNCIÓN DE CARGA OPTIMIZADA ==========
  const loadActivities = useCallback(async (loadMore = false) => {
    if (mainTabValue !== 0 || !userId) return;

    setLoading(true);
    try {
      let status = null;
      if (activitiesTabValue === 1) status = 'pending';
      else if (activitiesTabValue === 2) status = 'approved';
      else if (activitiesTabValue === 3) status = 'rejected';

      const response = await activitiesService.getActivitiesByUser(
        userId,
        status,
        10,
        loadMore ? lastVisibleRef.current : null
      );

      if (loadMore) {
        setActivities(prev => [...prev, ...response.activities]);
      } else {
        setActivities(response.activities);
      }

      lastVisibleRef.current = response.lastVisible;
      setHasMore(response.activities.length === 10);
    } catch (error) {
      console.error('Error al cargar actividades:', error);
      setSnackbar({
        open: true,
        message: 'Error al cargar actividades',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [mainTabValue, userId, activitiesTabValue]); // ← Sin lastVisible

  // ========== HANDLERS DE UI ==========
  const handleMainTabChange = useCallback((event, newValue) => {
    setMainTabValue(newValue);
  }, []);

  const handleActivitiesTabChange = useCallback((event, newValue) => {
    setActivitiesTabValue(newValue);
    lastVisibleRef.current = null; // Reset paginación
    setHasMore(true);
  }, []);

  const handleActivitySuccess = useCallback(() => {
    setFormVisible(false);
    if (mainTabValue === 0) {
      loadActivities();
      checkPendingActivities();
    }
    setSnackbar({
      open: true,
      message: 'Actividad registrada correctamente',
      severity: 'success'
    });
  }, [mainTabValue, loadActivities, checkPendingActivities]);

  // ========== HANDLERS DE ACTIVIDADES ==========
  const handleViewDetails = useCallback((activity) => {
    setSelectedActivity(activity);
    setDetailsOpen(true);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setDetailsOpen(false);
    setSelectedActivity(null);
  }, []);

  const handleEditRejected = useCallback((activity) => {
    setSelectedActivity(activity);
    setFormVisible(true);
  }, []);

  const handleDuplicateActivity = useCallback((activity) => {
    const duplicatedActivity = {
      ...activity,
      date: new Date().toISOString().split('T')[0],
      status: undefined,
      approvedBy: undefined,
      approvedAt: undefined,
      rejectionReason: undefined,
      createdAt: undefined,
      id: undefined,
    };
    
    setSelectedActivity(duplicatedActivity);
    setFormVisible(true);
    
    setSnackbar({
      open: true,
      message: 'Se ha creado un borrador basado en la actividad seleccionada.',
      severity: 'info'
    });
  }, []);

  const handleConfirmDelete = useCallback((activity) => {
    setActivityToDelete(activity);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteActivity = useCallback(async () => {
    if (!activityToDelete?.id) {
      setDeleteDialogOpen(false);
      return;
    }

    setDeletingActivity(true);
    try {
      await activitiesService.deleteActivity(activityToDelete.id);
      
      // Actualizar estado local sin depender del array activities
      setActivities(prev => prev.filter(a => a.id !== activityToDelete.id));
      
      setSnackbar({
        open: true,
        message: 'Actividad eliminada correctamente',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error al eliminar actividad:', error);
      setSnackbar({
        open: true,
        message: 'Error al eliminar la actividad',
        severity: 'error'
      });
    } finally {
      setDeletingActivity(false);
      setDeleteDialogOpen(false);
      setActivityToDelete(null);
    }
  }, [activityToDelete]); // ← Sin activities en dependencias

  // ========== HANDLER DE SINCRONIZACIÓN ==========
  const handleSyncActivities = useCallback(async () => {
    if (pendingSync === 0 || offline) return;
    
    setSyncingActivities(true);
    try {
      const result = await syncService.syncPendingActivities(user);
      
      if (result.success) {
        setPendingSync(0);
        setSnackbar({
          open: true,
          message: `${result.synced} actividades sincronizadas`,
          severity: 'success'
        });
        if (mainTabValue === 0) loadActivities();
      } else {
        setSnackbar({
          open: true,
          message: 'Error al sincronizar algunas actividades',
          severity: 'warning'
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error al sincronizar actividades',
        severity: 'error'
      });
    } finally {
      setSyncingActivities(false);
    }
  }, [pendingSync, offline, user, mainTabValue, loadActivities]);

  // ========== HANDLERS SIMPLES ==========
  const handleCloseSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  const getStatusChip = useCallback((status) => {
    const chipProps = {
      pending: { label: "Pendiente", color: "warning" },
      approved: { label: "Aprobada", color: "success" },
      rejected: { label: "Rechazada", color: "error" },
      offline: { label: "Sin sincronizar", color: "default" }
    };
    
    const props = chipProps[status];
    return props ? <Chip size="small" {...props} /> : null;
  }, []);

  const getTotalBeneficiaries = useCallback((activity) => {
    return activity?.totalBeneficiaries || activity?.beneficiaries || 0;
  }, []);

  // ========== EFECTOS OPTIMIZADOS ==========
  useEffect(() => {
    if (mainTabValue === 0 && userId) {
      loadActivities();
      checkPendingActivities();
    }
  }, [mainTabValue, userId, activitiesTabValue, loadActivities, checkPendingActivities]);

  // Efecto para filtrado (optimizado)
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredActivities(activities);
      return;
    }

    const search = searchTerm.toLowerCase();
    const filtered = activities.filter(activity =>
      activity?.location?.name?.toLowerCase().includes(search) ||
      getActivityDisplayLabel(activity).toLowerCase().includes(search) ||
      activity?.educationalActivity?.description?.toLowerCase().includes(search)
    );
    setFilteredActivities(filtered);
  }, [searchTerm, activities, getActivityDisplayLabel]);

  // Efecto para eventos de conectividad
  useEffect(() => {
    const handleOnline = () => {
      setOffline(false);
      setSnackbar({
        open: true,
        message: 'Conexión restablecida',
        severity: 'success'
      });
      if (mainTabValue === 0) checkPendingActivities();
    };

    const handleOffline = () => {
      setOffline(true);
      setSnackbar({
        open: true,
        message: 'Sin conexión',
        severity: 'warning'
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [mainTabValue, checkPendingActivities]);

  // ========== COMPONENTES MEMOIZADOS ==========
  const ActivitiesContent = React.memo(() => (
    <>
      {formVisible ? (
        <ActivityForm
          user={user}
          onSuccess={handleActivitySuccess}
          initialData={selectedActivity}
          onCancel={() => setFormVisible(false)}
        />
      ) : (
        <>
          <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <Grid item xs>
              <Typography variant="h5" component="h2">
                Gestión de Actividades
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Registra, consulta y gestiona tus actividades
              </Typography>
            </Grid>
            <Grid item>
              {pendingSync > 0 && (
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<CloudSyncIcon />}
                  onClick={handleSyncActivities}
                  disabled={syncingActivities || offline}
                  sx={{ mr: 2 }}
                >
                  {syncingActivities ? <CircularProgress size={24} /> : `Sincronizar (${pendingSync})`}
                </Button>
              )}
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setSelectedActivity(null);
                  setFormVisible(true);
                }}
              >
                Nueva Actividad
              </Button>
            </Grid>
          </Grid>

          {offline && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              Trabajando sin conexión. Las actividades se guardarán localmente.
            </Alert>
          )}

          <Paper sx={{ mb: 3 }}>
            <Tabs
              value={activitiesTabValue}
              onChange={handleActivitiesTabChange}
              variant="fullWidth"
              indicatorColor="primary"
              textColor="primary"
            >
              <Tab label="Todas" />
              <Tab label="Pendientes" />
              <Tab label="Aprobadas" />
              <Tab label="Rechazadas" />
            </Tabs>
          </Paper>

          <TextField
            fullWidth
            variant="outlined"
            placeholder="Buscar actividades..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 3 }}
          />

          {loading && activities.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredActivities.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                {searchTerm
                  ? 'No se encontraron actividades.'
                  : 'No hay actividades registradas.'}
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setFormVisible(true)}
                sx={{ mt: 2 }}
              >
                Registrar Actividad
              </Button>
            </Paper>
          ) : (
            <Paper elevation={2}>
              <List>
                {filteredActivities.map((activity, index) => (
                  <React.Fragment key={activity.id || index}>
                    <ListItem
                      secondaryAction={
                        <Box>
                          <IconButton
                            onClick={() => handleViewDetails(activity)}
                            size="small"
                            title="Ver detalles"
                          >
                            <VisibilityIcon />
                          </IconButton>
                          <IconButton
                            onClick={() => handleDuplicateActivity(activity)}
                            size="small"
                            sx={{ ml: 1 }}
                            title="Duplicar"
                          >
                            <FileCopyIcon />
                          </IconButton>
                          {activity.status === 'rejected' && (
                            <IconButton
                              onClick={() => handleEditRejected(activity)}
                              size="small"
                              sx={{ ml: 1 }}
                              title="Editar"
                            >
                              <EditIcon />
                            </IconButton>
                          )}
                          {activity.status === 'pending' && (
                            <IconButton
                              onClick={() => handleConfirmDelete(activity)}
                              size="small"
                              sx={{ ml: 1 }}
                              title="Eliminar"
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </Box>
                      }
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="subtitle1">
                              {getActivityDisplayLabel(activity)}
                            </Typography>
                            <Box sx={{ ml: 1 }}>
                              {getStatusChip(activity.status)}
                            </Box>
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography variant="body2" component="span" color="text.primary">
                              {formatDate(activity.date)}
                            </Typography>
                            <Typography variant="body2" component="span" color="text.secondary">
                              {' - '}{activity.location?.name || 'Sin ubicación'}
                              {', '}{getTotalBeneficiaries(activity)} beneficiarios
                            </Typography>
                            {activity.status === 'rejected' && activity.rejectionReason && (
                              <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>
                                Motivo: {activity.rejectionReason}
                              </Typography>
                            )}
                          </>
                        }
                      />
                    </ListItem>
                    {index < filteredActivities.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                ))}
              </List>

              {hasMore && (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Button
                    onClick={() => loadActivities(true)}
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={24} /> : "Cargar más"}
                  </Button>
                </Box>
              )}
            </Paper>
          )}
        </>
      )}
    </>
  ));

  const LazyFieldDashboard = React.memo(() => (
    <React.Suspense fallback={
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress size={50} />
        <Typography sx={{ ml: 2 }}>Cargando dashboard...</Typography>
      </Box>
    }>
      <FieldUserDashboard user={user} />
    </React.Suspense>
  ));

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <Grid item xs>
            <Typography variant="h4" component="h1">
              Panel de Usuario
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {userContractor} - {user?.name}
            </Typography>
          </Grid>
        </Grid>

        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={mainTabValue}
            onChange={handleMainTabChange}
            variant="fullWidth"
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab
              icon={<AssignmentIcon />}
              label="Mis Actividades"
              iconPosition="start"
            />
            <Tab
              icon={<DashboardIcon />}
              label="Mi Dashboard"
              iconPosition="start"
            />
            <Tab
              icon={<PersonIcon />}
              label="Mi Perfil"
              iconPosition="start"
            />
          </Tabs>
        </Paper>

        {mainTabValue === 0 && <ActivitiesContent />}
        {mainTabValue === 1 && <LazyFieldDashboard />}
        {mainTabValue === 2 && <ProfilePanel user={user} />}

      </Box>

      {/* DIALOGS */}
      <Dialog open={detailsOpen} onClose={handleCloseDetails} maxWidth="md" fullWidth>
        {selectedActivity && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Detalles de la Actividad</Typography>
                {getStatusChip(selectedActivity.status)}
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Card variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        📋 Información General
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2">
                            <strong>Fecha:</strong> {formatDate(selectedActivity.date)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2">
                            <strong>Contratista:</strong> {selectedActivity.contractor}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2">
                            <strong>Lugar:</strong> {selectedActivity.location?.name || 'No especificado'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2">
                            <strong>Tipo:</strong> {formatLocationType(selectedActivity.location?.type)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2">
                            <strong>Jornada:</strong> {formatSchedule(selectedActivity.schedule)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2">
                            <strong>Beneficiarios:</strong> {getTotalBeneficiaries(selectedActivity)}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
                {selectedActivity.educationalActivity?.included && (
                  <Grid item xs={12}>
                    <Card variant="outlined" sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom color="primary">
                          <SchoolIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                          Actividad Educativa
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Tipo:</strong> {getActivityTypeLabel(selectedActivity.educationalActivity.type, selectedActivity.contractor)}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Actividad:</strong> {getActivitySubtypeLabel(selectedActivity.educationalActivity.type, selectedActivity.educationalActivity.subtype, selectedActivity.contractor)}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                          <strong>Descripción:</strong>
                        </Typography>
                        <Typography variant="body2" paragraph sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                          {selectedActivity.educationalActivity.description || 'Sin descripción'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {selectedActivity.nutritionDelivery?.included && (
                  <Grid item xs={12}>
                    <Card variant="outlined" sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom color="secondary">
                          <RestaurantIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                          Entrega de Alimentos
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Tipo:</strong> {
                            selectedActivity.nutritionDelivery.type === 'centerRation'
                              ? 'Raciones (Centro de Vida)'
                              : selectedActivity.nutritionDelivery.type === 'parkSnack'
                                ? 'Meriendas (Parque/Espacio)'
                                : 'Entrega de alimentos'
                          }
                        </Typography>
                        <Typography variant="body2">
                          <strong>Beneficiarios:</strong> {getTotalBeneficiaries(selectedActivity)}
                        </Typography>
                        {selectedActivity.nutritionDelivery.description && (
                          <Typography variant="body2" paragraph sx={{ bgcolor: 'orange.50', p: 2, borderRadius: 1, mt: 2 }}>
                            {selectedActivity.nutritionDelivery.description}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Estado</Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Registrado por:</strong> {selectedActivity.createdBy?.name || 'Desconocido'}
                      </Typography>
                      {selectedActivity.createdAt && (
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Fecha registro:</strong> {
                            typeof selectedActivity.createdAt === 'object' && selectedActivity.createdAt.toDate
                              ? formatDate(selectedActivity.createdAt.toDate())
                              : formatDate(selectedActivity.createdAt)
                          }
                        </Typography>
                      )}
                      {selectedActivity.status === 'approved' && selectedActivity.approvedBy && (
                        <>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Aprobado por:</strong> {selectedActivity.approvedBy.name}
                          </Typography>
                          {selectedActivity.approvedAt && (
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>Fecha aprobación:</strong> {
                                typeof selectedActivity.approvedAt === 'object' && selectedActivity.approvedAt.toDate
                                  ? formatDate(selectedActivity.approvedAt.toDate())
                                  : formatDate(selectedActivity.approvedAt)
                              }
                            </Typography>
                          )}
                        </>
                      )}
                      {selectedActivity.status === 'rejected' && (
                        <>
                          {selectedActivity.approvedBy && (
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>Rechazado por:</strong> {selectedActivity.approvedBy.name}
                            </Typography>
                          )}
                          {selectedActivity.rejectionReason && (
                            <Box sx={{ mt: 1, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
                              <Typography variant="body2" color="error.contrastText">
                                <strong>Motivo:</strong> {selectedActivity.rejectionReason}
                              </Typography>
                            </Box>
                          )}
                        </>
                      )}
                      {selectedActivity.driveLink && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>Evidencias:</Typography>
                          <Button
                            variant="outlined"
                            href={selectedActivity.driveLink}
                            target="_blank"
                            startIcon={<InsertDriveFileIcon />}
                          >
                            Ver en Drive
                          </Button>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => handleDuplicateActivity(selectedActivity)} startIcon={<FileCopyIcon />}>
                Duplicar
              </Button>
              <Button onClick={handleCloseDetails}>Cerrar</Button>
              {selectedActivity.status === 'rejected' && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => {
                    handleCloseDetails();
                    handleEditRejected(selectedActivity);
                  }}
                >
                  Editar y Reenviar
                </Button>
              )}
              {selectedActivity.status === 'pending' && (
                <Button
                  variant="contained"
                  color="error"
                  onClick={() => {
                    handleCloseDetails();
                    handleConfirmDelete(selectedActivity);
                  }}
                  startIcon={<DeleteIcon />}
                >
                  Eliminar
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Está seguro de que desea eliminar esta actividad? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deletingActivity}>
            Cancelar
          </Button>
          <Button onClick={handleDeleteActivity} color="error" variant="contained" disabled={deletingActivity}>
            {deletingActivity ? <CircularProgress size={24} /> : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ActivitiesPage;