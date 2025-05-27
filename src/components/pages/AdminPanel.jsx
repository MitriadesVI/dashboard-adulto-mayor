import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  Grid,
  TextField,
  MenuItem,
  Button,
  FormControl,
  InputLabel,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import RefreshIcon from '@mui/icons-material/Refresh';

import goalsService from '../../services/goalsService';
import authService from '../../services/authService';
// Importar Firestore para obtener usuarios
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';

const AdminPanel = ({ user }) => {
  const [tabValue, setTabValue] = useState(0);
  const [year, setYear] = useState(new Date().getFullYear());
  const [contractor, setContractor] = useState('CUC');
  const [goals, setGoals] = useState(null);
  const [loading, setLoading] = useState(false);
  const [allGoals, setAllGoals] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  
  // NUEVO: Estado para gestión de usuarios
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Estado para nuevo usuario
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'field',
    contractor: 'CUC'
  });

  // Cargar datos según la pestaña activa
  useEffect(() => {
    if (tabValue === 0) {
      loadGoals();
    } else if (tabValue === 1) {
      loadAllGoals();
    } else if (tabValue === 2) {
      loadUsers();
    }
  }, [tabValue, contractor, year]); // eslint-disable-line react-hooks/exhaustive-deps
  // Nota: Se añade comentario para ESLint si da advertencias por dependencias que no quieres incluir aquí por lógica específica.

  // NUEVA FUNCIÓN: Cargar lista de usuarios
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const usersData = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        usersData.push({
          id: doc.id,
          ...userData,
          // Formatear fecha de creación si existe
          createdAtFormatted: userData.createdAt && userData.createdAt.toDate ? 
            new Date(userData.createdAt.toDate()).toLocaleDateString('es-ES') : 
            'N/A'
        });
      });
      
      setUsers(usersData);
      console.log(`Cargados ${usersData.length} usuarios`);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      setSnackbar({
        open: true,
        message: 'Error al cargar lista de usuarios',
        severity: 'error'
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadGoals = async () => {
    setLoading(true);
    try {
      const goalsData = await goalsService.getGoals(contractor, year);
      setGoals(goalsData);
    } catch (error) {
      console.error('Error al cargar metas:', error);
      setSnackbar({
        open: true,
        message: 'Error al cargar metas',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAllGoals = async () => {
    setLoadingAll(true);
    try {
      const allGoalsData = await goalsService.getAllGoals();
      setAllGoals(allGoalsData);
    } catch (error) {
      console.error('Error al cargar todas las metas:', error);
      setSnackbar({
        open: true,
        message: 'Error al cargar metas',
        severity: 'error'
      });
    } finally {
      setLoadingAll(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleGoalChange = (type, subtype, value) => {
    setGoals(prevGoals => {
      const newGoals = { ...prevGoals };
      // Asegurarse de que la estructura existe
      if (!newGoals.activities) newGoals.activities = {};
      if (!newGoals.activities[type]) newGoals.activities[type] = {};
      
      newGoals.activities[type][subtype] = parseInt(value) || 0;
      return newGoals;
    });
  };

  // SECCIÓN REEMPLAZADA 1: handleSaveGoals
  const handleSaveGoals = async () => {
    setSaving(true);
    try {
      // Validación para asegurar que 'goals' y 'goals.activities' no son null/undefined
      if (!goals || !goals.activities) {
        setSnackbar({
          open: true,
          message: 'No hay datos de metas para guardar o la estructura es incorrecta.',
          severity: 'error'
        });
        setSaving(false);
        return;
      }
  
      // CORRECCIÓN: Usar la estructura que espera goalsService
      const goalsData = {
        nutrition: {
          workshops: goals.activities.nutrition?.workshops || 0,
          centerRations: goals.activities.nutrition?.centerRations || 0,  // ← CORREGIDO
          parkSnacks: goals.activities.nutrition?.parkSnacks || 0        // ← CORREGIDO
        },
        physical: {
          preventionTalks: goals.activities.physical?.preventionTalks || 0,
          therapeuticActivity: goals.activities.physical?.therapeuticActivity || 0,
          rumbaTherapy: goals.activities.physical?.rumbaTherapy || 0,
          walkingClub: goals.activities.physical?.walkingClub || 0
        },
        psychosocial: {
          mentalHealth: goals.activities.psychosocial?.mentalHealth || 0,
          cognitive: goals.activities.psychosocial?.cognitive || 0,
          abusePreventionWorkshops: goals.activities.psychosocial?.abusePreventionWorkshops || 0,
          artsAndCrafts: goals.activities.psychosocial?.artsAndCrafts || 0,
          intergenerational: goals.activities.psychosocial?.intergenerational || 0
        }
      };
      
      await goalsService.setGoals(contractor, year, goalsData);
      
      setSnackbar({
        open: true,
        message: 'Metas guardadas correctamente',
        severity: 'success'
      });
      
      loadGoals();
      if (tabValue === 1) loadAllGoals();
    } catch (error) {
      console.error('Error al guardar metas:', error);
      setSnackbar({
        open: true,
        message: 'Error al guardar metas',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };
  // FIN DE SECCIÓN REEMPLAZADA 1

  const handleUserInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateUser = async () => {
    try {
      setSaving(true);
      
      if (!newUser.name || !newUser.email || !newUser.password || !newUser.role) {
        setSnackbar({
          open: true,
          message: 'Por favor complete todos los campos obligatorios',
          severity: 'error'
        });
        setSaving(false);
        return;
      }

      // CORRECCIÓN: Validar contratista solo si no es usuario district
      if (newUser.role !== 'district' && !newUser.contractor) {
        setSnackbar({
          open: true,
          message: 'Por favor seleccione un contratista',
          severity: 'error'
        });
        setSaving(false);
        return;
      }
      
      const userData = {
        name: newUser.name,
        role: newUser.role,
        active: true // Por defecto los usuarios se crean activos
      };

      // CORRECCIÓN: Solo agregar contractor si no es usuario district
      if (newUser.role !== 'district') {
        userData.contractor = newUser.contractor;
      } else {
        userData.contractor = 'DISTRITO'; // Asignar valor específico para usuarios district
      }
      
      await authService.registerUser(newUser.email, newUser.password, userData);
      
      setSnackbar({
        open: true,
        message: 'Usuario creado correctamente',
        severity: 'success'
      });
      
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: 'field',
        contractor: 'CUC'
      });
      
      setUserDialogOpen(false);
      loadUsers(); // Recargar lista de usuarios
    } catch (error) {
      console.error('Error al crear usuario:', error);
      setSnackbar({
        open: true,
        message: `Error al crear usuario: ${error.message || 'Error desconocido'}`,
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const getRoleLabel = (role) => {
    const roleMap = {
      'district': 'Funcionario Distrital',
      'contractor-admin': 'Representante de Contratista',
      'field': 'Personal de Campo'
    };
    return roleMap[role] || role;
  };

  const getRoleChipColor = (role) => {
    switch (role) {
      case 'district': return 'error';
      case 'contractor-admin': return 'warning';
      case 'field': return 'primary';
      default: return 'default';
    }
  };

  const getActivitySubtypeLabel = (type, subtype) => {
    const subtypeMap = {
      nutrition: {
        workshops: 'Talleres educativos/Jornadas de promoción',
        // Las nuevas etiquetas se manejan directamente en la tabla
        // centerRations: 'Raciones en Centros Fijos', // Podrías añadirlo aquí si quieres generalizar
        // parkSnacks: 'Meriendas en Parques',      // Podrías añadirlo aquí si quieres generalizar
      },
      physical: {
        preventionTalks: 'Charlas de prevención de enfermedad',
        therapeuticActivity: 'Actividad física terapéutica',
        rumbaTherapy: 'Rumbaterapia y ejercicios dirigidos',
        walkingClub: 'Club de caminantes'
      },
      psychosocial: {
        mentalHealth: 'Jornadas/talleres en salud mental',
        cognitive: 'Jornadas/talleres cognitivos',
        abusePreventionWorkshops: 'Talleres en prevención al maltrato',
        artsAndCrafts: 'Talleres en artes y oficios',
        intergenerational: 'Encuentros intergeneracionales'
      }
    };
    return subtypeMap[type]?.[subtype] || subtype;
  };

  const getActivityTypeLabel = (type, contractorForLabel) => { // Renombrado para evitar colisión con estado
    if (type === 'nutrition') {
      return contractorForLabel === 'CUC' ? 'Educación Nutricional' : 'Salud Nutricional';
    } else if (type === 'physical') {
      return contractorForLabel === 'CUC' ? 'Educación en Salud Física' : 'Salud Física';
    } else if (type === 'psychosocial') {
      return contractorForLabel === 'CUC' ? 'Educación Psicosocial' : 'Salud Psicosocial';
    }
    return type;
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Panel de Administración
        </Typography>
        
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="fullWidth"
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab label="Gestión de Metas" />
            <Tab label="Historial de Metas" />
            <Tab label="Gestión de Usuarios" />
          </Tabs>
        </Paper>
        
        {/* Tab de Gestión de Metas */}
        {tabValue === 0 && (
          <Paper elevation={2} sx={{ p: 3 }}>
            <Grid container spacing={3} alignItems="center" sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Contratista</InputLabel>
                  <Select
                    value={contractor}
                    label="Contratista"
                    onChange={(e) => setContractor(e.target.value)}
                  >
                    <MenuItem value="CUC">CUC</MenuItem>
                    <MenuItem value="FUNDACARIBE">FUNDACARIBE</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Año"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                  InputProps={{ inputProps: { min: 2020, max: 2050 } }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button 
                  variant="contained" 
                  startIcon={<SaveIcon />}
                  onClick={handleSaveGoals}
                  disabled={saving || loading || !goals} // Deshabilitar si no hay metas cargadas
                  fullWidth
                >
                  {saving ? <CircularProgress size={24} /> : "Guardar Metas"}
                </Button>
              </Grid>
            </Grid>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              // SECCIÓN REEMPLAZADA 2: Tabla de metas
              goals && goals.activities ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell width="60%"><strong>Tipo de Actividad</strong></TableCell>
                        <TableCell align="right"><strong>Meta Anual</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {/* Nutrición */}
                      <TableRow sx={{ backgroundColor: 'success.light' }}>
                        <TableCell colSpan={2}>
                          <Typography variant="subtitle1">
                            {getActivityTypeLabel('nutrition', contractor)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>{getActivitySubtypeLabel('nutrition', 'workshops')}</TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            variant="outlined"
                            size="small"
                            value={goals.activities.nutrition?.workshops || 0}
                            onChange={(e) => handleGoalChange('nutrition', 'workshops', e.target.value)}
                            InputProps={{ inputProps: { min: 0 } }}
                          />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Raciones en Centros Fijos</TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            variant="outlined"
                            size="small"
                            value={goals.activities.nutrition?.centerRations || 0}
                            onChange={(e) => handleGoalChange('nutrition', 'centerRations', e.target.value)}
                            InputProps={{ inputProps: { min: 0 } }}
                          />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Meriendas en Parques</TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            variant="outlined"
                            size="small"
                            value={goals.activities.nutrition?.parkSnacks || 0}
                            onChange={(e) => handleGoalChange('nutrition', 'parkSnacks', e.target.value)}
                            InputProps={{ inputProps: { min: 0 } }}
                          />
                        </TableCell>
                      </TableRow>
                      
                      {/* Física */}
                      <TableRow sx={{ backgroundColor: 'primary.light' }}>
                        <TableCell colSpan={2}>
                          <Typography variant="subtitle1">
                            {getActivityTypeLabel('physical', contractor)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>{getActivitySubtypeLabel('physical', 'preventionTalks')}</TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            variant="outlined"
                            size="small"
                            value={goals.activities.physical?.preventionTalks || 0}
                            onChange={(e) => handleGoalChange('physical', 'preventionTalks', e.target.value)}
                            InputProps={{ inputProps: { min: 0 } }}
                          />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>{getActivitySubtypeLabel('physical', 'therapeuticActivity')}</TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            variant="outlined"
                            size="small"
                            value={goals.activities.physical?.therapeuticActivity || 0}
                            onChange={(e) => handleGoalChange('physical', 'therapeuticActivity', e.target.value)}
                            InputProps={{ inputProps: { min: 0 } }}
                          />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>{getActivitySubtypeLabel('physical', 'rumbaTherapy')}</TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            variant="outlined"
                            size="small"
                            value={goals.activities.physical?.rumbaTherapy || 0}
                            onChange={(e) => handleGoalChange('physical', 'rumbaTherapy', e.target.value)}
                            InputProps={{ inputProps: { min: 0 } }}
                          />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>{getActivitySubtypeLabel('physical', 'walkingClub')}</TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            variant="outlined"
                            size="small"
                            value={goals.activities.physical?.walkingClub || 0}
                            onChange={(e) => handleGoalChange('physical', 'walkingClub', e.target.value)}
                            InputProps={{ inputProps: { min: 0 } }}
                          />
                        </TableCell>
                      </TableRow>
                      
                      {/* Psicosocial */}
                      <TableRow sx={{ backgroundColor: 'secondary.light' }}>
                        <TableCell colSpan={2}>
                          <Typography variant="subtitle1">
                            {getActivityTypeLabel('psychosocial', contractor)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>{getActivitySubtypeLabel('psychosocial', 'mentalHealth')}</TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            variant="outlined"
                            size="small"
                            value={goals.activities.psychosocial?.mentalHealth || 0}
                            onChange={(e) => handleGoalChange('psychosocial', 'mentalHealth', e.target.value)}
                            InputProps={{ inputProps: { min: 0 } }}
                          />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>{getActivitySubtypeLabel('psychosocial', 'cognitive')}</TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            variant="outlined"
                            size="small"
                            value={goals.activities.psychosocial?.cognitive || 0}
                            onChange={(e) => handleGoalChange('psychosocial', 'cognitive', e.target.value)}
                            InputProps={{ inputProps: { min: 0 } }}
                          />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>{getActivitySubtypeLabel('psychosocial', 'abusePreventionWorkshops')}</TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            variant="outlined"
                            size="small"
                            value={goals.activities.psychosocial?.abusePreventionWorkshops || 0}
                            onChange={(e) => handleGoalChange('psychosocial', 'abusePreventionWorkshops', e.target.value)}
                            InputProps={{ inputProps: { min: 0 } }}
                          />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>{getActivitySubtypeLabel('psychosocial', 'artsAndCrafts')}</TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            variant="outlined"
                            size="small"
                            value={goals.activities.psychosocial?.artsAndCrafts || 0}
                            onChange={(e) => handleGoalChange('psychosocial', 'artsAndCrafts', e.target.value)}
                            InputProps={{ inputProps: { min: 0 } }}
                          />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>{getActivitySubtypeLabel('psychosocial', 'intergenerational')}</TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            variant="outlined"
                            size="small"
                            value={goals.activities.psychosocial?.intergenerational || 0}
                            onChange={(e) => handleGoalChange('psychosocial', 'intergenerational', e.target.value)}
                            InputProps={{ inputProps: { min: 0 } }}
                          />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body1" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
                  No hay metas cargadas para este contratista y año, o la estructura de datos es incorrecta. Intente seleccionar otro o crear nuevas metas.
                </Typography>
              )
              // FIN DE SECCIÓN REEMPLAZADA 2
            )}
          </Paper>
        )}
        
        {/* Tab de Historial de Metas */}
        {tabValue === 1 && (
          <Paper elevation={2} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">
                Registro de Metas
              </Typography>
              <Button 
                variant="outlined" 
                startIcon={<AddIcon />}
                onClick={() => {
                  setTabValue(0); // Cambiar a la pestaña de gestión para crear/editar
                }}
              >
                Crear/Editar Meta
              </Button>
            </Box>
            
            {loadingAll ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : allGoals.length === 0 ? (
              <Typography variant="body1" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
                No hay metas registradas.
              </Typography>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Contratista</strong></TableCell>
                      <TableCell><strong>Año</strong></TableCell>
                      <TableCell><strong>Última Actualización</strong></TableCell>
                      <TableCell align="right"><strong>Acciones</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allGoals.map((goal) => (
                      <TableRow key={goal.id}>
                        <TableCell>{goal.contractor}</TableCell>
                        <TableCell>{goal.year}</TableCell>
                        <TableCell>
                          {goal.updatedAt && goal.updatedAt.toDate ? new Date(goal.updatedAt.toDate()).toLocaleDateString('es-ES') : 'N/A'}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            color="primary"
                            onClick={() => {
                              setContractor(goal.contractor);
                              setYear(goal.year);
                              setTabValue(0); // Ir a la pestaña de edición con estos datos
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        )}
        
        {/* Tab de Gestión de Usuarios - CORREGIDO */}
        {tabValue === 2 && (
          <Paper elevation={2} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">
                Gestión de Usuarios
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button 
                  variant="outlined" 
                  startIcon={<RefreshIcon />}
                  onClick={loadUsers}
                  disabled={loadingUsers}
                >
                  {loadingUsers ? <CircularProgress size={20} sx={{mr:1}} /> : null}
                  Actualizar
                </Button>
                <Button 
                  variant="contained" 
                  color="primary"
                  startIcon={<PersonAddIcon />}
                  onClick={() => setUserDialogOpen(true)}
                >
                  Nuevo Usuario
                </Button>
              </Box>
            </Box>
            
            {loadingUsers ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : users.length === 0 ? (
              <Typography variant="body1" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
                No hay usuarios registrados.
              </Typography>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Nombre</strong></TableCell>
                      <TableCell><strong>Email</strong></TableCell>
                      <TableCell><strong>Rol</strong></TableCell>
                      <TableCell><strong>Contratista</strong></TableCell>
                      <TableCell><strong>Estado</strong></TableCell>
                      <TableCell><strong>Fecha Creación</strong></TableCell>
                      {/* <TableCell align="right"><strong>Acciones</strong></TableCell> */} {/* Podrías añadir acciones aquí */}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((userItem) => (
                      <TableRow key={userItem.id}>
                        <TableCell>{userItem.name || 'N/A'}</TableCell>
                        <TableCell>{userItem.email}</TableCell>
                        <TableCell>
                          <Chip 
                            label={getRoleLabel(userItem.role)} 
                            color={getRoleChipColor(userItem.role)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{userItem.contractor || 'N/A'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={userItem.active ? 'Activo' : 'Inactivo'} 
                            color={userItem.active ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{userItem.createdAtFormatted}</TableCell>
                      
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        )}
      </Box>

      {/* Dialog para crear usuario - CORREGIDO */}
      <Dialog 
        open={userDialogOpen} 
        onClose={() => {
            setUserDialogOpen(false);
            // Opcional: resetear newUser state si no se guarda
             setNewUser({ name: '', email: '', password: '', role: 'field', contractor: 'CUC' });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Crear Nuevo Usuario</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nombre Completo"
                name="name"
                value={newUser.name}
                onChange={handleUserInputChange}
                required
                autoFocus
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Correo Electrónico"
                name="email"
                type="email"
                value={newUser.email}
                onChange={handleUserInputChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Contraseña"
                name="password"
                type="password"
                value={newUser.password}
                onChange={handleUserInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} md={newUser.role === 'district' ? 12 : 6}>
              <FormControl fullWidth required>
                <InputLabel>Rol</InputLabel>
                <Select
                  name="role"
                  value={newUser.role}
                  label="Rol"
                  onChange={handleUserInputChange}
                >
                  <MenuItem value="field">Personal de Campo</MenuItem>
                  <MenuItem value="contractor-admin">Representante de Contratista</MenuItem>
                  <MenuItem value="district">Funcionario Distrital</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {/* CORRECCIÓN: Solo mostrar campo contratista si no es usuario district */}
            {newUser.role !== 'district' && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Contratista</InputLabel>
                  <Select
                    name="contractor"
                    value={newUser.contractor}
                    label="Contratista"
                    onChange={handleUserInputChange}
                  >
                    <MenuItem value="CUC">CUC</MenuItem>
                    <MenuItem value="FUNDACARIBE">FUNDACARIBE</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
          
          {newUser.role === 'district' && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
              <Typography variant="body2" color="info.dark">
                <strong>Nota:</strong> Los usuarios del distrito tienen acceso completo y no se asocian a un contratista.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: '16px 24px' }}>
          <Button onClick={() => {
              setUserDialogOpen(false);
              setNewUser({ name: '', email: '', password: '', role: 'field', contractor: 'CUC' });
            }}
            color="inherit"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleCreateUser} 
            variant="contained" 
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20}/> : null}
          >
            {saving ? "Creando..." : "Crear Usuario"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

    </Container>
  );
};

export default AdminPanel;