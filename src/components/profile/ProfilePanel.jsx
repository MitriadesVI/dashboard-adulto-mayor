// src/components/profile/ProfilePanel.jsx

import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  Grid,
  TextField,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Snackbar,
  Divider,
  Chip,
  Avatar
} from '@mui/material';
import {
  Lock as LockIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import authService from '../../services/authService';

const ProfilePanel = ({ user, onUserUpdate }) => {
  // Estados para cambio de contraseña
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Estados para edición de perfil
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    displayName: user?.displayName || ''
  });
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Estados para notificaciones
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Handlers para formulario de contraseña
  const handlePasswordFormChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleOpenPasswordDialog = () => {
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordDialogOpen(true);
  };

  const handleClosePasswordDialog = () => {
    setPasswordDialogOpen(false);
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  const handleChangePassword = async () => {
    // Validaciones
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setSnackbar({
        open: true,
        message: 'Por favor complete todos los campos',
        severity: 'error'
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setSnackbar({
        open: true,
        message: 'Las contraseñas nuevas no coinciden',
        severity: 'error'
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setSnackbar({
        open: true,
        message: 'La nueva contraseña debe tener al menos 6 caracteres',
        severity: 'error'
      });
      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setSnackbar({
        open: true,
        message: 'La nueva contraseña debe ser diferente a la actual',
        severity: 'error'
      });
      return;
    }

    setPasswordLoading(true);
    try {
      const result = await authService.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );

      setSnackbar({
        open: true,
        message: result.message,
        severity: 'success'
      });

      handleClosePasswordDialog();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message,
        severity: 'error'
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handlers para formulario de perfil
  const handleProfileFormChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateProfile = async () => {
    if (!profileForm.name.trim()) {
      setSnackbar({
        open: true,
        message: 'El nombre es requerido',
        severity: 'error'
      });
      return;
    }

    setProfileLoading(true);
    try {
      const result = await authService.updateUserProfile(user.uid, {
        name: profileForm.name.trim(),
        displayName: profileForm.displayName.trim() || null
      });

      if (result.success) {
        setSnackbar({
          open: true,
          message: result.message,
          severity: 'success'
        });

        // Actualizar usuario en el componente padre si existe la función
        if (onUserUpdate) {
          onUserUpdate({
            ...user,
            name: profileForm.name.trim(),
            displayName: profileForm.displayName.trim() || null
          });
        }
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message,
        severity: 'error'
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const getRoleText = (role, adminType) => {
    if (role === 'contractor-admin') {
      return adminType === 'main' ? 'Representante Principal' : 'Administrador';
    } else if (role === 'field') {
      return 'Personal de Campo';
    } else if (role === 'district') {
      return 'Distrito';
    }
    return role;
  };

  const getRoleColor = (role) => {
    if (role === 'contractor-admin') return 'primary';
    if (role === 'field') return 'success';
    if (role === 'district') return 'secondary';
    return 'default';
  };

  if (!user) {
    return (
      <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Cargando perfil...
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      {/* INFORMACIÓN DEL USUARIO */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          avatar={
            <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
              <PersonIcon />
            </Avatar>
          }
          title={
            <Typography variant="h5">
              {user.name || 'Usuario'}
            </Typography>
          }
          subheader={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Chip 
                label={getRoleText(user.role, user.adminType)}
                color={getRoleColor(user.role)}
                size="small"
              />
              {user.contractor && (
                <Chip 
                  label={user.contractor}
                  variant="outlined"
                  size="small"
                />
              )}
            </Box>
          }
        />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2">
                  <strong>Email:</strong> {user.email}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <BusinessIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2">
                  <strong>Contratista:</strong> {user.contractor || 'No asignado'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* EDITAR PERFIL */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title="Editar Perfil"
              avatar={<PersonIcon color="primary" />}
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nombre Completo"
                    name="name"
                    value={profileForm.name}
                    onChange={handleProfileFormChange}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nombre para Mostrar (Opcional)"
                    name="displayName"
                    value={profileForm.displayName}
                    onChange={handleProfileFormChange}
                    helperText="Nombre que se mostrará en lugar del nombre completo"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleUpdateProfile}
                    disabled={profileLoading}
                    fullWidth
                  >
                    {profileLoading ? <CircularProgress size={24} /> : "Guardar Cambios"}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* CAMBIAR CONTRASEÑA */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title="Cambiar Contraseña"
              avatar={<LockIcon color="primary" />}
            />
            <CardContent>
              <Typography variant="body2" color="text.secondary" paragraph>
                Por tu seguridad, te recomendamos cambiar tu contraseña regularmente.
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<LockIcon />}
                onClick={handleOpenPasswordDialog}
                fullWidth
              >
                Cambiar Contraseña
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* DIALOG PARA CAMBIAR CONTRASEÑA */}
      <Dialog
        open={passwordDialogOpen}
        onClose={handleClosePasswordDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Cambiar Contraseña
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph sx={{ mt: 1 }}>
            Ingresa tu contraseña actual y la nueva contraseña que deseas usar.
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="password"
                label="Contraseña Actual"
                name="currentPassword"
                value={passwordForm.currentPassword}
                onChange={handlePasswordFormChange}
                required
                autoComplete="current-password"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="password"
                label="Nueva Contraseña"
                name="newPassword"
                value={passwordForm.newPassword}
                onChange={handlePasswordFormChange}
                required
                helperText="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="password"
                label="Confirmar Nueva Contraseña"
                name="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordFormChange}
                required
                autoComplete="new-password"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePasswordDialog}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleChangePassword}
            disabled={passwordLoading}
          >
            {passwordLoading ? <CircularProgress size={24} /> : "Cambiar Contraseña"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* SNACKBAR PARA NOTIFICACIONES */}
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

export default ProfilePanel;