// src/components/approval/ApprovalPanel.jsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  Paper, 
  Typography, 
  Box, 
  List, 
  ListItem, 
  ListItemText,
  ListItemSecondaryAction, 
  IconButton, 
  Button, 
  Divider,
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Grid, 
  TextField, 
  Chip, 
  Avatar, 
  CircularProgress,
  Alert,
  Snackbar,
  Tab,
  Tabs
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FilterListIcon from '@mui/icons-material/FilterList';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import activitiesService from '../../services/activitiesService';

// Importar los nuevos componentes para las pestañas adicionales
import UserManagementPanel from '../contractor/UserManagementPanel';
import ContractorDashboard from '../contractor/ContractorDashboard';

const ApprovalPanel = ({ user }) => {
  // Todos los hooks deben ser declarados primero, sin condiciones
  const [activities, setActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [confirmedActivity, setConfirmedActivity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [activityTabValue, setActivityTabValue] = useState(0);
  const [mainTabValue, setMainTabValue] = useState(0);
  
  // Handler para tabs principales
  const handleMainTabChange = (event, newValue) => {
    setMainTabValue(newValue);
  };

  // Usar useCallback para loadActivities
  const loadActivities = useCallback(async () => {
    if (mainTabValue !== 0 || !user || !user.contractor) {
      setLoadingActivities(false);
      return;
    }
    console.log("ApprovalPanel: Cargando actividades para contratista:", user.contractor);
    setLoadingActivities(true);
    try {
      const pendingActivities = await activitiesService.getPendingActivitiesByContractor(user.contractor);
      setActivities(pendingActivities);
    } catch (error) {
      console.error('Error al cargar actividades pendientes:', error);
      setSnackbar({
        open: true,
        message: 'Error al cargar actividades pendientes',
        severity: 'error'
      });
    } finally {
      setLoadingActivities(false);
    }
  }, [user, mainTabValue]);

  useEffect(() => {
    if (mainTabValue === 0) {
      loadActivities();
    }
  }, [mainTabValue, loadActivities]);

  // Funciones helper
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

  // Handlers para acciones
  const handleViewDetails = (activity) => {
    setSelectedActivity(activity);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedActivity(null);
  };

  const handleOpenRejectDialog = (activity) => {
    setConfirmedActivity(activity);
    setRejectDialogOpen(true);
  };

  const handleCloseRejectDialog = () => {
    setRejectDialogOpen(false);
    setRejectionReason('');
    setConfirmedActivity(null);
  };

  const handleReject = async () => {
    if (confirmedActivity && rejectionReason && user) {
      setLoading(true);
      try {
        await activitiesService.rejectActivity(confirmedActivity.id, rejectionReason, user);
        setActivities(activities.filter(a => a.id !== confirmedActivity.id));
        setSnackbar({
          open: true,
          message: 'Actividad rechazada correctamente',
          severity: 'info'
        });
        handleCloseRejectDialog();
      } catch (error) {
        console.error('Error al rechazar actividad:', error);
        setSnackbar({
          open: true,
          message: 'Error al rechazar actividad',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleApprove = async (activity) => {
    if (!user) return;
    setLoading(true);
    try {
      await activitiesService.approveActivity(activity.id, user);
      setActivities(activities.filter(a => a.id !== activity.id));
      setSnackbar({
        open: true,
        message: 'Actividad aprobada correctamente',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error al aprobar actividad:', error);
      setSnackbar({
        open: true,
        message: 'Error al aprobar actividad',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({
      ...prev,
      open: false
    }));
  };

  const handleActivityTabChange = (event, newValue) => {
    setActivityTabValue(newValue);
  };

  // Filtrar actividades por tipo según la pestaña seleccionada
  const filteredActivities = activities.filter(activity => {
    if (activityTabValue === 0) return true; // Todas
    if (activityTabValue === 1) return activity.type === 'nutrition';
    if (activityTabValue === 2) return activity.type === 'physical';
    if (activityTabValue === 3) return activity.type === 'psychosocial';
    return true;
  });

  // Verificación si 'user' o 'user.contractor' no están disponibles (ahora después de declarar los hooks)
  if (!user || !user.contractor) {
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 4, textAlign: 'center' }}>
        <Typography variant="h6">Cargando datos del panel de aprobación...</Typography>
        <CircularProgress sx={{ mt: 2 }}/>
      </Paper>
    );
  }

  return (
    <Box sx={{pb: 4}}>
      <Paper elevation={3} sx={{ p: 1, mb: 3, position: 'sticky', top: 64, zIndex: 100 }}>
        <Tabs 
          value={mainTabValue} 
          onChange={handleMainTabChange} 
          variant="fullWidth" 
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Aprobación de Actividades" />
          <Tab label="Usuarios" />
          <Tab label="Dashboard Contratista" />
        </Tabs>
      </Paper>
      
      {/* Contenido de la Pestaña 0: Aprobación de Actividades */}
      {mainTabValue === 0 && (
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}> 
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" gutterBottom>
              Actividades Pendientes de Aprobación
            </Typography>
            <Button
              variant="outlined"
              startIcon={<FilterListIcon />}
              onClick={loadActivities}
              disabled={loadingActivities}
            >
              {loadingActivities ? <CircularProgress size={24} /> : "Actualizar"}
            </Button>
          </Box>

          <Tabs 
            value={activityTabValue} 
            onChange={handleActivityTabChange} 
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            indicatorColor="secondary"
            textColor="secondary"
            sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Todas" />
            <Tab label={getActivityTypeLabel('nutrition', user.contractor)} />
            <Tab label={getActivityTypeLabel('physical', user.contractor)} />
            <Tab label={getActivityTypeLabel('psychosocial', user.contractor)} />
          </Tabs>

          {loadingActivities ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
          ) : filteredActivities.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="textSecondary">
                No hay actividades pendientes de aprobación en esta categoría.
              </Typography>
            </Box>
          ) : (
            <List sx={{p:0}}>
              {filteredActivities.map((activity, index) => (
                <React.Fragment key={activity.id}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="subtitle1">
                            {getActivitySubtypeLabel(activity.type, activity.subtype, activity.contractor)}
                          </Typography>
                          <Chip 
                            size="small" 
                            label={getActivityTypeLabel(activity.type, activity.contractor)} 
                            sx={{ ml: 1 }} 
                            color={
                              activity.type === 'nutrition' ? 'success' :
                              activity.type === 'physical' ? 'primary' :
                              'secondary'
                            }
                          />
                        </Box>
                      }
                      secondary={
                        <React.Fragment>
                          <Typography variant="body2" component="span">
                            {activity.location.name} ({activity.location.type === 'center' ? 'Centro de Vida' : 'Parque/Espacio'}) - 
                            {formatDate(activity.date)} - {activity.beneficiaries} beneficiarios - 
                            Jornada: {activity.schedule === 'morning' ? 'Mañana' : 'Tarde'}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            <Avatar 
                              sx={{ width: 24, height: 24, mr: 1, fontSize: '0.8rem' }}
                            >
                              {activity.createdBy.name.charAt(0)}
                            </Avatar>
                            <Typography variant="caption">
                              Registrado por: {activity.createdBy.name}
                            </Typography>
                          </Box>
                        </React.Fragment>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton 
                        edge="end" 
                        aria-label="ver detalles"
                        onClick={() => handleViewDetails(activity)}
                        sx={{ mr: 1 }}
                      >
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton 
                        edge="end" 
                        aria-label="aprobar"
                        color="success"
                        onClick={() => handleApprove(activity)}
                        disabled={loading}
                        sx={{ mr: 1 }}
                      >
                        <CheckCircleIcon />
                      </IconButton>
                      <IconButton 
                        edge="end" 
                        aria-label="rechazar"
                        color="error"
                        onClick={() => handleOpenRejectDialog(activity)}
                        disabled={loading}
                      >
                        <CancelIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < filteredActivities.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>
      )}
      
      {/* Contenido de la Pestaña 1: Gestión de Usuarios */}
      {mainTabValue === 1 && (
        <UserManagementPanel user={user} />
      )}
      
      {/* Contenido de la Pestaña 2: Dashboard del Contratista */}
      {mainTabValue === 2 && (
        <ContractorDashboard user={user} />
      )}
      
      {/* Diálogo para ver detalles */}
      <Dialog
        open={detailsOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        {selectedActivity && (
          <>
            <DialogTitle>
              Detalles de la Actividad
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Información General
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body1" fontWeight="bold">
                      {getActivitySubtypeLabel(selectedActivity.type, selectedActivity.subtype, selectedActivity.contractor)}
                    </Typography>
                    <Chip 
                      size="small" 
                      label={getActivityTypeLabel(selectedActivity.type, selectedActivity.contractor)} 
                      sx={{ mb: 1 }} 
                      color={
                        selectedActivity.type === 'nutrition' ? 'success' :
                        selectedActivity.type === 'physical' ? 'primary' :
                        'secondary'
                      }
                    />
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
                      <strong>Beneficiarios:</strong> {selectedActivity.beneficiaries} personas mayores
                    </Typography>
                    <Typography variant="body2">
                      <strong>Registrado por:</strong> {selectedActivity.createdBy.name}
                    </Typography>
                  </Box>
                  
                  <Typography variant="subtitle1" gutterBottom>
                    Descripción de la Actividad
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {selectedActivity.description}
                  </Typography>
                  
                  <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                    Ubicación
                  </Typography>
                  <Box sx={{ height: 200, mb: 2 }}>
                    {selectedActivity.location.coordinates && (
                      <MapContainer 
                        center={[selectedActivity.location.coordinates.lat, selectedActivity.location.coordinates.lng]} 
                        zoom={13} 
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        <Marker position={[selectedActivity.location.coordinates.lat, selectedActivity.location.coordinates.lng]}>
                          <Popup>
                            {selectedActivity.location.name}<br />
                            {selectedActivity.location.type === 'center' ? 'Centro de Vida' : 'Parque/Espacio Comunitario'}
                          </Popup>
                        </Marker>
                      </MapContainer>
                    )}
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Evidencia Fotográfica
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {selectedActivity.photos && selectedActivity.photos.length > 0 ? (
                      selectedActivity.photos.map((photo, index) => (
                        <Box 
                          key={index} 
                          component="img" 
                          src={photo} 
                          sx={{ 
                            width: '100%', 
                            maxHeight: 300, 
                            objectFit: 'contain',
                            borderRadius: 1 
                          }} 
                        />
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No hay evidencia fotográfica para esta actividad.
                      </Typography>
                    )}
                    
                    {selectedActivity.driveLink && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2">Enlace a Google Drive:</Typography>
                        <Button 
                          variant="outlined" 
                          href={selectedActivity.driveLink} 
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Ver en Google Drive
                        </Button>
                      </Box>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDetails}>Cerrar</Button>
              <Button 
                variant="contained" 
                color="error" 
                onClick={() => {
                  handleCloseDetails();
                  handleOpenRejectDialog(selectedActivity);
                }}
                disabled={loading}
              >
                Rechazar
              </Button>
              <Button 
                variant="contained" 
                color="success" 
                onClick={() => {
                  handleApprove(selectedActivity);
                  handleCloseDetails();
                }}
                disabled={loading}
              >
                Aprobar
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Diálogo para rechazar */}
      <Dialog
        open={rejectDialogOpen}
        onClose={handleCloseRejectDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Rechazar Actividad
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            Por favor, indique el motivo del rechazo para que el personal de campo pueda corregir la información.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            id="rejectionReason"
            label="Motivo del rechazo"
            type="text"
            fullWidth
            multiline
            rows={4}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRejectDialog}>Cancelar</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleReject}
            disabled={!rejectionReason.trim() || loading}
          >
            {loading ? <CircularProgress size={24} /> : "Confirmar Rechazo"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificaciones */}
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
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ApprovalPanel;