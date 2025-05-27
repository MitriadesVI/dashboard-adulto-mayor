// src/components/activities/ActivityForm.jsx

import React, { useState, useEffect } from 'react';
import { 
  Paper, Typography, Box, Grid, TextField, MenuItem, Button, 
  CircularProgress, Snackbar, Alert, FormControl, FormLabel, 
  RadioGroup, FormControlLabel, Radio, Link, Divider, 
  FormGroup, Checkbox, Collapse
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import activitiesService from '../../services/activitiesService';
import localStorageService from '../../services/localStorageService';
import locationsService from '../../services/locationsService';

const ActivityForm = ({ user, onSuccess, initialData, onCancel }) => {
  // Estado
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Estado para gestionar ubicaciones
  const [locations, setLocations] = useState([]);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  
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
    if (!user || !user.contractor || !type) return [];
    
    if (type === 'nutrition') {
      return [
        { value: 'workshop', label: user.contractor === 'CUC' ? 'Taller educativo del cuidado nutricional' : 'Jornada de promoción de la salud nutricional' }
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

  // Inicializar formik
  const formik = useFormik({
    initialValues: {
      date: initialData?.date || new Date().toISOString().split('T')[0],
      locationName: initialData?.location?.name || '',
      locationType: initialData?.location?.type || '',
      schedule: initialData?.schedule || 'J1',
      beneficiaries: initialData?.totalBeneficiaries || '',
      driveLink: initialData?.driveLink || '',
      
      // Campos para actividad educativa
      includeEducational: initialData?.educationalActivity?.included !== false,
      type: initialData?.educationalActivity?.type || '',
      subtype: initialData?.educationalActivity?.subtype || '',
      description: initialData?.educationalActivity?.description || '',
      
      // Campos para entrega de alimentación
      includeNutrition: initialData?.nutritionDelivery?.included !== false
    },
    validationSchema: Yup.object({
      date: Yup.date().required('Fecha requerida'),
      locationName: Yup.string().required('Nombre de la ubicación requerido'),
      locationType: Yup.string().required('Tipo de ubicación requerido'),
      schedule: Yup.string().required('Jornada requerida'),
      beneficiaries: Yup.number()
        .required('Número de beneficiarios requerido')
        .positive('Debe ser un número positivo')
        .integer('Debe ser un número entero'),
      driveLink: Yup.string()
        .url('Debe ser una URL válida')
        .nullable()
        .transform(value => value === '' ? null : value),
        
      // Validaciones para actividad educativa (condicionales)
      // CORRECCIÓN: manera correcta de usar when() con Yup
      type: Yup.string().when('includeEducational', {
        is: true,
        then: schema => schema.required('Tipo de actividad requerido'),
        otherwise: schema => schema.nullable()
      }),
      subtype: Yup.string().when('includeEducational', {
        is: true,
        then: schema => schema.required('Subtipo de actividad requerido'),
        otherwise: schema => schema.nullable()
      }),
      description: Yup.string().when('includeEducational', {
        is: true,
        then: schema => schema.required('Descripción requerida').min(20, 'La descripción debe tener al menos 20 caracteres'),
        otherwise: schema => schema.nullable()
      }),
      
      // Asegurar que al menos una opción esté seleccionada
      includeEducational: Yup.boolean(),
      includeNutrition: Yup.boolean().test(
        'at-least-one-included',
        'Debe incluir al menos actividad educativa o entrega de alimentos',
        function(value) {
          return value || this.parent.includeEducational;
        }
      )
    }),
    onSubmit: async (values) => {
      if (!user) return;
      
      setLoading(true);
      try {
        // Coordenadas por defecto si no se capturan por GPS
        const defaultLocation = {
          lat: 10.963889, // Barranquilla
          lng: -74.796387
        };

        // Estructura de datos actualizada
        const activityData = {
          date: values.date,
          contractor: user.contractor,
          location: {
            name: values.locationName,
            type: values.locationType,
            coordinates: defaultLocation
          },
          totalBeneficiaries: Number(values.beneficiaries),
          
          // Datos de actividad educativa
          educationalActivity: {
            included: values.includeEducational,
            type: values.includeEducational ? values.type : null,
            subtype: values.includeEducational ? values.subtype : null,
            description: values.includeEducational ? values.description : null
          },
          
          // Datos de entrega de alimentación
          nutritionDelivery: {
            included: values.includeNutrition,
            type: values.includeNutrition ? 
              (values.locationType === 'center' ? 'centerRation' : 'parkSnack') : null,
            description: values.includeNutrition ? 
              `Entrega de ${values.locationType === 'center' ? 'raciones alimenticias' : 'meriendas'} a los beneficiarios` : null
          },
          
          // Otros campos
          schedule: values.schedule || 'J1',
          driveLink: values.driveLink || null,
          createdBy: {
            uid: user.uid,
            name: user.name || 'Usuario Desconocido',
            role: user.role
          }
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

  // Efecto para cargar ubicaciones
  useEffect(() => {
    const loadLocations = async () => {
      if (!user || !user.contractor) return;
      
      setLoadingLocations(true);
      try {
        // Cargar ubicaciones asignadas al contratista del usuario
        const contractorLocations = await locationsService.getLocationsByContractor(user.contractor);
        setLocations(contractorLocations);
        
        // Filtrar inicialmente según el tipo seleccionado (si hay alguno)
        if (formik.values.locationType) {
          setFilteredLocations(
            contractorLocations.filter(loc => loc.type === formik.values.locationType)
          );
        } else {
          setFilteredLocations(contractorLocations);
        }
      } catch (error) {
        console.error("Error al cargar ubicaciones:", error);
        setSnackbar({
          open: true,
          message: "Error al cargar ubicaciones. Los campos de ubicación podrían no estar disponibles.",
          severity: "error"
        });
      } finally {
        setLoadingLocations(false);
      }
    };
    
    loadLocations();
  }, [user, formik.values.locationType]);

  // Efecto para filtrar ubicaciones cuando cambia el tipo
  useEffect(() => {
    if (formik.values.locationType && locations.length > 0) {
      setFilteredLocations(
        locations.filter(loc => loc.type === formik.values.locationType)
      );
    } else {
      setFilteredLocations(locations);
    }
  }, [formik.values.locationType, locations]);

  // Efecto para cargar datos de borrador
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

  // Efecto para guardar borradores automáticamente
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

  // Return condicional, después de que TODOS los hooks fueron llamados
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
          {/* SECCIÓN: TIPO DE REGISTRO */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight="medium" gutterBottom sx={{ mb: 1 }}>
              Tipo de Registro
            </Typography>
            <FormGroup row>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formik.values.includeEducational}
                    onChange={formik.handleChange}
                    name="includeEducational"
                    color="primary"
                  />
                }
                label="Incluye actividad educativa"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formik.values.includeNutrition}
                    onChange={formik.handleChange}
                    name="includeNutrition"
                    color="secondary"
                  />
                }
                label="Incluye entrega de alimentos"
              />
            </FormGroup>
            {formik.errors.includeNutrition && formik.touched.includeNutrition && (
              <Typography color="error" variant="caption">
                {formik.errors.includeNutrition}
              </Typography>
            )}
          </Grid>
          
          {/* SECCIÓN: INFORMACIÓN BÁSICA */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight="medium" gutterBottom sx={{ mb: 1 }}>
              Información básica
            </Typography>
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
              label="Número Total de Beneficiarios"
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
            <TextField
              fullWidth
              id="locationName"
              name="locationName"
              select
              label="Nombre del Lugar"
              value={formik.values.locationName}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.locationName && Boolean(formik.errors.locationName)}
              helperText={
                (formik.touched.locationName && formik.errors.locationName) || 
                (filteredLocations.length === 0 && !loadingLocations && formik.values.locationType 
                  ? `No hay ubicaciones disponibles para ${user.contractor} de tipo ${formik.values.locationType === 'center' ? 'Centro de Vida' : 'Parque/Espacio'}. Contacte al administrador.` 
                  : '')
              }
              InputProps={{ sx: { fontSize: '1rem' } }}
              disabled={!formik.values.locationType || loadingLocations || filteredLocations.length === 0}
            >
              {loadingLocations ? (
                <MenuItem value="" disabled>
                  Cargando ubicaciones...
                </MenuItem>
              ) : filteredLocations.length > 0 ? (
                filteredLocations.map((location) => (
                  <MenuItem key={location.id} value={location.name}>
                    {location.name}
                  </MenuItem>
                ))
              ) : (
                <MenuItem value="" disabled>
                  {formik.values.locationType
                    ? "No hay ubicaciones disponibles"
                    : "Seleccione primero un tipo de ubicación"}
                </MenuItem>
              )}
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
                  value="J1" 
                  control={<Radio />} 
                  label="J1" 
                  sx={{ '& .MuiFormControlLabel-label': { fontSize: '1rem' } }} 
                />
                <FormControlLabel 
                  value="J2" 
                  control={<Radio />} 
                  label="J2" 
                  disabled={formik.values.locationType === 'park'} 
                  sx={{ '& .MuiFormControlLabel-label': { fontSize: '1rem' } }} 
                />
                <FormControlLabel 
                  value="NA" 
                  control={<Radio />} 
                  label="N/A" 
                  sx={{ '& .MuiFormControlLabel-label': { fontSize: '1rem' } }} 
                />
              </RadioGroup>
            </FormControl>
          </Grid>
          
          {/* SECCIÓN: ACTIVIDAD EDUCATIVA */}
          <Grid item xs={12} sx={{ mt: 2 }}>
            <Divider />
            <Typography variant="subtitle1" fontWeight="medium" gutterBottom sx={{ mt: 2, mb: 1 }}>
              Actividad Educativa
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <Collapse in={formik.values.includeEducational}>
              <Grid container spacing={3}>
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
              </Grid>
            </Collapse>
            
            {!formik.values.includeEducational && (
              <Typography variant="body2" color="text.secondary">
                No se ha incluido actividad educativa en este registro.
              </Typography>
            )}
          </Grid>
          
          {/* SECCIÓN: ENTREGA DE ALIMENTOS */}
          <Grid item xs={12} sx={{ mt: 2 }}>
            <Divider />
            <Typography variant="subtitle1" fontWeight="medium" gutterBottom sx={{ mt: 2, mb: 1 }}>
              Entrega de Alimentos
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <Collapse in={formik.values.includeNutrition}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {formik.values.locationType === 'center' 
                  ? "Se registrará como entrega de raciones alimenticias en Centro de Vida." 
                  : formik.values.locationType === 'park'
                    ? "Se registrará como entrega de meriendas en Parque/Espacio Comunitario."
                    : "Seleccione un tipo de ubicación para especificar el tipo de entrega."}
              </Typography>
            </Collapse>
            
            {!formik.values.includeNutrition && (
              <Typography variant="body2" color="text.secondary">
                No se ha incluido entrega de alimentos en este registro.
              </Typography>
            )}
          </Grid>
          
          {/* Campo para enlace de Google Drive */}
          <Grid item xs={12} sx={{ mt: 2 }}>
            <Divider />
            <Typography variant="subtitle1" fontWeight="medium" gutterBottom sx={{ mt: 2, mb: 1 }}>
              Evidencias
            </Typography>
          </Grid>
          
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
                  <InsertDriveFileIcon color="primary" style={{ marginRight: 8 }} />
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