import React, { useState } from 'react';
import {
  Card, CardContent, CardHeader, Grid, Box,
  FormControl, InputLabel, Select, MenuItem, TextField,
  Button, Alert, Chip, CircularProgress, Typography
} from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import AssessmentIcon from '@mui/icons-material/Assessment';
import LocationOnIcon from '@mui/icons-material/LocationOn';

const LocationAnalysisFilters = ({ 
  availableLocations, 
  onAnalyze, 
  loading 
}) => {
  const [selectedLocation, setSelectedLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const selectedLocationInfo = availableLocations.find(loc => loc.name === selectedLocation);

  const handleAnalyze = () => {
    if (!selectedLocation || !selectedLocationInfo) return;
    
    onAnalyze(selectedLocationInfo, {
      startDate,
      endDate,
      selectedMonth
    });
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader
        title="Análisis Detallado por Ubicación"
        subheader="Análisis granular para detectar debilidades operativas"
        avatar={<ZoomInIcon />}
      />
      <CardContent>
        <Grid container spacing={3} alignItems="flex-end">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Ubicación</InputLabel>
              <Select
                value={selectedLocation}
                label="Ubicación"
                onChange={(e) => setSelectedLocation(e.target.value)}
              >
                {availableLocations.map((location) => (
                  <MenuItem key={location.name} value={location.name}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <LocationOnIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                      {location.name}
                      <Chip label={location.contractor} size="small" sx={{ ml: 1.5 }} variant="outlined"/>
                      {location.capacity > 0 && (
                        <Chip label={`Cap: ${location.capacity}`} size="small" sx={{ ml: 0.5 }} color="primary"/>
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              label="Fecha Inicio"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              label="Fecha Fin"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              label="Mes Calendario"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleAnalyze}
              disabled={!selectedLocation || loading}
              startIcon={loading ? <CircularProgress size={20} /> : <AssessmentIcon />}
              sx={{ height: '56px' }}
            >
              {loading ? 'Analizando...' : 'Analizar Ubicación'}
            </Button>
          </Grid>
        </Grid>
        
        {selectedLocationInfo && (
          <Box sx={{ mt: 2.5, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Alert severity="info" icon={<LocationOnIcon fontSize="inherit" />}>
              <Typography variant="subtitle1" component="div">
                <strong>{selectedLocationInfo.name}</strong> - {selectedLocationInfo.type} - {selectedLocationInfo.contractor}
                {selectedLocationInfo.capacity > 0 && ` - Capacidad: ${selectedLocationInfo.capacity} personas`}
              </Typography>
            </Alert>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default LocationAnalysisFilters;