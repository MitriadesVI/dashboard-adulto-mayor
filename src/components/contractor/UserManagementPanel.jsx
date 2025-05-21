// Añade este archivo: src/components/contractor/UserManagementPanel.jsx

import React, { useState, useEffect } from 'react';
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
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Snackbar,
  Switch,
  FormControlLabel
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import { collection, query, where, getDocs, doc, updateDoc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import authService from '../../services/authService';

const UserManagementPanel = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Estado para nuevo/editar usuario
  const [formUser, setFormUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'field',
    adminType: 'secondary', // Para administradores secundarios
    contractor: '',
    active: true
  });

  useEffect(() => {
    loadUsers();
  }, [user]);

  // Cargar usuarios del mismo contratista
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('contractor', '==', user.contractor));
      const querySnapshot = await getDocs(q);
      
      const usersData = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        usersData.push({
          id: doc.id,
          ...userData
        });
      });
      
      setUsers(usersData);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      setSnackbar({
        open: true,
        message: 'Error al cargar usuarios',
        severity: 'error'
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleOpenCreateDialog = () => {
    setFormUser({
      name: '',
      email: '',
      password: '',
      role: 'field',
      adminType: 'secondary',
      contractor: user.contractor,
      active: true
    });
    setIsEditing(false);
    setUserDialogOpen(true);
  };

  const handleOpenEditDialog = (user) => {
    setFormUser({
      id: user.id,
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'field',
      adminType: user.adminType || (user.role === 'contractor-admin' ? 'secondary' : ''),
      contractor: user.contractor || '',
      active: user.active !== false // Default true si no está definido
    });
    setIsEditing(true);
    setSelectedUser(user);
    setUserDialogOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormUser(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleRoleChange = (e) => {
    const role = e.target.value;
    setFormUser(prev => ({
      ...prev,
      role: role,
      adminType: role === 'contractor-admin' ? 'secondary' : ''
    }));
  };

  const handleCloseDialog = () => {
    setUserDialogOpen(false);
    setSelectedUser(null);
  };

  const handleCreateUser = async () => {
    try {
      setSaving(true);
      
      // Validaciones básicas
      if (!formUser.name || !formUser.email || (!isEditing && !formUser.password)) {
        setSnackbar({
          open: true,
          message: 'Por favor complete los campos requeridos',
          severity: 'error'
        });
        setSaving(false);
        return;
      }
      
      // Datos del usuario
      const userData = {
        name: formUser.name,
        role: formUser.role,
        contractor: formUser.contractor,
        active: formUser.active
      };
      
      // Si es admin de contratista, añadir el tipo
      if (formUser.role === 'contractor-admin') {
        userData.adminType = formUser.adminType || 'secondary';
      }
      
      if (isEditing) {
        // Actualizar usuario existente
        const userRef = doc(db, 'users', formUser.id);
        await updateDoc(userRef, userData);
        
        setSnackbar({
          open: true,
          message: 'Usuario actualizado correctamente',
          severity: 'success'
        });
      } else {
        // Crear nuevo usuario
        await authService.registerUser(formUser.email, formUser.password, userData);
        
        setSnackbar({
          open: true,
          message: 'Usuario creado correctamente',
          severity: 'success'
        });
      }
      
      handleCloseDialog();
      loadUsers(); // Recargar la lista
    } catch (error) {
      console.error('Error al guardar usuario:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDeleteDialog = (user) => {
    // Solo permitir eliminar si no es main admin o el usuario actual
    if (user.role === 'contractor-admin' && user.adminType === 'main' || user.id === user.uid) {
      setSnackbar({
        open: true,
        message: 'No se puede eliminar este usuario',
        severity: 'error'
      });
      return;
    }
    
    setDeletingUser(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    
    try {
      setSaving(true);
      
      // Opción 1: Marcar como inactivo en lugar de eliminar
      const userRef = doc(db, 'users', deletingUser.id);
      await updateDoc(userRef, { active: false });
      
      // Opción 2: Eliminar realmente (descomentar si prefieres esta opción)
      // await deleteDoc(doc(db, 'users', deletingUser.id));
      
      setSnackbar({
        open: true,
        message: 'Usuario desactivado correctamente',
        severity: 'success'
      });
      
      setDeleteDialogOpen(false);
      loadUsers(); // Recargar la lista
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setSaving(false);
      setDeletingUser(null);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({
      ...prev,
      open: false
    }));
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
  
  const getRoleChipColor = (role) => {
    if (role === 'contractor-admin') return 'primary';
    if (role === 'field') return 'success';
    if (role === 'district') return 'secondary';
    return 'default';
  };

  const isCurrentUserMainAdmin = user.role === 'contractor-admin' && 
                                 (user.adminType === 'main' || !user.adminType);

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Gestión de Usuarios de {user.contractor}
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={handleOpenCreateDialog}
          disabled={loadingUsers}
        >
          Nuevo Usuario
        </Button>
      </Box>

      {loadingUsers ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : users.length === 0 ? (
        <Typography variant="body1" sx={{ textAlign: 'center', p: 3 }}>
          No hay usuarios para mostrar.
        </Typography>
      ) : (
        <List>
          {users.map((userData) => {
            const isMainAdmin = userData.role === 'contractor-admin' && 
                            (userData.adminType === 'main' || !userData.adminType);
            const isCurrentUser = userData.id === user.uid;
            
            return (
              <React.Fragment key={userData.id}>
                <ListItem 
                  sx={{
                    bgcolor: !userData.active ? 'rgba(0,0,0,0.05)' : 'inherit',
                    opacity: !userData.active ? 0.7 : 1
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="subtitle1">
                          {userData.name} {isCurrentUser && '(Tú)'}
                        </Typography>
                        {!userData.active && (
                          <Chip 
                            size="small" 
                            label="Inactivo" 
                            color="error" 
                            sx={{ ml: 1 }} 
                          />
                        )}
                        <Chip 
                          size="small" 
                          label={getRoleText(userData.role, userData.adminType)} 
                          color={getRoleChipColor(userData.role)} 
                          sx={{ ml: 1 }} 
                        />
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2">
                        {userData.email}
                      </Typography>
                    }
                  />
                  <ListItemSecondaryAction>
                    {(isCurrentUserMainAdmin || userData.id === user.uid) && (
                      <IconButton 
                        edge="end" 
                        aria-label="editar"
                        onClick={() => handleOpenEditDialog(userData)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                    )}
                    
                    {isCurrentUserMainAdmin && !isMainAdmin && !isCurrentUser && (
                      <IconButton 
                        edge="end" 
                        aria-label="eliminar"
                        color="error"
                        onClick={() => handleOpenDeleteDialog(userData)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            );
          })}
        </List>
      )}

      {/* Dialog para crear/editar usuario */}
      <Dialog 
        open={userDialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {isEditing ? `Editar Usuario: ${selectedUser?.name}` : 'Crear Nuevo Usuario'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nombre Completo"
                name="name"
                value={formUser.name}
                onChange={handleFormChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Correo Electrónico"
                name="email"
                type="email"
                value={formUser.email}
                onChange={handleFormChange}
                required
                disabled={isEditing} // No permitir cambiar email en edición
              />
            </Grid>
            {!isEditing && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Contraseña"
                  name="password"
                  type="password"
                  value={formUser.password}
                  onChange={handleFormChange}
                  required
                />
              </Grid>
            )}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Rol</InputLabel>
                <Select
                  name="role"
                  value={formUser.role}
                  label="Rol"
                  onChange={handleRoleChange}
                >
                  <MenuItem value="field">Personal de Campo</MenuItem>
                  <MenuItem value="contractor-admin">Administrador</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {formUser.role === 'contractor-admin' && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Administrador</InputLabel>
                  <Select
                    name="adminType"
                    value={formUser.adminType || 'secondary'}
                    label="Tipo de Administrador"
                    onChange={handleFormChange}
                    disabled={true} // Solo se permiten crear secundarios
                  >
                    <MenuItem value="secondary">Administrador Secundario</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formUser.active}
                    onChange={handleFormChange}
                    name="active"
                  />
                }
                label="Usuario Activo"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={handleCreateUser}
            disabled={saving}
          >
            {saving ? <CircularProgress size={24} /> : (isEditing ? "Guardar Cambios" : "Crear Usuario")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para confirmar eliminación */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>
          Desactivar Usuario
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            ¿Está seguro que desea desactivar al usuario {deletingUser?.name}?
            Esta acción no eliminará al usuario, solo lo desactivará.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleDeleteUser}
            disabled={saving}
          >
            {saving ? <CircularProgress size={24} /> : "Desactivar"}
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
    </Paper>
  );
};

export default UserManagementPanel;