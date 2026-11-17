// src/components/dashboard/filters/FilterPanel.jsx

import React from 'react';
import {
  Paper, Typography, Grid, FormControl, InputLabel,
  Select, MenuItem, TextField, Button, Box, CircularProgress
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { CONTRACTORS } from '../../../config/contractors';

// Opciones de los filtros (se exportan para describir los filtros aplicados en otras pestañas)
export const ACTIVITY_TYPE_OPTIONS = [
  { value: 'nutrition', label: 'Nutricional' },
  { value: 'physical', label: 'Salud Física' },
  { value: 'psychosocial', label: 'Psicosocial' }
];

export const LOCATION_TYPE_OPTIONS = [
  { value: 'center', label: 'Centro Fijo' },
  { value: 'park', label: 'Espacio Comunitario' }
];

const FilterPanel = ({
  filterContractor,
  setFilterContractor,
  filterType,
  setFilterType,
  filterLocation,
  setFilterLocation,
  filterDateStart,
  setFilterDateStart,
  filterDateEnd,
  setFilterDateEnd,
  onSubmit,
  loading,
  debugMode,
  setDebugMode
}) => {
  return (
    <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>Filtros</Typography>
      
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Contratista</InputLabel>
            <Select
              value={filterContractor}
              onChange={(e) => setFilterContractor(e.target.value)}
              label="Contratista"
            >
              <MenuItem value="all">Todos</MenuItem>
              {CONTRACTORS.map((contractor) => (
                <MenuItem key={contractor.id} value={contractor.id}>{contractor.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Tipo Actividad</InputLabel>
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              label="Tipo Actividad"
            >
              <MenuItem value="all">Todos</MenuItem>
              {ACTIVITY_TYPE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Tipo Ubicación</InputLabel>
            <Select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              label="Tipo Ubicación"
            >
              <MenuItem value="all">Todos</MenuItem>
              {LOCATION_TYPE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <TextField
            fullWidth
            size="small"
            label="Desde"
            type="date"
            value={filterDateStart}
            onChange={(e) => setFilterDateStart(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <TextField
            fullWidth
            size="small"
            label="Hasta"
            type="date"
            value={filterDateEnd}
            onChange={(e) => setFilterDateEnd(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              variant="contained" 
              fullWidth
              onClick={onSubmit}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            >
              {loading ? "Actualizando..." : "Actualizar"}
            </Button>
            
            <Button 
              variant="outlined"
              color="secondary"
              onClick={() => setDebugMode(!debugMode)}
              sx={{ minWidth: '48px', width: '48px' }}
            >
              🐞
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default FilterPanel;