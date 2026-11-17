// src/components/contractor/UserManagementPanel.jsx
//
// Equipo de la entidad: el representante legal decide quién registra las actividades
// (profesionales, un encargado de carga o el representante) y administra su equipo.

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
  FormControlLabel,
  Checkbox,
  FormGroup
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import authService from '../../services/authService';
import usersService from '../../services/usersService';
import contractorSettingsService from '../../services/contractorSettingsService';
import { getContractorName } from '../../config/contractors';
import { ROLES, getRoleLabel, REGISTRATION_OPTIONS, DEFAULT_REGISTRATION } from '../../config/roles';

const ROLE_CHIP_COLOR = {
  [ROLES.CONTRACTOR_ADMIN]: 'primary',
  [ROLES.DATA_ENTRY]: 'info',
  [ROLES.FIELD]: 'success',
  [ROLES.DISTRICT]: 'secondary'
};

const emptyForm = (contractor, registration) => ({
  name: '',
  email: '',
  password: '',
  role: ROLES.FIELD,
  adminType: 'secondary',
  contractor,
  active: true,
  // Profesional sin acceso: tiene sentido si otra persona registra por él
  hasLogin: registration?.professionals !== false,
  sendSetupEmail: true,
  documentId: '',
  profession: ''
});

// ---------------------------------------------------------------------------
// ¿Quién registra las actividades? (decisión del representante legal)
// ---------------------------------------------------------------------------
const RegistrationSettingsCard = ({ contractorName, registration, canEdit, onSave }) => {
  const [values, setValues] = useState(registration);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setValues(registration);
  }, [registration]);

  const noneSelected = !values.professionals && !values.dataEntry && !values.representative;
  const changed = REGISTRATION_OPTIONS.some(option => Boolean(values[option.key]) !== Boolean(registration[option.key]));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(values);
    } catch (err) {
      setError(err.message || 'No se pudo guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        ¿Quién registra las actividades en {contractorName}?
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Lo decide el representante legal. Puede elegir una o varias formas. Cuando la registra un
        encargado o el representante, se indica qué profesional realizó la actividad.
      </Typography>
      <FormGroup>
        {REGISTRATION_OPTIONS.map(option => (
          <FormControlLabel
            key={option.key}
            control={
              <Checkbox
                checked={Boolean(values[option.key])}
                onChange={(e) => setValues(prev => ({ ...prev, [option.key]: e.target.checked }))}
                disabled={!canEdit || saving}
              />
            }
            label={
              <Box>
                <Typography variant="body1">{option.label}</Typography>
                <Typography variant="caption" color="text.secondary">{option.help}</Typography>
              </Box>
            }
            sx={{ alignItems: 'flex-start', mb: 1, '& .MuiCheckbox-root': { pt: 0.5 } }}
          />
        ))}
      </FormGroup>
      {noneSelected && (
        <Alert severity="warning" sx={{ mt: 1 }}>Seleccione al menos una forma de registrar.</Alert>
      )}
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      {canEdit ? (
        <Box sx={{ mt: 1.5 }}>
          <Button variant="contained" onClick={handleSave} disabled={!changed || noneSelected || saving}>
            {saving ? <CircularProgress size={22} /> : 'Guardar'}
          </Button>
        </Box>
      ) : (
        <Typography variant="caption" color="text.secondary">
          Solo el representante legal (administrador principal) puede cambiar esta configuración.
        </Typography>
      )}
    </Paper>
  );
};

