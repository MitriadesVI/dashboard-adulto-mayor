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
  DialogActions
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

import goalsService from '../../services/goalsService';
import authService from '../../services/authService';

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

  // Cargar metas iniciales
  useEffect(() => {
    if (tabValue === 0) {
      loadGoals();
    } else if (tabValue === 1) {
      loadAllGoals();
    }
  }, [tabValue, contractor, year]);

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
      newGoals.activities[type][subtype] = parseInt(value) || 0;
      return newGoals;
    });
  };

  const handleSaveGoals = async () => {
    setSaving(true);
    try {
      const goalsData = {
        nutrition: {
          workshops: goals.activities.nutrition.workshops,
          rations: goals.activities.nutrition.rations
        },
        physical: {
          preventionTalks: goals.activities.physical.preventionTalks,
          therapeuticActivity: goals.activities.physical.therapeuticActivity,
          rumbaTherapy: goals.activities.physical.rumbaTherapy,
          walkingClub: goals.activities.physical.walkingClub
        },
        psychosocial: {
          mentalHealth: goals.activities.psychosocial.mentalHealth,
          cognitive: goals.activities.psychosocial.cognitive,
          abusePreventionWorkshops: goals.activities.psychosocial.abusePreventionWorkshops,
          artsAndCrafts: goals.activities.psychosocial.artsAndCrafts,
          intergenerational: goals.activities.psychosocial.intergenerational
        }
      };
      
      await goalsService.setGoals(contractor, year, goalsData);
      
      setSnackbar({
        open: true,
        message: 'Metas guardadas correctamente',
        severity: 'success'
      });
      
      // Recargar metas para mostrar datos actualizados
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
      
      // Validar inputs
      if (!newUser.name || !newUser.email || !newUser.password || !newUser.role || !newUser.contractor) {
        setSnackbar({
          open: true,
          message: 'Por favor complete todos los campos',
          severity: 'error'
        });
        setSaving(false);
        return;
      }
      
      // Crear usuario
      const userData = {
        name: newUser.name,
        role: newUser.role,
        contractor: newUser.contractor,
        active: true
      };
      
      await authService.registerUser(newUser.email, newUser.password, userData);
      
      setSnackbar({
        open: true,
        message: 'Usuario creado correctamente',
        severity: 'success'
      });
      
      // Limpiar formulario y cerrar diálogo
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: 'field',
        contractor: 'CUC'
      });
      
      setUserDialogOpen(false);
    } catch (error) {
      console.error('Error al crear usuario:', error);
      setSnackbar({
        open: true,
        message: `Error al crear usuario: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const getActivitySubtypeLabel = (type, subtype) => {
    const subtypeMap = {
      nutrition: {
        workshops: 'Talleres educativos/Jornadas de promoción',
        rations: 'Raciones alimenticias/meriendas'
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

    return subtypeMap[type] && subtypeMap[type][subtype] ? subtypeMap[type][subtype] : subtype;
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
                  onChange={(e) => setYear(e.target.value)}
                  InputProps={{ inputProps: { min: 2020, max: 2050 } }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button 
                  variant="contained" 
                  startIcon={<SaveIcon />}
                  onClick={handleSaveGoals}
                  disabled={saving || loading}
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
              goals && (
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
                            value={goals.activities.nutrition.workshops}
                            onChange={(e) => handleGoalChange('nutrition', 'workshops', e.target.value)}
                            InputProps={{ inputProps: { min: 0 } }}
                          />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>{getActivitySubtypeLabel('nutrition', 'rations')}</TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            variant="outlined"
                            size="small"
                            value={goals.activities.nutrition.rations}
                            onChange={(e) => handleGoalChange('nutrition', 'rations', e.target.value)}
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
                            value={goals.activities.physical.preventionTalks}
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
                            value={goals.activities.physical.therapeuticActivity}
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
                            value={goals.activities.physical.rumbaTherapy}
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
                            value={goals.activities.physical.walkingClub}
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
                            value={goals.activities.psychosocial.mentalHealth}
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
                            value={goals.activities.psychosocial.cognitive}
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
                            value={goals.activities.psychosocial.abusePreventionWorkshops}
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
                            value={goals.activities.psychosocial.artsAndCrafts}
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
                            value={goals.activities.psychosocial.intergenerational}
                            onChange={(e) => handleGoalChange('psychosocial', 'intergenerational', e.target.value)}
                            InputProps={{ inputProps: { min: 0 } }}
                          />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              )
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
                  setTabValue(0);
                }}
              >
                Crear Nueva Meta
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
                          {goal.updatedAt ? new Date(goal.updatedAt.toDate()).toLocaleDateString('es-ES') : 'N/A'}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            color="primary"
                            onClick={() => {
                              setContractor(goal.contractor);
                              setYear(goal.year);
                              setTabValue(0);
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
        
        {/* Tab de Gestión de Usuarios */}
        {tabValue === 2 && (
          <Paper elevation={2} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">
                Gestión de Usuarios
              </Typography>
              <Button 
                variant="contained" 
                color="primary"
                startIcon={<PersonAddIcon />}
                onClick={() => setUserDialogOpen(true)}
              >
                Nuevo Usuario
              </Button>
            </Box>
            
            <Typography variant="body1" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
              Esta funcionalidad requiere un componente adicional para listar y gestionar usuarios.
              Actualmente solo está disponible la creación de usuarios.
            </Typography>
          </Paper>
        )}
      </Box>

      {/* Dialog para crear usuario */}
      <Dialog 
        open={userDialogOpen} 
        onClose={() => setUserDialogOpen(false)}
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
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
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
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
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
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDialogOpen(false)}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={handleCreateUser}
            disabled={saving}
          >
            {saving ? <CircularProgress size={24} /> : "Crear Usuario"}
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

export default AdminPanel;