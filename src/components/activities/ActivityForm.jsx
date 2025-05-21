// src/components/activities/ActivityForm.jsx

import React, { useState, useEffect } from 'react';
import { 
  Paper, 
  Typography, 
  Box, 
  Grid, 
  TextField, 
  MenuItem, 
  Button, 
  CircularProgress, 
  Snackbar, 
  Alert,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Link,
  Divider
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import activitiesService from '../../services/activitiesService';
import localStorageService from '../../services/localStorageService';

const ActivityForm = ({ user, onSuccess, initialData, onCancel }) => {
  // ⚠️ TODOS los hooks van PRIMERO, antes de cualquier lógica condicional
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Obtener los datos para selects
  const getActivityTypes = () => {
    if (!user || !user.contractor) return [];
    
    return [
      { value: 'nutrition', label: user.contractor === 'CUC' ? 'Educación Nutricional' : 'Salud Nutricional' },
      { value: 'physical', label: user.contractor === 'CUC' ? 'Educación en Salud Física' : 'Salud Física' },
      { value: 'psychosocial', label: user.contractor === 'CUC' ? 'Educación Psicosocial' : 'Salud Psicosocial' },
    ];
  };

  const getSubtypes = (type) => {
    if (!user || !user.contractor) return [];
    
    if (type === 'nutrition') {
      return [
        { value: 'workshop', label: user.contractor === 'CUC' ? 'Taller educativo del cuidado nutricional' : 'Jornada de promoción de la salud nutricional' },
        { value: 'ration', label: 'Raciones alimenticias/meriendas' }
      ];
    } else if (type === 'physical') {
      return [
        { value: 'prevention', label: 'Charlas de prevención de enfermedad' },
        { value: 'therapeutic', label: 'Actividad física terapéutica' },
        { value: 'rumba', label: 'Rumbaterapia y ejercicios dirigidos' },
        { value: 'walking', label: 'Club de caminantes' }
      ];
    } else if (type === 'psychosocial') {
      return [
        { value: 'mental', label: 'Jornadas/talleres en salud mental' },
        { value: 'cognitive', label: 'Jornadas/talleres cognitivos' },
        { value: 'abuse', label: 'Talleres en prevención al maltrato' },
        { value: 'arts', label: 'Talleres en artes y oficios' },
        { value: 'intergenerational', label: 'Encuentros intergeneracionales' }
      ];
    }
    return [];
  };

  // useFormik DEBE estar ANTES de cualquier return
  const formik = useFormik({
    initialValues: {
      type: initialData?.type || '',
      subtype: initialData?.subtype || '',
      date: initialData?.date || new Date().toISOString().split('T')[0],
      locationName: initialData?.location?.name || '',
      locationType: initialData?.location?.type || '',
      schedule: initialData?.schedule || 'morning',
      beneficiaries: initialData?.beneficiaries || '',
      description: initialData?.description || '',
      driveLink: initialData?.driveLink || ''
    },
    validationSchema: Yup.object({
      type: Yup.string().required('Tipo de actividad requerido'),
      subtype: Yup.string().required('Subtipo de actividad requerido'),
      date: Yup.date().required('Fecha requerida'),
      locationName: Yup.string().required('Nombre de la ubicación requerido'),
      locationType: Yup.string().required('Tipo de ubicación requerido'),
      schedule: Yup.string().required('Jornada requerida'),
      beneficiaries: Yup.number()
        .required('Número de beneficiarios requerido')
        .positive('Debe ser un número positivo')
        .integer('Debe ser un número entero'),
      description: Yup.string()
        .required('Descripción requerida')
        .min(20, 'La descripción debe tener al menos 20 caracteres'),
      driveLink: Yup.string()
        .url('Debe ser una URL válida')
        .nullable()
        .transform(value => value === '' ? null : value)
    }),
    onSubmit: async (values) => {
      if (!user) return;
      
      setLoading(true);
      try {
        // Crear ubicación ficticia (eliminamos requisito GPS)
        const defaultLocation = {
          lat: 10.963889, // Barranquilla
          lng: -74.796387
        };

        const activityData = {
          ...values,
          contractor: user.contractor,
          location: {
            name: values.locationName,
            type: values.locationType,
            coordinates: defaultLocation
          },
          driveLink: values.driveLink || null,
          createdBy: {
            uid: user.uid,
            name: user.name || 'Usuario Desconocido',
            role: user.role
          },
          status: 'pending',
          createdAt: new Date().toISOString(),
        };

        if (!localStorageService.isOnline()) {
          localStorageService.savePendingActivity(activityData);
          setSnackbar({ open: true, message: 'Actividad guardada localmente. Se sincronizará.', severity: 'info' });
        } else {
          await activitiesService.createActivity(activityData);
          setSnackbar({ open: true, message: 'Actividad registrada correctamente', severity: 'success' });
        }
        
        formik.resetForm();
        localStorageService.clearFormDraft();
        if (onSuccess) onSuccess();

      } catch (error) {
        console.error('Error al registrar actividad:', error);
        setSnackbar({ open: true, message: 'Error al registrar actividad. Verifique los datos o la conexión.', severity: 'error' });
      } finally {
        setLoading(false);
      }
    }
  });

  // Efecto para cargar datos de borrador - DEBE estar ANTES de cualquier return
  useEffect(() => {
    if (!initialData && user) {
      const draft = localStorageService.getFormDraft();
      if (draft && draft.formValues) {
        formik.setValues(draft.formValues);
        setSnackbar({ open: true, message: 'Borrador restaurado', severity: 'info' });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, user]); 

  // Efecto para guardar borradores automáticamente - DEBE estar ANTES de cualquier return
  useEffect(() => {
    let saveTimeout;
    if (formik.dirty && user) {
      saveTimeout = setTimeout(() => {
        localStorageService.saveFormDraft({
          formValues: formik.values
        });
        
        setSnackbar({ open: true, message: 'Borrador guardado automáticamente', severity: 'info' });
      }, 3000); 
    }
    return () => clearTimeout(saveTimeout);
  }, [formik.values, formik.dirty, user]);

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // AHORA podemos hacer el return condicional, después de que TODOS los hooks fueron llamados
  if (!user || !user.contractor) {
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 4, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>Cargando datos del formulario...</Typography>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Asegúrese de haber iniciado sesión y que su perfil esté completo.
        </Typography>
      </Paper>
    );
  }

  // El JSX principal del componente
  return (
    <Paper elevation={3} sx={{ p: 2, mb: 4 }}>
      {/* Encabezado con botón de regreso para móvil */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        {onCancel && (
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={onCancel}
            sx={{ mr: 2 }}
          >
            Volver
          </Button>
        )}
        <Typography variant="h5" component="h1">
          {initialData ? 'Editar' : 'Nueva'} Actividad
        </Typography>
      </Box>
      
      <Divider sx={{ mb: 3 }} />
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Complete todos los campos requeridos. Los enlaces a Google Drive son opcionales.
        </Typography>
      </Box>
      
      <form onSubmit={formik.handleSubmit}>
        <Grid container spacing={3}>
          {/* SECCIÓN: INFORMACIÓN BÁSICA */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight="medium" gutterBottom sx={{ mb: 1 }}>
              Información básica
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              id="type"
              name="type"
              select
              label="Tipo de Actividad"
              value={formik.values.type}
              onChange={(e) => {
                formik.setFieldValue('type', e.target.value);
                formik.setFieldValue('subtype', '');
              }}
              error={formik.touched.type && Boolean(formik.errors.type)}
              helperText={formik.touched.type && formik.errors.type}
              InputProps={{ sx: { fontSize: '1rem' } }}
            >
              {getActivityTypes().map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              id="subtype"
              name="subtype"
              select
              label="Actividad Específica"
              value={formik.values.subtype}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.subtype && Boolean(formik.errors.subtype)}
              helperText={formik.touched.subtype && formik.errors.subtype}
              disabled={!formik.values.type}
              InputProps={{ sx: { fontSize: '1rem' } }}
            >
              {getSubtypes(formik.values.type).map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              id="date"
              name="date"
              type="date"
              label="Fecha de Actividad"
              value={formik.values.date}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.date && Boolean(formik.errors.date)}
              helperText={formik.touched.date && formik.errors.date}
              InputLabelProps={{ shrink: true }}
              inputProps={{ style: { fontSize: '1rem' } }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              id="beneficiaries"
              name="beneficiaries"
              type="number"
              label="Beneficiarios"
              value={formik.values.beneficiaries}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.beneficiaries && Boolean(formik.errors.beneficiaries)}
              helperText={formik.touched.beneficiaries && formik.errors.beneficiaries}
              inputProps={{ style: { fontSize: '1rem' } }}
            />
          </Grid>
          
          {/* SECCIÓN: UBICACIÓN */}
          <Grid item xs={12} sx={{ mt: 2 }}>
            <Divider />
            <Typography variant="subtitle1" fontWeight="medium" gutterBottom sx={{ mt: 2, mb: 1 }}>
              Ubicación y horario
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              id="locationName"
              name="locationName"
              label="Nombre del Lugar"
              value={formik.values.locationName}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.locationName && Boolean(formik.errors.locationName)}
              helperText={formik.touched.locationName && formik.errors.locationName}
              InputProps={{ sx: { fontSize: '1rem' } }}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              id="locationType"
              name="locationType"
              select
              label="Tipo de Ubicación"
              value={formik.values.locationType}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.locationType && Boolean(formik.errors.locationType)}
              helperText={formik.touched.locationType && formik.errors.locationType}
              InputProps={{ sx: { fontSize: '1rem' } }}
            >
              <MenuItem value="center">Centro de Vida Fijo</MenuItem>
              <MenuItem value="park">Parque/Espacio Comunitario</MenuItem>
            </TextField>
          </Grid>
          
          <Grid item xs={12}>
            <FormControl component="fieldset" sx={{ mb: 2 }}>
              <FormLabel component="legend">Jornada</FormLabel>
              <RadioGroup
                row
                name="schedule"
                value={formik.values.schedule}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              >
                <FormControlLabel 
                  value="morning" 
                  control={<Radio />} 
                  label="Mañana" 
                  sx={{ '& .MuiFormControlLabel-label': { fontSize: '1rem' } }} 
                />
                <FormControlLabel 
                  value="afternoon" 
                  control={<Radio />} 
                  label="Tarde" 
                  disabled={formik.values.locationType === 'park'} 
                  sx={{ '& .MuiFormControlLabel-label': { fontSize: '1rem' } }} 
                />
              </RadioGroup>
            </FormControl>
          </Grid>
          
          {/* SECCIÓN: DESCRIPCIÓN Y EVIDENCIAS */}
          <Grid item xs={12} sx={{ mt: 2 }}>
            <Divider />
            <Typography variant="subtitle1" fontWeight="medium" gutterBottom sx={{ mt: 2, mb: 1 }}>
              Descripción y evidencias
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              id="description"
              name="description"
              label="Descripción de la Actividad"
              multiline
              rows={4}
              value={formik.values.description}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.description && Boolean(formik.errors.description)}
              helperText={formik.touched.description && formik.errors.description}
              InputProps={{ sx: { fontSize: '1rem' } }}
            />
          </Grid>

          {/* Campo para enlace de Google Drive */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              id="driveLink"
              name="driveLink"
              label="Enlace de Google Drive con evidencias"
              placeholder="https://drive.google.com/drive/folders/..."
              value={formik.values.driveLink}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.driveLink && Boolean(formik.errors.driveLink)}
              helperText={formik.touched.driveLink && formik.errors.driveLink 
                ? formik.errors.driveLink 
                : "Incluya un enlace a su carpeta de Drive con las evidencias fotográficas"}
              InputProps={{
                startAdornment: formik.values.driveLink ? (
                  <DriveFileIcon color="primary" style={{ marginRight: 8 }} />
                ) : null,
                endAdornment: formik.values.driveLink ? (
                  <Link 
                    href={formik.values.driveLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    sx={{ ml: 1, fontSize: '0.85rem' }}
                  >
                    Abrir Drive
                  </Link>
                ) : null,
                sx: { fontSize: '1rem' }
              }}
            />
          </Grid>
          
          {/* BOTONES DE ACCIÓN */}
          <Grid item xs={12} sx={{ mt: 4 }}>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={2} direction={{ xs: 'column', sm: 'row' }}>
              {onCancel && (
                <Grid item xs={12} sm={4}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="secondary"
                    onClick={onCancel}
                    size="large"
                    sx={{ height: '56px' }}
                  >
                    Cancelar
                  </Button>
                </Grid>
              )}
              
              <Grid item xs={12} sm={onCancel ? 4 : 6}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="secondary"
                  startIcon={<SaveIcon />}
                  onClick={() => {
                    localStorageService.saveFormDraft({ formValues: formik.values });
                    setSnackbar({ open: true, message: 'Borrador guardado', severity: 'success' });
                  }}
                  disabled={!formik.dirty}
                  size="large"
                  sx={{ height: '56px' }}
                >
                  Guardar Borrador
                </Button>
              </Grid>
              
              <Grid item xs={12} sm={onCancel ? 4 : 6}>
                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={loading || !formik.isValid || !formik.dirty}
                  size="large"
                  sx={{ height: '56px' }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : "Registrar Actividad"}
                </Button>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </form>
      
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default ActivityForm;