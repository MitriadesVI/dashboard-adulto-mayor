import React, { useState, useEffect } from 'react';
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
  Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import CloudSyncIcon from '@mui/icons-material/CloudSync';

import ActivityForm from '../activities/ActivityForm';
import activitiesService from '../../services/activitiesService';
import localStorageService from '../../services/localStorageService';
import syncService from '../../services/syncService';

const ActivitiesPage = ({ user }) => {
  const [activities, setActivities] = useState([]);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [formVisible, setFormVisible] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [offline, setOffline] = useState(!localStorageService.isOnline());
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Estados para la sincronización
  const [pendingSync, setPendingSync] = useState(0);
  const [syncingActivities, setSyncingActivities] = useState(false);

  useEffect(() => {
    // Cargar actividades al inicio y cuando cambie el tab
    loadActivities();
    
    // Comprobar actividades pendientes de sincronizar
    checkPendingActivities();
    
    // Escuchar cambios en la conexión
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [tabValue, user]);

  const handleOnline = () => {
    setOffline(false);
    setSnackbar({
      open: true,
      message: 'Conexión restablecida. Puede sincronizar sus actividades pendientes.',
      severity: 'success'
    });
    checkPendingActivities();
  };

  const handleOffline = () => {
    setOffline(true);
    setSnackbar({
      open: true,
      message: 'Sin conexión. Las actividades se guardarán localmente.',
      severity: 'warning'
    });
  };

  const checkPendingActivities = () => {
    const pendingActivities = localStorageService.getPendingActivities();
    setPendingSync(pendingActivities.length);
  };

  const loadActivities = async (loadMore = false) => {
    setLoading(true);
    try {
      // Determinar el estado según la pestaña seleccionada
      let status = null;
      if (tabValue === 1) status = 'pending';
      else if (tabValue === 2) status = 'approved';
      else if (tabValue === 3) status = 'rejected';
      
      const response = await activitiesService.getActivitiesByUser(
        user.uid, 
        status, 
        10, 
        loadMore ? lastVisible : null
      );
      
      if (loadMore) {
        setActivities(prev => [...prev, ...response.activities]);
      } else {
        setActivities(response.activities);
      }
      
      setLastVisible(response.lastVisible);
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
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleActivitySuccess = (activityId = null) => {
    setFormVisible(false);
    loadActivities();
    checkPendingActivities();
    
    setSnackbar({
      open: true,
      message: activityId ? 'Actividad guardada localmente. Se sincronizará cuando haya conexión.' : 'Actividad registrada correctamente',
      severity: activityId ? 'info' : 'success'
    });
  };

  const handleViewDetails = (activity) => {
    setSelectedActivity(activity);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedActivity(null);
  };

  const handleEditRejected = (activity) => {
    // Preparar datos para editar
    setSelectedActivity(activity);
    setFormVisible(true);
  };

  const handleSyncActivities = async () => {
    if (pendingSync === 0 || offline) return;
    
    setSyncingActivities(true);
    try {
      const result = await syncService.syncPendingActivities(user);
      
      if (result.success) {
        setPendingSync(0);
        setSnackbar({
          open: true,
          message: `${result.synced} actividades sincronizadas correctamente`,
          severity: 'success'
        });
        
        // Recargar actividades para reflejar los cambios
        loadActivities();
      } else {
        setSnackbar({
          open: true,
          message: 'Error al sincronizar algunas actividades',
          severity: 'warning'
        });
      }
    } catch (error) {
      console.error('Error durante la sincronización:', error);
      setSnackbar({
        open: true,
        message: 'Error al sincronizar actividades',
        severity: 'error'
      });
    } finally {
      setSyncingActivities(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

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

  const getActivitySubtypeLabel = (type, subtype, contractor) => {
    const subtypeMap = {
      nutrition: {
        workshop: contractor === 'CUC' ? 'Taller educativo del cuidado nutricional' : 'Jornada de promoción de la salud nutricional',
        ration: 'Raciones alimenticias/meriendas'
      },
      physical: {
        prevention: 'Charlas de prevención de enfermedad',
        therapeutic: 'Actividad física terapéutica',
        rumba: 'Rumbaterapia y ejercicios dirigidos',
        walking: 'Club de caminantes'
      },
      psychosocial: {
        mental: 'Jornadas/talleres en salud mental',
        cognitive: 'Jornadas/talleres cognitivos',
        abuse: 'Talleres en prevención al maltrato',
        arts: 'Talleres en artes y oficios',
        intergenerational: 'Encuentros intergeneracionales'
      }
    };

    return subtypeMap[type] && subtypeMap[type][subtype] ? subtypeMap[type][subtype] : subtype;
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
  };

  const getStatusChip = (status) => {
    if (status === 'pending') {
      return <Chip size="small" label="Pendiente" color="warning" />;
    } else if (status === 'approved') {
      return <Chip size="small" label="Aprobada" color="success" />;
    } else if (status === 'rejected') {
      return <Chip size="small" label="Rechazada" color="error" />;
    } else if (status === 'offline') {
      return <Chip size="small" label="Sin sincronizar" color="default" />;
    }
    return null;
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <Grid item xs>
            <Typography variant="h4" component="h1">
              Mis Actividades
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {user.contractor} - {user.name}
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
            Actualmente está trabajando sin conexión. Las actividades se guardarán localmente y podrán sincronizarse cuando se restablezca la conexión.
          </Alert>
        )}

        {formVisible ? (
          <ActivityForm 
            user={user} 
            onSuccess={handleActivitySuccess} 
            initialData={selectedActivity}
            onCancel={() => setFormVisible(false)}
          />
        ) : (
          <>
            <Paper sx={{ mb: 3 }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
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

            {loading && activities.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : activities.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  No hay actividades registradas en esta categoría.
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
                  {activities.map((activity, index) => (
                    <React.Fragment key={activity.id}>
                      <ListItem
                        secondaryAction={
                          <Box>
                            <IconButton 
                              edge="end" 
                              onClick={() => handleViewDetails(activity)}
                              size="small"
                            >
                              <VisibilityIcon />
                            </IconButton>
                            {activity.status === 'rejected' && (
                              <IconButton 
                                edge="end" 
                                onClick={() => handleEditRejected(activity)}
                                size="small"
                                sx={{ ml: 1 }}
                              >
                                <EditIcon />
                              </IconButton>
                            )}
                          </Box>
                        }
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="subtitle1">
                                {getActivitySubtypeLabel(activity.type, activity.subtype, activity.contractor)}
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
                                {' - '}{activity.location.name}
                                {', '}{activity.beneficiaries} beneficiarios
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
                      {index < activities.length - 1 && <Divider component="li" />}
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
      </Box>

      {/* Dialog para ver detalles de actividad */}
      <Dialog
        open={detailsOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        {selectedActivity && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                  Detalles de la Actividad
                </Typography>
                {getStatusChip(selectedActivity.status)}
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                      {getActivitySubtypeLabel(selectedActivity.type, selectedActivity.subtype, selectedActivity.contractor)}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Tipo:</strong> {getActivityTypeLabel(selectedActivity.type, selectedActivity.contractor)}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Fecha:</strong> {formatDate(selectedActivity.date)}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Lugar:</strong> {selectedActivity.location.name} 
                      ({selectedActivity.location.type === 'center' ? 'Centro de Vida' : 'Parque/Espacio'})
                    </Typography>
                    <Typography variant="body2">
                      <strong>Jornada:</strong> {selectedActivity.schedule === 'morning' ? 'Mañana' : 'Tarde'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Beneficiarios:</strong> {selectedActivity.beneficiarios || 0}
                    </Typography>
                    
                    {selectedActivity.createdAt && (
                      <Typography variant="body2">
                        <strong>Fecha de registro:</strong> {formatDate(selectedActivity.createdAt.toDate())}
                      </Typography>
                    )}
                    
                    {selectedActivity.status === 'approved' && selectedActivity.approvedBy && (
                      <>
                        <Typography variant="body2">
                          <strong>Aprobado por:</strong> {selectedActivity.approvedBy.name}
                        </Typography>
                        {selectedActivity.approvedAt && (
                          <Typography variant="body2">
                            <strong>Fecha de aprobación:</strong> {formatDate(selectedActivity.approvedAt.toDate())}
                          </Typography>
                        )}
                      </>
                    )}
                    
                    {selectedActivity.status === 'rejected' && (
                      <>
                        {selectedActivity.approvedBy && (
                          <Typography variant="body2">
                            <strong>Rechazado por:</strong> {selectedActivity.approvedBy.name}
                          </Typography>
                        )}
                        {selectedActivity.rejectionReason && (
                          <Box sx={{ mt: 1, p: 1, bgcolor: 'error.light', borderRadius: 1 }}>
                            <Typography variant="body2" color="error.contrastText">
                              <strong>Motivo del rechazo:</strong> {selectedActivity.rejectionReason}
                            </Typography>
                          </Box>
                        )}
                      </>
                    )}
                  </Box>
                  
                  <Typography variant="subtitle1" gutterBottom>
                    Descripción
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {selectedActivity.description}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Evidencia Fotográfica
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {selectedActivity.photos && selectedActivity.photos.map((photo, index) => (
                      <Box 
                        key={index} 
                        component="img" 
                        src={photo.url} 
                        alt={`Foto de evidencia ${index + 1}`}
                        sx={{ 
                          width: '100%', 
                          maxHeight: 300, 
                          objectFit: 'contain',
                          borderRadius: 1 
                        }} 
                      />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDetails}>
                Cerrar
              </Button>
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
            </DialogActions>
          </>
        )}
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ActivitiesPage;