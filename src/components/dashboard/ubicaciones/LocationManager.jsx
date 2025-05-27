// src/components/dashboard/ubicaciones/LocationManager.jsx

import React, { useState, useEffect } from 'react';
import {
  Card, CardHeader, CardContent, Grid, TextField, Button,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, FormControl, InputLabel, Select, MenuItem,
  Typography, Divider, Box, Alert, CircularProgress, Tabs, Tab
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FilterListIcon from '@mui/icons-material/FilterList';
import LocationOnIcon from '@mui/icons-material/LocationOn';

// Importar el servicio de ubicaciones
import locationsService from '../../../services/locationsService';

// Componente TabPanel para manejar el contenido de las pestañas
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`location-tabpanel-${index}`}
      aria-labelledby={`location-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const LocationManager = ({ user }) => {
  // Estados para manejar datos
  const [locations, setLocations] = useState([]);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [contractors, setContractors] = useState([{ id: 'CUC', name: 'CUC' }, { id: 'FUNDACARIBE', name: 'FUNDACARIBE' }]);
  
  // Estados para UI
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [error, setError] = useState(null);
  
  // Estado para el formulario
  const [formData, setFormData] = useState({ 
    name: '', 
    type: 'center', 
    address: '',
    capacity: '',
    contractor: ''
  });
  
  // Estado para filtros
  const [filterContractor, setFilterContractor] = useState('all');
  const [filterType, setFilterType] = useState('all');
  
  // Cargar datos desde Firestore
  useEffect(() => {
    const loadLocations = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const locationsData = await locationsService.getAllLocations();
        setLocations(locationsData);
        setFilteredLocations(locationsData);
      } catch (err) {
        console.error("Error al cargar ubicaciones:", err);
        setError("Error al cargar ubicaciones. Por favor, intente de nuevo.");
        // Usar datos vacíos en caso de error
        setLocations([]);
        setFilteredLocations([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadLocations();
  }, []);
  
  // Efecto para filtrar ubicaciones cuando cambian los filtros o las pestañas
  useEffect(() => {
    if (!locations.length) {
      setFilteredLocations([]);
      return;
    }
    
    let filtered = [...locations];
    
    // Filtrar por contratista si no es 'all' y no estamos en la pestaña de todos (0)
    if (filterContractor !== 'all' && tabValue !== 0) {
      filtered = filtered.filter(location => location.contractor === filterContractor);
    }
    
    // Filtrar por tipo si no es 'all' y estamos en la pestaña de modalidad (2)
    if (filterType !== 'all' && tabValue === 2) {
      filtered = filtered.filter(location => location.type === filterType);
    }
    
    // En la pestaña de contratistas (1), agrupar por contratista automáticamente
    if (tabValue === 1) {
      // Esta pestaña ya se filtra solo por contratista
    }
    
    setFilteredLocations(filtered);
  }, [locations, filterContractor, filterType, tabValue]);
  
  // Manejadores de eventos para tabs
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    
    // Reset filtros al cambiar de pestaña
    if (newValue === 0) {
      setFilterContractor('all');
      setFilterType('all');
    } else if (newValue === 1) {
      setFilterType('all');
    } else if (newValue === 2) {
      setFilterContractor('all');
    }
  };
  
  // Manejadores para diálogos
  const handleOpenDialog = (location = null) => {
    if (location) {
      setSelectedLocation(location);
      setFormData({ ...location });
    } else {
      setSelectedLocation(null);
      setFormData({ name: '', type: 'center', address: '', capacity: '', contractor: '' });
    }
    setDialogOpen(true);
  };
  
  const handleOpenAssignDialog = (location) => {
    setSelectedLocation(location);
    setFormData({ ...location });
    setAssignDialogOpen(true);
  };
  
  // Manejadores para formularios
  const handleSaveLocation = async () => {
    // Validar datos
    if (!formData.name || !formData.type) {
      setError("Por favor complete los campos obligatorios");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      if (selectedLocation) {
        // Actualizar ubicación existente
        await locationsService.updateLocation(selectedLocation.id, formData);
        
        // Actualizar estado local
        setLocations(prevLocations => 
          prevLocations.map(loc => 
            loc.id === selectedLocation.id ? { ...formData, id: loc.id } : loc
          )
        );
      } else {
        // Crear nueva ubicación
        const newLocation = await locationsService.createLocation(formData);
        
        // Actualizar estado local
        setLocations(prev => [...prev, newLocation]);
      }
      
      setDialogOpen(false);
    } catch (err) {
      console.error("Error al guardar ubicación:", err);
      setError("Error al guardar ubicación. Por favor, intente de nuevo.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleAssignContractor = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Actualizar la ubicación con el nuevo contratista
      await locationsService.assignContractor(selectedLocation.id, formData.contractor);
      
      // Actualizar estado local
      setLocations(prevLocations => 
        prevLocations.map(loc => 
          loc.id === selectedLocation.id ? { ...loc, contractor: formData.contractor } : loc
        )
      );
      
      setAssignDialogOpen(false);
    } catch (err) {
      console.error("Error al asignar contratista:", err);
      setError("Error al asignar contratista. Por favor, intente de nuevo.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteLocation = async (locationId) => {
    if (!window.confirm("¿Está seguro de eliminar esta ubicación?")) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Eliminar ubicación en Firestore
      await locationsService.deleteLocation(locationId);
      
      // Actualizar estado local
      setLocations(prev => prev.filter(loc => loc.id !== locationId));
    } catch (err) {
      console.error("Error al eliminar ubicación:", err);
      setError("Error al eliminar ubicación. Por favor, intente de nuevo.");
    } finally {
      setLoading(false);
    }
  };
  
  // Renderizado de lista de ubicaciones
  const renderLocationsList = (locations) => {
    if (locations.length === 0) {
      return (
        <Typography align="center" sx={{ py: 3 }}>
          No hay espacios para mostrar con los filtros seleccionados.
        </Typography>
      );
    }
    
    return (
      <List>
        {locations.map((location) => (
          <React.Fragment key={location.id}>
            <ListItem>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="subtitle1">
                      {location.name}
                    </Typography>
                    <Box 
                      component="span" 
                      sx={{ 
                        ml: 1, 
                        px: 1, 
                        py: 0.3, 
                        borderRadius: 1, 
                        fontSize: '0.75rem',
                        bgcolor: location.type === 'center' ? 'primary.light' : 'secondary.light',
                        color: 'white'
                      }}
                    >
                      {location.type === 'center' ? 'Centro Fijo' : 'Parque/Espacio Comunitario'}
                    </Box>
                  </Box>
                }
                secondary={
                  <>
                    <Typography component="span" variant="body2" color="text.primary">
                      {location.address}
                    </Typography>
                    <br />
                    <Typography component="span" variant="body2">
                      Capacidad: {location.capacity} personas
                    </Typography>
                    <br />
                    <Typography component="span" variant="body2" color="text.secondary">
                      Asignado a: {location.contractor || 'Sin asignar'}
                    </Typography>
                  </>
                }
              />
              <ListItemSecondaryAction>
                <IconButton 
                  edge="end" 
                  aria-label="asignar"
                  onClick={() => handleOpenAssignDialog(location)}
                  sx={{ mr: 1 }}
                >
                  <AssignmentIcon />
                </IconButton>
                <IconButton 
                  edge="end" 
                  aria-label="editar"
                  onClick={() => handleOpenDialog(location)}
                  sx={{ mr: 1 }}
                >
                  <EditIcon />
                </IconButton>
                <IconButton 
                  edge="end" 
                  aria-label="eliminar"
                  onClick={() => handleDeleteLocation(location.id)}
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
            <Divider variant="inset" component="li" />
          </React.Fragment>
        ))}
      </List>
    );
  };
  
  // Mostrar pantalla de carga si está cargando
  if (loading && locations.length === 0) {
    return (
      <Card>
        <CardHeader title="Gestión de Espacios" />
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }
  
  // Agrupar ubicaciones por contratista para la pestaña de contratistas
  const getLocationsByContractor = () => {
    const grouped = {};
    
    // Primero agrupar por contratista
    contractors.forEach(contractor => {
      grouped[contractor.id] = filteredLocations.filter(
        location => location.contractor === contractor.id
      );
    });
    
    // Añadir grupo para "Sin asignar"
    grouped['unassigned'] = filteredLocations.filter(
      location => !location.contractor
    );
    
    return grouped;
  };
  
  // Agrupar ubicaciones por tipo para la pestaña de modalidad
  const getLocationsByType = () => {
    return {
      center: filteredLocations.filter(location => location.type === 'center'),
      park: filteredLocations.filter(location => location.type === 'park'),
    };
  };
  
  const locationsByContractor = getLocationsByContractor();
  const locationsByType = getLocationsByType();
  
  return (
    <Card>
      <CardHeader 
        title="Gestión de Espacios"
        action={
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Nuevo Espacio
          </Button>
        }
      />
      <Divider />
      
      <CardContent>
        {/* Mostrar error si existe */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            aria-label="location manager tabs"
          >
            <Tab label="Todos los Espacios" />
            <Tab label="Por Contratista" />
            <Tab label="Por Modalidad" />
          </Tabs>
        </Box>
        
        {/* Filtros específicos por pestaña */}
        <Box sx={{ py: 2 }}>
          {tabValue === 0 && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Contratista</InputLabel>
                <Select
                  value={filterContractor}
                  label="Contratista"
                  onChange={(e) => setFilterContractor(e.target.value)}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  {contractors.map(contractor => (
                    <MenuItem key={contractor.id} value={contractor.id}>
                      {contractor.name}
                    </MenuItem>
                  ))}
                  <MenuItem value="">Sin asignar</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={filterType}
                  label="Tipo"
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="center">Centro Fijo</MenuItem>
                  <MenuItem value="park">Parque/Espacio Comunitario</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
          
          {tabValue === 1 && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Contratista</InputLabel>
              <Select
                value={filterContractor}
                label="Contratista"
                onChange={(e) => setFilterContractor(e.target.value)}
              >
                <MenuItem value="all">Todos</MenuItem>
                {contractors.map(contractor => (
                  <MenuItem key={contractor.id} value={contractor.id}>
                    {contractor.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          
          {tabValue === 2 && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Tipo</InputLabel>
              <Select
                value={filterType}
                label="Tipo"
                onChange={(e) => setFilterType(e.target.value)}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="center">Centro Fijo</MenuItem>
                <MenuItem value="park">Parque/Espacio Comunitario</MenuItem>
              </Select>
            </FormControl>
          )}
        </Box>
        
        {/* Contenido de las tabs */}
        <TabPanel value={tabValue} index={0}>
          {renderLocationsList(filteredLocations)}
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          {filterContractor !== 'all' ? (
            // Mostrar una lista específica de contratista
            <>
              <Typography variant="h6" gutterBottom>
                Espacios asignados a: {
                  filterContractor ? 
                  contractors.find(c => c.id === filterContractor)?.name || filterContractor : 
                  'Sin asignar'
                }
              </Typography>
              {renderLocationsList(filterContractor ? 
                locationsByContractor[filterContractor] || [] : 
                locationsByContractor.unassigned || []
              )}
            </>
          ) : (
            // Mostrar todas las ubicaciones agrupadas por contratista
            <>
              {contractors.map(contractor => (
                <Box key={contractor.id} sx={{ mb: 4 }}>
                  <Typography variant="h6" gutterBottom>
                    {contractor.name} ({locationsByContractor[contractor.id]?.length || 0} espacios)
                  </Typography>
                  {locationsByContractor[contractor.id]?.length ? (
                    renderLocationsList(locationsByContractor[contractor.id])
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No hay espacios asignados a este contratista.
                    </Typography>
                  )}
                  <Divider sx={{ mt: 2 }} />
                </Box>
              ))}
              
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Sin Asignar ({locationsByContractor.unassigned?.length || 0} espacios)
                </Typography>
                {locationsByContractor.unassigned?.length ? (
                  renderLocationsList(locationsByContractor.unassigned)
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No hay espacios sin asignar.
                  </Typography>
                )}
              </Box>
            </>
          )}
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          {filterType !== 'all' ? (
            // Mostrar una lista específica de tipo
            <>
              <Typography variant="h6" gutterBottom>
                {filterType === 'center' ? 'Centros Fijos' : 'Parques/Espacios Comunitarios'}
              </Typography>
              {renderLocationsList(
                filterType === 'center' ? locationsByType.center : locationsByType.park
              )}
            </>
          ) : (
            // Mostrar todas las ubicaciones por tipo
            <>
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Centros Fijos ({locationsByType.center?.length || 0})
                </Typography>
                {locationsByType.center?.length ? (
                  renderLocationsList(locationsByType.center)
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No hay centros fijos registrados.
                  </Typography>
                )}
                <Divider sx={{ mt: 2 }} />
              </Box>
              
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Parques/Espacios Comunitarios ({locationsByType.park?.length || 0})
                </Typography>
                {locationsByType.park?.length ? (
                  renderLocationsList(locationsByType.park)
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No hay parques/espacios comunitarios registrados.
                  </Typography>
                )}
              </Box>
            </>
          )}
        </TabPanel>
        
        {/* Dialog para crear/editar ubicación */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
          <DialogTitle>
            {selectedLocation ? 'Editar Espacio' : 'Nuevo Espacio'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nombre del Espacio"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Tipo</InputLabel>
                  <Select
                    value={formData.type}
                    label="Tipo"
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                  >
                    <MenuItem value="center">Centro Fijo</MenuItem>
                    <MenuItem value="park">Parque/Espacio Comunitario</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Capacidad"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Dirección"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Contratista</InputLabel>
                  <Select
                    value={formData.contractor || ''}
                    label="Contratista"
                    onChange={(e) => setFormData({...formData, contractor: e.target.value})}
                  >
                    <MenuItem value="">Sin asignar</MenuItem>
                    {contractors.map(contractor => (
                      <MenuItem key={contractor.id} value={contractor.id}>
                        {contractor.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleSaveLocation} 
              variant="contained" 
              color="primary"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Guardar'}
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Dialog para asignar contratista */}
        <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)}>
          <DialogTitle>
            Asignar Contratista
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Espacio: {selectedLocation?.name}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Tipo: {selectedLocation?.type === 'center' ? 'Centro Fijo' : 'Parque/Espacio Comunitario'}
              </Typography>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Contratista</InputLabel>
                <Select
                  value={formData.contractor || ''}
                  label="Contratista"
                  onChange={(e) => setFormData({...formData, contractor: e.target.value})}
                >
                  <MenuItem value="">Sin asignar</MenuItem>
                  {contractors.map(contractor => (
                    <MenuItem key={contractor.id} value={contractor.id}>
                      {contractor.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAssignDialogOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleAssignContractor} 
              variant="contained" 
              color="primary"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Asignar'}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default LocationManager;