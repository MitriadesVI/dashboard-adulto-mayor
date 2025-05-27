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
  Tabs,
  Card,
  CardContent
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FilterListIcon from '@mui/icons-material/FilterList';
import SchoolIcon from '@mui/icons-material/School';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';

import activitiesService from '../../services/activitiesService';
import UserManagementPanel from '../contractor/UserManagementPanel';
import ContractorDashboard from '../contractor/ContractorDashboard';
import ProfilePanel from '../profile/ProfilePanel';

// IMPORTAR FUNCIONES DEL HELPERS.JS
import { 
  getActivityTypeLabel, 
  getActivitySubtypeLabel, 
  formatDate, 
  formatSchedule,
  formatLocationType
} from '../dashboard/common/helpers';

const ApprovalPanel = ({ user, onUserUpdate }) => {
  const [activities, setActivities] = useState([]);
  const [allActivities, setAllActivities] = useState([]); // Para métricas de aprobación
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
  
  const handleMainTabChange = (event, newValue) => {
    setMainTabValue(newValue);
  };

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

  // Cargar todas las actividades para métricas de aprobación
  const loadAllActivities = useCallback(async () => {
    if (!user || !user.contractor) return;
    
    try {
      const allActivitiesData = await activitiesService.getAllActivities();
      const contractorActivities = allActivitiesData.filter(a => 
        a && a.contractor === user.contractor
      );
      setAllActivities(contractorActivities);
    } catch (error) {
      console.error('Error al cargar todas las actividades:', error);
    }
  }, [user]);

  useEffect(() => {
    if (mainTabValue === 0) {
      loadActivities();
      loadAllActivities(); // También cargar para métricas
    }
  }, [mainTabValue, loadActivities, loadAllActivities]);

  // FUNCIÓN SIMPLE: Obtener métricas de aprobación del admin actual
  const getApprovalMetrics = () => {
    if (!allActivities.length || !user.uid) {
      return {
        totalApproved: 0,
        totalRejected: 0,
        approvedByType: { nutrition: 0, physical: 0, psychosocial: 0 },
        totalBeneficiariesApproved: 0
      };
    }

    const approvedActivities = allActivities.filter(a => 
      a.status === 'approved' && a.approvedBy?.uid === user.uid
    );
    
    const rejectedActivities = allActivities.filter(a => 
      a.status === 'rejected' && a.approvedBy?.uid === user.uid
    );

    const approvedByType = { nutrition: 0, physical: 0, psychosocial: 0 };
    let totalBeneficiariesApproved = 0;

    approvedActivities.forEach(activity => {
      // Contar beneficiarios
      totalBeneficiariesApproved += Number(activity.totalBeneficiaries) || 0;
      
      // Contar por tipo de actividad educativa
      if (activity.educationalActivity?.included) {
        const type = activity.educationalActivity.type;
        if (approvedByType[type] !== undefined) {
          approvedByType[type] += 1;
        }
      }
    });

    return {
      totalApproved: approvedActivities.length,
      totalRejected: rejectedActivities.length,
      approvedByType,
      totalBeneficiariesApproved
    };
  };

  const getActivityDisplayLabel = (activity) => {
    if (!activity) return 'Actividad';
    
    let parts = [];
    
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
        loadAllActivities(); // Recargar para actualizar métricas
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
      loadAllActivities(); // Recargar para actualizar métricas
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
    
    if (activity.educationalActivity?.included) {
      if (activityTabValue === 1) return activity.educationalActivity.type === 'nutrition';
      if (activityTabValue === 2) return activity.educationalActivity.type === 'physical';
      if (activityTabValue === 3) return activity.educationalActivity.type === 'psychosocial';
    }
    
    return false;
  });

  const getTotalBeneficiaries = (activity) => {
    return activity.totalBeneficiaries || activity.beneficiaries || 0;
  };

  if (!user || !user.contractor) {
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 4, textAlign: 'center' }}>
        <Typography variant="h6">Cargando datos del panel de aprobación...</Typography>
        <CircularProgress sx={{ mt: 2 }}/>
      </Paper>
    );
  }

  // Obtener métricas de aprobación
  const approvalMetrics = getApprovalMetrics();

  return (
    <Box sx={{pb: 4}}>
      <Paper elevation={3} sx={{ p: 1, mb: 3, position: 'sticky', top: 64, zIndex: 100 }}>
        <Tabs 
          value={mainTabValue} 
          onChange={handleMainTabChange} 
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Aprobación de Actividades" />
          <Tab label="Usuarios" />
          <Tab label="Dashboard Contratista" />
          <Tab label="Perfil" />
        </Tabs>
      </Paper>
      
      {/* Contenido de la Pestaña 0: Aprobación de Actividades */}
      {mainTabValue === 0 && (
        <>
          {/* MÉTRICAS DE APROBACIÓN - TARJETAS SIMPLES */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <ThumbUpIcon color="success" sx={{ fontSize: 32, mb: 1 }} />
                  <Typography variant="h6" color="success.main">
                    {approvalMetrics.totalApproved}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Aprobadas por mí
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <ThumbDownIcon color="error" sx={{ fontSize: 32, mb: 1 }} />
                  <Typography variant="h6" color="error.main">
                    {approvalMetrics.totalRejected}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Rechazadas por mí
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <SchoolIcon color="primary" sx={{ fontSize: 32, mb: 1 }} />
                  <Typography variant="h6" color="primary.main">
                    {Object.values(approvalMetrics.approvedByType).reduce((a, b) => a + b, 0)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Act. Educativas
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <RestaurantIcon color="secondary" sx={{ fontSize: 32, mb: 1 }} />
                  <Typography variant="h6" color="secondary.main">
                    {approvalMetrics.totalBeneficiariesApproved}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Beneficiarios
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

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
                              {getActivityDisplayLabel(activity)}
                            </Typography>
                            {activity.educationalActivity?.included && (
                              <Chip 
                                size="small" 
                                label={getActivityTypeLabel(activity.educationalActivity.type, activity.contractor)} 
                                sx={{ ml: 1 }} 
                                color={
                                  activity.educationalActivity.type === 'nutrition' ? 'success' :
                                  activity.educationalActivity.type === 'physical' ? 'primary' :
                                  'secondary'
                                }
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <React.Fragment>
                            <Typography variant="body2" component="span">
                              {activity.location?.name} ({formatLocationType(activity.location?.type)}) - 
                              {formatDate(activity.date)} - {getTotalBeneficiaries(activity)} beneficiarios - 
                              Jornada: {formatSchedule(activity.schedule)}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                              <Avatar 
                                sx={{ width: 24, height: 24, mr: 1, fontSize: '0.8rem' }}
                              >
                                {activity.createdBy?.name ? activity.createdBy.name.charAt(0) : '?'}
                              </Avatar>
                              <Typography variant="caption">
                                Registrado por: {activity.createdBy?.name || 'Usuario desconocido'}
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
        </>
      )}
      
      {/* Contenido de la Pestaña 1: Gestión de Usuarios */}
      {mainTabValue === 1 && (
        <UserManagementPanel user={user} />
      )}
      
      {/* Contenido de la Pestaña 2: Dashboard del Contratista */}
      {mainTabValue === 2 && (
        <ContractorDashboard user={user} />
      )}
      
      {/* Contenido de la Pestaña 3: Perfil */}
      {mainTabValue === 3 && (
        <ProfilePanel user={user} onUserUpdate={onUserUpdate} />
      )}
      
      {/* DIALOG PARA VER DETALLES - IGUAL QUE EN ACTIVITIES PAGE */}
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
                <Chip size="small" label="Pendiente" color="warning" />
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
                        <Grid item xs={12}>
                          <Typography variant="body2">
                            <strong>Registrado por:</strong> {selectedActivity.createdBy?.name || 'Usuario desconocido'}
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

                {/* ENLACE A GOOGLE DRIVE */}
                {selectedActivity.driveLink && (
                  <Grid item xs={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Evidencias
                        </Typography>
                        <Button 
                          variant="outlined" 
                          href={selectedActivity.driveLink} 
                          target="_blank"
                          startIcon={<InsertDriveFileIcon />}
                        >
                          Ver documentos en Drive
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
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