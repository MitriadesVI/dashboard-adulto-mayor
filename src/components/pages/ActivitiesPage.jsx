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

import ActivityForm from '../activities/ActivityForm';
import activitiesService from '../../services/activitiesService';
import localStorageService from '../../services/localStorageService';
import syncService from '../../services/syncService';

// IMPORTAR FUNCIONES DEL HELPERS.JS
import { 
  getActivityTypeLabel, 
  getActivitySubtypeLabel, 
  formatDate, 
  formatSchedule,
  formatLocationType
} from '../dashboard/common/helpers';

const ActivitiesPage = ({ user }) => {
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [formVisible, setFormVisible] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [offline, setOffline] = useState(!localStorageService.isOnline());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [deletingActivity, setDeletingActivity] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Estados para la sincronización
  const [pendingSync, setPendingSync] = useState(0);
  const [syncingActivities, setSyncingActivities] = useState(false);

  useEffect(() => {
    loadActivities();
    checkPendingActivities();
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [tabValue, user]);

  // Efecto para filtrar actividades según la búsqueda
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredActivities(activities);
    } else {
      const lowercasedSearch = searchTerm.toLowerCase();
      setFilteredActivities(
        activities.filter(activity => 
          (activity.location?.name && activity.location.name.toLowerCase().includes(lowercasedSearch)) ||
          (getActivityDisplayLabel(activity).toLowerCase().includes(lowercasedSearch)) ||
          (activity.educationalActivity?.description && activity.educationalActivity.description.toLowerCase().includes(lowercasedSearch))
        )
      );
    }
  }, [searchTerm, activities]);

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
        setFilteredActivities(prev => [...prev, ...response.activities]);
      } else {
        setActivities(response.activities);
        setFilteredActivities(response.activities);
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

  // FUNCIÓN NUEVA PARA OBTENER ETIQUETA DE DISPLAY
  const getActivityDisplayLabel = (activity) => {
    if (!activity) return 'Actividad';
    
    let parts = [];
    
    // Si tiene actividad educativa
    if (activity.educationalActivity?.included) {
      const type = activity.educationalActivity.type;
      const subtype = activity.educationalActivity.subtype;
      parts.push(getActivitySubtypeLabel(type, subtype, activity.contractor));
    }
    
    // Si tiene entrega de alimentos
    if (activity.nutritionDelivery?.included) {
      const locationType = activity.location?.type;
      if (locationType === 'center') {
        parts.push('+ Entrega de Raciones');
      } else {
        parts.push('+ Entrega de Meriendas');
      }
    }
    
    return parts.length > 0 ? parts.join(' ') : 'Actividad';
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
    console.log('Actividad seleccionada para ver detalles:', activity);
    setSelectedActivity(activity);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedActivity(null);
  };

  const handleEditRejected = (activity) => {
    setSelectedActivity(activity);
    setFormVisible(true);
  };

  const handleDuplicateActivity = (activity) => {
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
      message: 'Se ha creado un borrador basado en la actividad seleccionada. Modifique los datos necesarios y guarde.',
      severity: 'info'
    });
  };

  const handleConfirmDelete = (activity) => {
    setActivityToDelete(activity);
    setDeleteDialogOpen(true);
  };

  const handleDeleteActivity = async () => {
    if (!activityToDelete || !activityToDelete.id) {
      setDeleteDialogOpen(false);
      return;
    }

    setDeletingActivity(true);
    try {
      await activitiesService.deleteActivity(activityToDelete.id);
      
      setActivities(activities.filter(a => a.id !== activityToDelete.id));
      setFilteredActivities(filteredActivities.filter(a => a.id !== activityToDelete.id));
      
      setSnackbar({
        open: true,
        message: 'Actividad eliminada correctamente',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error al eliminar actividad:', error);
      setSnackbar({
        open: true,
        message: 'Error al eliminar la actividad. Inténtelo de nuevo.',
        severity: 'error'
      });
    } finally {
      setDeletingActivity(false);
      setDeleteDialogOpen(false);
      setActivityToDelete(null);
    }
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

  const getTotalBeneficiaries = (activity) => {
    return activity.totalBeneficiaries || activity.beneficiaries || 0;
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

            <TextField
              fullWidth
              variant="outlined"
              placeholder="Buscar actividades por nombre, tipo o ubicación..."
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
                    ? 'No se encontraron actividades con el término de búsqueda.' 
                    : 'No hay actividades registradas en esta categoría.'}
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
                              edge="end" 
                              onClick={() => handleViewDetails(activity)}
                              size="small"
                              title="Ver detalles"
                            >
                              <VisibilityIcon />
                            </IconButton>
                            <IconButton 
                              edge="end" 
                              onClick={() => handleDuplicateActivity(activity)}
                              size="small"
                              sx={{ ml: 1 }}
                              title="Duplicar actividad"
                            >
                              <FileCopyIcon />
                            </IconButton>
                            
                            {activity.status === 'rejected' && (
                              <IconButton 
                                edge="end" 
                                onClick={() => handleEditRejected(activity)}
                                size="small"
                                sx={{ ml: 1 }}
                                title="Editar y reenviar"
                              >
                                <EditIcon />
                              </IconButton>
                            )}
                            
                            {activity.status === 'pending' && (
                              <IconButton 
                                edge="end" 
                                onClick={() => handleConfirmDelete(activity)}
                                size="small"
                                sx={{ ml: 1 }}
                                title="Eliminar actividad"
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
      </Box>

      {/* DIALOG CORREGIDO PARA VER DETALLES */}
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
                
                {/* INFORMACIÓN BÁSICA */}
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
                            <strong>Tipo de lugar:</strong> {formatLocationType(selectedActivity.location?.type)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2">
                            <strong>Jornada:</strong> {formatSchedule(selectedActivity.schedule)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2">
                            <strong>Total Beneficiarios:</strong> {getTotalBeneficiaries(selectedActivity)}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* ACTIVIDAD EDUCATIVA */}
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
                          <strong>Actividad específica:</strong> {getActivitySubtypeLabel(selectedActivity.educationalActivity.type, selectedActivity.educationalActivity.subtype, selectedActivity.contractor)}
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

                {/* ENTREGA DE ALIMENTOS */}
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
                              ? 'Raciones alimenticias (Centro de Vida)' 
                              : selectedActivity.nutritionDelivery.type === 'parkSnack'
                                ? 'Meriendas (Parque/Espacio Comunitario)'
                                : selectedActivity.nutritionDelivery.type || 'Entrega de alimentos'
                          }
                        </Typography>
                        
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Beneficiarios atendidos:</strong> {getTotalBeneficiaries(selectedActivity)}
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

                {/* INFORMACIÓN DE ESTADO Y APROBACIÓN */}
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Estado de la Actividad
                      </Typography>
                      
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Registrado por:</strong> {selectedActivity.createdBy?.name || 'Usuario desconocido'}
                      </Typography>
                      
                      {selectedActivity.createdAt && (
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Fecha de registro:</strong> {
                            typeof selectedActivity.createdAt === 'object' && typeof selectedActivity.createdAt.toDate === 'function'
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
                              <strong>Fecha de aprobación:</strong> {
                                typeof selectedActivity.approvedAt === 'object' && typeof selectedActivity.approvedAt.toDate === 'function'
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
                                <strong>Motivo del rechazo:</strong> {selectedActivity.rejectionReason}
                              </Typography>
                            </Box>
                          )}
                        </>
                      )}

                      {/* ENLACE A GOOGLE DRIVE */}
                      {selectedActivity.driveLink && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Evidencias en Google Drive:
                          </Typography>
                          <Button 
                            variant="outlined" 
                            href={selectedActivity.driveLink} 
                            target="_blank"
                            startIcon={<InsertDriveFileIcon />}
                          >
                            Ver documentos en Drive
                          </Button>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => handleDuplicateActivity(selectedActivity)}
                startIcon={<FileCopyIcon />}
              >
                Duplicar
              </Button>
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

      {/* Diálogo de confirmación para eliminar actividad */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Está seguro de que desea eliminar esta actividad? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)} 
            disabled={deletingActivity}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleDeleteActivity} 
            color="error" 
            variant="contained"
            disabled={deletingActivity}
          >
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