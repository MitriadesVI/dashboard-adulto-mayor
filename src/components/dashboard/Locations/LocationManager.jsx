// src/components/dashboard/locations/LocationManager.jsx (Bosquejo inicial)

import React, { useState, useEffect } from 'react';
import {
  Card, CardHeader, CardContent, Grid, TextField, Button,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, FormControl, InputLabel, Select, MenuItem,
  Typography, Divider, Box, Alert
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import AssignmentIcon from '@mui/icons-material/Assignment';

const LocationManager = ({ user }) => {
  const [locations, setLocations] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    type: 'center', 
    address: '',
    capacity: '',
    contractor: ''
  });
  
  // Aquí iría la carga de datos desde Firestore 
  useEffect(() => {
    // Simulación para el bosquejo
    setLoading(true);
    setTimeout(() => {
      setLocations([
        { id: '1', name: 'Centro Vida 1', type: 'center', address: 'Calle 30 #15-22', capacity: 80, contractor: 'CUC' },
        { id: '2', name: 'Parque La Paz', type: 'park', address: 'Carrera 45 #12-34', capacity: 120, contractor: 'FUNDACARIBE' },
        // Más ubicaciones...
      ]);
      
      setContractors([
        { id: 'CUC', name: 'CUC' },
        { id: 'FUNDACARIBE', name: 'FUNDACARIBE' },
      ]);
      
      setLoading(false);
    }, 1000);
  }, []);
  
  // Handler para abrir diálogo de edición/creación
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
  
  // Handler para guardar una ubicación
  const handleSaveLocation = () => {
    // Aquí iría la lógica para guardar en Firestore
    console.log('Guardando ubicación:', formData);
    
    if (selectedLocation) {
      // Actualizar ubicación existente
      setLocations(prevLocations => 
        prevLocations.map(loc => 
          loc.id === selectedLocation.id ? { ...formData, id: loc.id } : loc
        )
      );
    } else {
      // Crear nueva ubicación
      const newLocation = { 
        ...formData, 
        id: Date.now().toString() // Simulación de ID
      };
      setLocations(prev => [...prev, newLocation]);
    }
    
    setDialogOpen(false);
  };
  
  // Handler para eliminar ubicación
  const handleDeleteLocation = (locationId) => {
    // Aquí iría la lógica para eliminar en Firestore
    setLocations(prev => prev.filter(loc => loc.id !== locationId));
  };
  
  // Handler para asignar contratista
  const handleOpenAssignDialog = (location) => {
    setSelectedLocation(location);
    setFormData({ ...location });
    setAssignDialogOpen(true);
  };
  
  const handleAssignContractor = () => {
    // Actualizar la ubicación con el nuevo contratista
    setLocations(prevLocations => 
      prevLocations.map(loc => 
        loc.id === selectedLocation.id ? { ...loc, contractor: formData.contractor } : loc
      )
    );
    setAssignDialogOpen(false);
  };
  
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
      <CardContent>
        {loading ? (
          <Typography align="center">Cargando espacios...</Typography>
        ) : (
          <>
            <List>
              {locations.map((location) => (
                <React.Fragment key={location.id}>
                  <ListItem>
                    <ListItemText
                      primary={location.name}
                      secondary={
                        <>
                          <Typography component="span" variant="body2" color="text.primary">
                            {location.type === 'center' ? 'Centro Fijo' : 'Espacio Comunitario'}
                          </Typography>
                          {` — ${location.address} - Capacidad: ${location.capacity} personas`}
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
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Tipo</InputLabel>
                      <Select
                        value={formData.type}
                        label="Tipo"
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                      >
                        <MenuItem value="center">Centro Fijo</MenuItem>
                        <MenuItem value="park">Espacio Comunitario</MenuItem>
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
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button 
                  onClick={handleSaveLocation} 
                  variant="contained" 
                  color="primary"
                >
                  Guardar
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
                >
                  Asignar
                </Button>
              </DialogActions>
            </Dialog>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default LocationManager;