// ---------------------------------------------------------------------------
// Panel de equipo
// ---------------------------------------------------------------------------
const UserManagementPanel = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [registration, setRegistration] = useState({ ...DEFAULT_REGISTRATION });
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formUser, setFormUser] = useState(() => emptyForm(user.contractor, DEFAULT_REGISTRATION));

  const contractorName = getContractorName(user.contractor);
  const isCurrentUserMainAdmin = user.role === ROLES.CONTRACTOR_ADMIN &&
    (user.adminType === 'main' || !user.adminType);

  const notify = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  // Cargar usuarios del mismo contratista
  const loadUsers = useCallback(async () => {
    if (!user?.contractor) return;
    setLoadingUsers(true);
    try {
      const q = query(collection(db, 'users'), where('contractor', '==', user.contractor));
      const querySnapshot = await getDocs(q);
      const ROLE_ORDER = [ROLES.CONTRACTOR_ADMIN, ROLES.DATA_ENTRY, ROLES.FIELD];
      setUsers(querySnapshot.docs
        .map(userDoc => ({ id: userDoc.id, ...userDoc.data() }))
        .sort((a, b) => (ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)) ||
          (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' })));
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      notify('Error al cargar usuarios', 'error');
    } finally {
      setLoadingUsers(false);
    }
  }, [user?.contractor]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    let cancelled = false;
    contractorSettingsService.getSettings(user.contractor).then(settings => {
      if (!cancelled) setRegistration(settings.registration);
    });
    return () => { cancelled = true; };
  }, [user.contractor]);

  const handleSaveRegistration = async (values) => {
    const saved = await contractorSettingsService.saveRegistration(user.contractor, values, user);
    setRegistration(saved);
    notify('Configuración guardada');
  };

  const handleOpenCreateDialog = () => {
    setFormUser(emptyForm(user.contractor, registration));
    setIsEditing(false);
    setSelectedUser(null);
    setUserDialogOpen(true);
  };

  const handleOpenEditDialog = (target) => {
    setFormUser({
      ...emptyForm(user.contractor, registration),
      id: target.id,
      name: target.name || '',
      email: target.email || '',
      role: target.role || ROLES.FIELD,
      adminType: target.adminType || (target.role === ROLES.CONTRACTOR_ADMIN ? 'secondary' : ''),
      active: target.active !== false,
      hasLogin: target.hasLogin !== false,
      documentId: target.documentId || '',
      profession: target.profession || ''
    });
    setIsEditing(true);
    setSelectedUser(target);
    setUserDialogOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormUser(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleRoleChange = (e) => {
    const role = e.target.value;
    setFormUser(prev => ({
      ...prev,
      role,
      adminType: role === ROLES.CONTRACTOR_ADMIN ? 'secondary' : '',
      // Solo un profesional puede existir sin acceso a la app
      hasLogin: role === ROLES.FIELD ? prev.hasLogin : true
    }));
  };

  const handleCloseDialog = () => {
    setUserDialogOpen(false);
    setSelectedUser(null);
  };

  const needsAccount = formUser.role !== ROLES.FIELD || formUser.hasLogin;

  const handleSaveUser = async () => {
    if (!formUser.name.trim()) {
      notify('Escriba el nombre completo', 'error');
      return;
    }
    if (!isEditing && needsAccount) {
      if (!formUser.email.trim()) {
        notify('Escriba el correo electrónico', 'error');
        return;
      }
      if (!formUser.sendSetupEmail && formUser.password.length < 6) {
        notify('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
      }
    }

    setSaving(true);
    try {
      const profileFields = {
        name: formUser.name.trim(),
        role: formUser.role,
        active: formUser.active,
        ...(formUser.role === ROLES.FIELD
          ? { documentId: formUser.documentId.trim() || null, profession: formUser.profession.trim() || null }
          : {})
      };
      if (formUser.role === ROLES.CONTRACTOR_ADMIN) {
        profileFields.adminType = formUser.adminType || 'secondary';
      }

      if (isEditing) {
        // El contratista y el tipo de admin principal no cambian desde aquí
        if (selectedUser?.adminType === 'main') delete profileFields.adminType;
        await updateDoc(doc(db, 'users', formUser.id), { ...profileFields, updatedAt: serverTimestamp() });
        notify('Usuario actualizado correctamente');
      } else if (!needsAccount) {
        await usersService.createProfessionalWithoutLogin({
          name: formUser.name,
          documentId: formUser.documentId,
          profession: formUser.profession,
          contractor: user.contractor
        }, user);
        notify('Profesional agregado (sin acceso a la app)');
      } else {
        const created = await authService.registerUser(
          formUser.email.trim(),
          formUser.password,
          { ...profileFields, contractor: user.contractor, hasLogin: true },
          { sendSetupEmail: formUser.sendSetupEmail }
        );
        if (formUser.sendSetupEmail) {
          notify(created.setupEmailSent
            ? `Usuario creado. Se envió un correo a ${formUser.email.trim()} para que cree su contraseña.`
            : 'Usuario creado, pero no se pudo enviar el correo. Use "¿Olvidó su contraseña?" en el inicio de sesión.',
          created.setupEmailSent ? 'success' : 'warning');
        } else {
          notify('Usuario creado correctamente');
        }
      }

      handleCloseDialog();
      loadUsers();
    } catch (error) {
      console.error('Error al guardar usuario:', error);
      notify(`Error: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDeleteDialog = (targetUser) => {
    // No se puede desactivar al representante principal ni a uno mismo
    if ((targetUser.role === ROLES.CONTRACTOR_ADMIN && targetUser.adminType === 'main') || targetUser.id === user.uid) {
      notify('No se puede desactivar este usuario', 'error');
      return;
    }
    setDeletingUser(targetUser);
    setDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setSaving(true);
    try {
      // Se desactiva (no se borra) para conservar el historial de actividades
      await updateDoc(doc(db, 'users', deletingUser.id), { active: false, updatedAt: serverTimestamp() });
      notify('Usuario desactivado correctamente');
      setDeleteDialogOpen(false);
      loadUsers();
    } catch (error) {
      console.error('Error al desactivar usuario:', error);
      notify(`Error: ${error.message}`, 'error');
    } finally {
      setSaving(false);
      setDeletingUser(null);
    }
  };

  const dataEntryDisabled = registration.dataEntry === false;

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Equipo de {contractorName}
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

      <RegistrationSettingsCard
        contractorName={contractorName}
        registration={registration}
        canEdit={isCurrentUserMainAdmin}
        onSave={handleSaveRegistration}
      />

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
            const isMainAdmin = userData.role === ROLES.CONTRACTOR_ADMIN &&
              (userData.adminType === 'main' || !userData.adminType);
            const isCurrentUser = userData.id === user.uid;
            const inactive = userData.active === false;

            return (
              <React.Fragment key={userData.id}>
                <ListItem
                  sx={{
                    bgcolor: inactive ? 'rgba(0,0,0,0.05)' : 'inherit',
                    opacity: inactive ? 0.7 : 1,
                    pr: 12
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">
                          {userData.name} {isCurrentUser && '(Tú)'}
                        </Typography>
                        <Chip
                          size="small"
                          label={getRoleLabel(userData.role, isMainAdmin ? 'main' : userData.adminType)}
                          color={ROLE_CHIP_COLOR[userData.role] || 'default'}
                        />
                        {userData.role === ROLES.FIELD && userData.hasLogin === false && (
                          <Chip size="small" variant="outlined" label="Sin acceso a la app" />
                        )}
                        {inactive && <Chip size="small" label="Inactivo" color="error" />}
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" component="span" color="text.secondary">
                        {[userData.email, userData.profession, userData.documentId && `Doc. ${userData.documentId}`]
                          .filter(Boolean).join(' · ') || 'Sin datos de contacto'}
                      </Typography>
                    }
                  />
                  <ListItemSecondaryAction>
                    {(isCurrentUserMainAdmin || isCurrentUser) && (
                      <IconButton
                        edge="end"
                        aria-label="editar"
                        onClick={() => handleOpenEditDialog(userData)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                    )}
                    {isCurrentUserMainAdmin && !isMainAdmin && !isCurrentUser && !inactive && (
                      <IconButton
                        edge="end"
                        aria-label="desactivar"
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

      {/* Crear / editar usuario */}
      <Dialog open={userDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isEditing ? `Editar: ${selectedUser?.name}` : 'Nuevo usuario del equipo'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={formUser.role === ROLES.CONTRACTOR_ADMIN ? 6 : 12}>
              <FormControl fullWidth>
                <InputLabel>Rol</InputLabel>
                <Select
                  name="role"
                  value={formUser.role}
                  label="Rol"
                  onChange={handleRoleChange}
                  disabled={isEditing && selectedUser?.adminType === 'main'}
                >
                  <MenuItem value={ROLES.FIELD}>Profesional de campo</MenuItem>
                  <MenuItem value={ROLES.DATA_ENTRY}>Encargado de carga (registra por los profesionales)</MenuItem>
                  <MenuItem value={ROLES.CONTRACTOR_ADMIN}>Administrador</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {formUser.role === ROLES.CONTRACTOR_ADMIN && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Tipo de administrador"
                  value={selectedUser?.adminType === 'main' ? 'Representante legal (principal)' : 'Administrador secundario'}
                  disabled
                />
              </Grid>
            )}

            {formUser.role === ROLES.DATA_ENTRY && dataEntryDisabled && (
              <Grid item xs={12}>
                <Alert severity="warning">
                  La opción "encargado de carga" está desactivada en ¿Quién registra las actividades?. Actívela para que
                  este usuario pueda registrar.
                </Alert>
              </Grid>
            )}

            {formUser.role === ROLES.FIELD && !isEditing && (
              <Grid item xs={12}>
                <FormControlLabel
                  control={<Switch checked={formUser.hasLogin} onChange={handleFormChange} name="hasLogin" />}
                  label={formUser.hasLogin
                    ? 'Tendrá acceso a la app (registra o consulta sus actividades)'
                    : 'Sin acceso a la app: el encargado de carga o el representante registran a su nombre'}
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nombre completo"
                name="name"
                value={formUser.name}
                onChange={handleFormChange}
                required
              />
            </Grid>

            {formUser.role === ROLES.FIELD && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Profesión / cargo (opcional)"
                    name="profession"
                    value={formUser.profession}
                    onChange={handleFormChange}
                    placeholder="Ej.: Psicóloga, Nutricionista"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Documento (opcional)"
                    name="documentId"
                    value={formUser.documentId}
                    onChange={handleFormChange}
                    inputProps={{ inputMode: 'numeric' }}
                  />
                </Grid>
              </>
            )}

            {(isEditing ? Boolean(formUser.email) : needsAccount) && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Correo electrónico"
                  name="email"
                  type="email"
                  value={formUser.email}
                  onChange={handleFormChange}
                  required={!isEditing}
                  disabled={isEditing}
                />
              </Grid>
            )}

            {!isEditing && needsAccount && (
              <>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Checkbox checked={formUser.sendSetupEmail} onChange={handleFormChange} name="sendSetupEmail" />}
                    label="Enviarle un correo para que cree su propia contraseña (recomendado)"
                  />
                </Grid>
                {!formUser.sendSetupEmail && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Contraseña inicial"
                      name="password"
                      type="password"
                      value={formUser.password}
                      onChange={handleFormChange}
                      helperText="Mínimo 6 caracteres. Compártala de forma segura."
                      required
                    />
                  </Grid>
                )}
              </>
            )}

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formUser.active}
                    onChange={handleFormChange}
                    name="active"
                    disabled={isEditing && formUser.id === user.uid}
                  />
                }
                label="Usuario activo"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveUser} disabled={saving}>
            {saving ? <CircularProgress size={24} /> : (isEditing ? 'Guardar cambios' : 'Crear usuario')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmar desactivación */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Desactivar usuario</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            ¿Desactivar a {deletingUser?.name}? No podrá iniciar sesión ni se le podrán registrar
            actividades nuevas. Su historial se conserva.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDeleteUser} disabled={saving}>
            {saving ? <CircularProgress size={24} /> : 'Desactivar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
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
