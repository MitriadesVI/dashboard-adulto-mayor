// src/components/activities/ActivityForm.jsx - VERSIÓN CORREGIDA PARA PROBLEMAS DE FOCO

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Paper, Typography, Box, Grid, TextField, MenuItem, Button,
  CircularProgress, Snackbar, Alert, FormControl,
  RadioGroup, FormControlLabel, Radio,
  Checkbox, Card, CardContent, IconButton,
  Stepper, Step, StepLabel, AppBar, Toolbar, LinearProgress,
  Chip
} from '@mui/material';

// Iconos
import SaveIcon from '@mui/icons-material/Save';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SchoolIcon from '@mui/icons-material/School';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleIcon from '@mui/icons-material/People';
import DateRangeIcon from '@mui/icons-material/DateRange';
import SendIcon from '@mui/icons-material/Send';

import { useFormik } from 'formik';
import * as Yup from 'yup';
import activitiesService from '../../services/activitiesService';
import localStorageService from '../../services/localStorageService';
import locationsService from '../../services/locationsService';
import { getActivityTypeLabel, getActivitySubtypeLabel } from '../dashboard/common/helpers';
import { getContractorName } from '../../config/contractors';
import { todayKey, toDateKey } from '../../utils/dates';

// ========== FUNCIONES EXTERNAS (CRÍTICO) ==========
// Las etiquetas dependen del contratista (ver src/config/contractors.js)
const ACTIVITY_SUBTYPES = {
  nutrition: ['workshop'],
  physical: ['prevention', 'therapeutic', 'rumba', 'walking'],
  psychosocial: ['mental', 'cognitive', 'abuse', 'arts', 'intergenerational']
};

const MAX_BENEFICIARIES = 500;

const getActivityTypes = (contractor) => {
  if (!contractor) return [];
  return Object.keys(ACTIVITY_SUBTYPES).map(type => ({
    value: type,
    label: getActivityTypeLabel(type, contractor)
  }));
};

const getSubtypes = (type, contractor) => {
  if (!contractor || !type || !ACTIVITY_SUBTYPES[type]) return [];
  return ACTIVITY_SUBTYPES[type].map(subtype => ({
    value: subtype,
    label: getActivitySubtypeLabel(type, subtype, contractor)
  }));
};

// ✅ CLAVE 1: SCHEMA DE VALIDACIÓN ESTÁTICO
const createValidationSchema = () => Yup.object({
  date: Yup.string()
    .required('Fecha requerida')
    .test('not-future', 'La fecha no puede ser futura', value => !value || value <= todayKey()),
  locationName: Yup.string().required('Nombre de la ubicación requerido'),
  locationType: Yup.string().required('Tipo de ubicación requerido'),
  schedule: Yup.string().required('Jornada requerida'),
  beneficiaries: Yup.number()
    .required('Número de beneficiarios requerido')
    .positive('Debe ser un número positivo')
    .integer('Debe ser un número entero')
    .max(MAX_BENEFICIARIES, `Verifique el número: máximo ${MAX_BENEFICIARIES} beneficiarios por actividad`),
  driveLink: Yup.string()
    .url('Debe ser una URL válida')
    .nullable()
    .transform(value => value === '' ? null : value),
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
    then: schema => schema.required('Descripción requerida para actividades educativas').min(20, 'La descripción debe tener al menos 20 caracteres'),
    otherwise: schema => schema.nullable()
  }),
  includeEducational: Yup.boolean(),
  includeNutrition: Yup.boolean().test(
    'at-least-one-included',
    'Debe incluir al menos actividad educativa o entrega de alimentos',
    function(value) {
      return value || this.parent.includeEducational;
    }
  )
});

// ✅ CLAVE 2: VALORES INICIALES ESTÁTICOS
const createInitialValues = (initialData) => ({
  date: (initialData?.date && toDateKey(initialData.date)) || todayKey(),
  locationName: initialData?.location?.name || '',
  locationType: initialData?.location?.type || '',
  schedule: initialData?.schedule || 'J1',
  beneficiaries: initialData?.totalBeneficiaries || '',
  driveLink: initialData?.driveLink || '',
  includeEducational: initialData?.educationalActivity?.included !== false,
  type: initialData?.educationalActivity?.type || '',
  subtype: initialData?.educationalActivity?.subtype || '',
  description: initialData?.educationalActivity?.description || '',
  includeNutrition: initialData?.nutritionDelivery?.included !== false
});

// ✅ CLAVE 3: COMPONENTES DE PASO COMO COMPONENTES EXTERNOS MEMOIZADOS
const TypeSelectionStep = React.memo(({ formik }) => (
  <Box sx={{ p: 3 }}>
    <Box sx={{ textAlign: 'center', mb: 4 }}>
      <Typography variant="h4" sx={{ mb: 1 }}>📋</Typography>
      <Typography variant="h5" fontWeight="medium" gutterBottom>
        ¿Qué vas a registrar?
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Puedes seleccionar una o ambas opciones
      </Typography>
    </Box>
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card
          sx={{
            cursor: 'pointer',
            border: formik.values.includeEducational ? 2 : 1,
            borderColor: formik.values.includeEducational ? 'primary.main' : 'grey.300',
            bgcolor: formik.values.includeEducational ? 'primary.main' : 'white',
            color: formik.values.includeEducational ? 'white' : 'inherit',
            '&:hover': { bgcolor: formik.values.includeEducational ? 'primary.dark' : 'grey.50' },
            transition: 'all 0.2s'
          }}
          onClick={() => {
              formik.setFieldValue('includeEducational', !formik.values.includeEducational);
              formik.setFieldTouched('includeEducational', true);
              formik.setFieldTouched('includeNutrition', true);
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Checkbox
                checked={formik.values.includeEducational}
                sx={{ 
                  mr: 2,
                  color: formik.values.includeEducational ? 'white' : 'primary.main',
                  '&.Mui-checked': { color: 'white' }
                }}
              />
              <SchoolIcon sx={{ 
                mr: 2, 
                fontSize: 32, 
                color: formik.values.includeEducational ? 'white' : 'primary.main' 
              }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" fontWeight="medium">
                  Actividad
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: formik.values.includeEducational ? 'rgba(255,255,255,0.8)' : 'text.secondary' 
                  }}
                >
                  Talleres, charlas, ejercicios dirigidos
                </Typography>
              </Box>
              {formik.values.includeEducational && (
                <CheckCircleIcon sx={{ color: 'white' }} />
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card
          sx={{
            cursor: 'pointer',
            border: formik.values.includeNutrition ? 2 : 1,
            borderColor: formik.values.includeNutrition ? 'secondary.main' : 'grey.300',
            bgcolor: formik.values.includeNutrition ? 'secondary.main' : 'white',
            color: formik.values.includeNutrition ? 'white' : 'inherit',
            '&:hover': { bgcolor: formik.values.includeNutrition ? 'secondary.dark' : 'grey.50' },
            transition: 'all 0.2s'
          }}
          onClick={() => {
              formik.setFieldValue('includeNutrition', !formik.values.includeNutrition);
              formik.setFieldTouched('includeNutrition', true);
              formik.setFieldTouched('includeEducational', true);
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Checkbox
                checked={formik.values.includeNutrition}
                sx={{ 
                  mr: 2,
                  color: formik.values.includeNutrition ? 'white' : 'secondary.main',
                  '&.Mui-checked': { color: 'white' }
                }}
              />
              <RestaurantIcon sx={{ 
                mr: 2, 
                fontSize: 32, 
                color: formik.values.includeNutrition ? 'white' : 'secondary.main' 
              }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" fontWeight="medium">
                  Entrega de Alimentos
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: formik.values.includeNutrition ? 'rgba(255,255,255,0.8)' : 'text.secondary' 
                  }}
                >
                  Raciones alimenticias o meriendas
                </Typography>
              </Box>
              {formik.values.includeNutrition && (
                <CheckCircleIcon sx={{ color: 'white' }} />
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
    {formik.touched.includeNutrition && formik.errors.includeNutrition && (
      <Alert severity="error" sx={{ mt: 2 }}>
        {formik.errors.includeNutrition}
      </Alert>
    )}
  </Box>
));

const BasicInfoStep = React.memo(({ formik, filteredLocations, loadingLocations }) => (
  <Box sx={{ p: 3 }}>
    <Box sx={{ textAlign: 'center', mb: 4 }}>
      <Typography variant="h4" sx={{ mb: 1 }}>📍</Typography>
      <Typography variant="h5" fontWeight="medium" gutterBottom>
        Información básica
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Datos generales de la actividad
      </Typography>
    </Box>
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <DateRangeIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="subtitle1" fontWeight="medium">Fecha</Typography>
            </Box>
            <TextField
              key="date-field" // ✅ Key estática
              fullWidth 
              type="date" 
              value={formik.values.date}
              onChange={formik.handleChange} 
              onBlur={formik.handleBlur} 
              name="date"
              error={formik.touched.date && Boolean(formik.errors.date)}
              helperText={formik.touched.date && formik.errors.date}
              InputLabelProps={{ shrink: true }}
              inputProps={{ max: todayKey() }}
              sx={{ '& input': { fontSize: '1.1rem' } }}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PeopleIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="subtitle1" fontWeight="medium">Beneficiarios</Typography>
            </Box>
            <TextField
              key="beneficiaries-field" // ✅ Key estática
              fullWidth 
              placeholder="Número total de beneficiarios"
              value={formik.values.beneficiaries} 
              onChange={formik.handleChange} // ✅ Handler directo de formik
              onBlur={formik.handleBlur} 
              name="beneficiaries"
              error={formik.touched.beneficiaries && Boolean(formik.errors.beneficiaries)}
              helperText={formik.touched.beneficiaries && formik.errors.beneficiaries}
              sx={{ '& input': { fontSize: '1.1rem' } }}
              autoComplete="off"
              inputProps={{ 
                inputMode: 'numeric',
                pattern: '[0-9]*',
                min: 1,
                max: MAX_BENEFICIARIES
              }}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LocationOnIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="subtitle1" fontWeight="medium">Ubicación</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              ¿Dónde realizaste la actividad?
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    border: formik.values.locationType === 'center' ? 2 : 1,
                    borderColor: formik.values.locationType === 'center' ? 'primary.main' : 'grey.300',
                    '&:hover': { bgcolor: 'grey.50' },
                    transition: 'all 0.2s'
                  }}
                  onClick={() => {
                    formik.setFieldValue('locationType', 'center');
                    formik.setFieldValue('locationName', '');
                    formik.setFieldTouched('locationType', true);
                    formik.setFieldTouched('locationName', true);
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h4" sx={{ mb: 1 }}>🏢</Typography>
                    <Typography variant="body2" fontWeight="medium">Centro de Vida</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    border: formik.values.locationType === 'park' ? 2 : 1,
                    borderColor: formik.values.locationType === 'park' ? 'primary.main' : 'grey.300',
                    '&:hover': { bgcolor: 'grey.50' },
                    transition: 'all 0.2s'
                  }}
                  onClick={() => {
                    formik.setFieldValue('locationType', 'park');
                    formik.setFieldValue('locationName', '');
                    formik.setFieldTouched('locationType', true);
                    formik.setFieldTouched('locationName', true);
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h4" sx={{ mb: 1 }}>🌳</Typography>
                    <Typography variant="body2" fontWeight="medium">Parque/Espacio</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            {formik.touched.locationType && formik.errors.locationType && (
              <Alert severity="error" sx={{ mt: 2 }}>{formik.errors.locationType}</Alert>
            )}
            {formik.values.locationType && (
              <Box sx={{ mt: 3 }}>
                <TextField
                  key="location-name-field" // ✅ Key estática
                  fullWidth 
                  select 
                  label="Selecciona el lugar específico"
                  value={formik.values.locationName} 
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur} 
                  name="locationName"
                  error={formik.touched.locationName && Boolean(formik.errors.locationName)}
                  helperText={formik.touched.locationName && formik.errors.locationName}
                  disabled={loadingLocations || filteredLocations.length === 0}
                  sx={{ '& .MuiSelect-select': { fontSize: '1.1rem' } }}
                >
                  {loadingLocations ? (
                    <MenuItem disabled>Cargando ubicaciones...</MenuItem>
                  ) : filteredLocations.length > 0 ? (
                    filteredLocations.map((location) => (
                      <MenuItem key={location.id} value={location.name}>
                        {location.name}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>
                      No hay ubicaciones para '{formik.values.locationType === 'center' ? 'Centros de Vida' : 'Parques/Espacios'}'
                    </MenuItem>
                  )}
                </TextField>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 2 }}>Jornada</Typography>
            <FormControl component="fieldset" error={formik.touched.schedule && Boolean(formik.errors.schedule)}>
              <RadioGroup
                row 
                name="schedule" 
                value={formik.values.schedule}
                onChange={formik.handleChange} 
                onBlur={formik.handleBlur}
              >
                <FormControlLabel value="J1" control={<Radio />} label="J1" sx={{ mr: 3 }} />
                <FormControlLabel
                  value="J2" 
                  control={<Radio />} 
                  label="J2"
                  disabled={formik.values.locationType === 'park'} 
                  sx={{ mr: 3 }}
                />
                <FormControlLabel value="NA" control={<Radio />} label="N/A" />
              </RadioGroup>
              {formik.touched.schedule && formik.errors.schedule && (
                <Typography color="error" variant="caption">{formik.errors.schedule}</Typography>
              )}
            </FormControl>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  </Box>
));

const ActivityDetailsStep = React.memo(({ formik, user }) => (
  <Box sx={{ p: 3 }}>
    <Box sx={{ textAlign: 'center', mb: 4 }}>
      <Typography variant="h4" sx={{ mb: 1 }}>🎓</Typography>
      <Typography variant="h5" fontWeight="medium" gutterBottom>
        Detalles de la actividad
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Información específica sobre lo realizado
      </Typography>
    </Box>

    {formik.values.includeEducational && (
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 2 }}>
                Tipo de Actividad Educativa
              </Typography>
              <TextField
                key="type-field" // ✅ Key estática
                fullWidth 
                select 
                value={formik.values.type}
                onChange={(e) => {
                  formik.setFieldValue('type', e.target.value);
                  formik.setFieldValue('subtype', '');
                  formik.setFieldTouched('type', true);
                }}
                onBlur={() => formik.setFieldTouched('type', true)}
                name="type"
                error={formik.touched.type && Boolean(formik.errors.type)}
                helperText={formik.touched.type && formik.errors.type}
                sx={{ '& .MuiSelect-select': { fontSize: '1.1rem' } }}
              >
                {getActivityTypes(user?.contractor).map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </CardContent>
          </Card>
        </Grid>

        {formik.values.type && (
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 2 }}>
                  Actividad Específica
                </Typography>
                <TextField
                  key="subtype-field" // ✅ Key estática
                  fullWidth 
                  select 
                  value={formik.values.subtype}
                  onChange={formik.handleChange} 
                  onBlur={formik.handleBlur}
                  name="subtype"
                  error={formik.touched.subtype && Boolean(formik.errors.subtype)}
                  helperText={formik.touched.subtype && formik.errors.subtype}
                  sx={{ '& .MuiSelect-select': { fontSize: '1.1rem' } }}
                >
                  {getSubtypes(formik.values.type, user?.contractor).map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    )}

    {formik.values.includeNutrition && (
      <Box sx={{ mb: 3 }}>
        <Card variant="outlined" sx={{ bgcolor: 'orange.50' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <RestaurantIcon sx={{ mr: 1, color: 'orange.main' }} />
              <Typography variant="subtitle1" fontWeight="medium">
                Entrega de Alimentos Incluida
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {formik.values.locationType === 'center'
                ? "Se registrará como entrega de raciones alimenticias en Centro de Vida."
                : formik.values.locationType === 'park'
                  ? "Se registrará como entrega de meriendas en Parque/Espacio Comunitario."
                  : "Se registrará la entrega de alimentos según el tipo de ubicación."}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    )}

    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 2 }}>
              {formik.values.includeEducational && formik.values.includeNutrition
                ? "Descripción de la Actividad y Observaciones"
                : formik.values.includeEducational
                  ? "Descripción de la Actividad Educativa"
                  : formik.values.includeNutrition
                    ? "Observaciones de la Entrega de Alimentos"
                    : "Descripción y Observaciones"}
            </Typography>
            
            <TextField
              key="description-field" // ✅ Key estática CRÍTICA
              fullWidth
              multiline
              rows={5}
              name="description"
              value={formik.values.description}
              onChange={formik.handleChange} // ✅ Handler directo de formik
              onBlur={formik.handleBlur}
              placeholder={
                formik.values.includeEducational && formik.values.includeNutrition
                  ? "Describe detalladamente la actividad educativa realizada y cualquier observación sobre la entrega de alimentos..."
                  : formik.values.includeEducational
                    ? "Describe detalladamente la actividad educativa realizada: objetivos, metodología, participación, resultados..."
                    : formik.values.includeNutrition
                      ? "Registra observaciones sobre la entrega de alimentos: proceso, participación, incidencias, comentarios..."
                      : "Registra cualquier observación o detalle relevante de la actividad..."
              }
              error={formik.touched.description && Boolean(formik.errors.description)}
              helperText={
                formik.touched.description && formik.errors.description
                  ? formik.errors.description
                  : formik.values.includeEducational
                    ? "Mínimo 20 caracteres. Describe objetivos, desarrollo y resultados de la actividad"
                    : "Opcional. Registra observaciones generales sobre lo realizado"
              }
              variant="outlined"
              sx={{
                '& .MuiInputBase-root': {
                  fontSize: '1rem',
                  lineHeight: 1.5
                }
              }}
            />

            {/* Contador de caracteres */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
              <Typography 
                variant="caption" 
                color={(formik.values.description?.length || 0) < 20 && formik.values.includeEducational ? 'error' : 'text.secondary'}
                sx={{ fontSize: '0.75rem' }}
              >
                {formik.values.description?.length || 0} caracteres
                {formik.values.includeEducational && ` (mínimo 20)`}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>

    {!formik.values.includeEducational && (
      <Box sx={{ mt: 2 }}>
        <Card variant="outlined" sx={{ bgcolor: 'info.light', borderColor: 'info.main' }}>
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="body2" component="div" color="text.primary">
              💡 <strong>Solo entrega de alimentos:</strong> Usa la caja de arriba para registrar observaciones sobre el proceso de entrega, participación o cualquier incidencia relevante.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    )}
  </Box>
));

const ConfirmationStep = React.memo(({ formik, user }) => (
  <Box sx={{ p: 3 }}>
    <Box sx={{ textAlign: 'center', mb: 4 }}>
      <Typography variant="h4" sx={{ mb: 1 }}>✅</Typography>
      <Typography variant="h5" fontWeight="medium" gutterBottom>
        Confirmar y enviar
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Revisa los datos antes de registrar
      </Typography>
    </Box>
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 2 }}>
              📋 Resumen de la Actividad
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Chip
                label={`📅 ${formik.values.date ? new Date(formik.values.date + 'T00:00:00').toLocaleDateString() : 'Fecha no establecida'}`}
                sx={{ mr: 1, mb: 1 }}
              />
              <Chip
                label={`👥 ${formik.values.beneficiaries || 0} beneficiarios`}
                sx={{ mr: 1, mb: 1 }}
              />
              <Chip
                label={`📍 ${formik.values.locationName || 'Ubicación no establecida'}`}
                sx={{ mr: 1, mb: 1 }}
              />
              <Chip
                label={`🕐 ${formik.values.schedule || 'N/A'}`}
                sx={{ mr: 1, mb: 1 }}
              />
            </Box>
            {formik.values.includeEducational && (
              <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                <Typography variant="body2" fontWeight="medium">🎓 Actividad Educativa:</Typography>
                <Typography variant="body2">
                  Tipo: {getActivityTypes(user?.contractor).find(t => t.value === formik.values.type)?.label || 'No especificado'}
                </Typography>
                <Typography variant="body2" sx={{mt: 0.5}}>
                  Subtipo: {getSubtypes(formik.values.type, user?.contractor).find(s => s.value === formik.values.subtype)?.label || 'No especificado'}
                </Typography>
              </Box>
            )}
            {formik.values.description && (
              <Box sx={{ mb: 2, p: 2, bgcolor: formik.values.includeEducational ? 'grey.100' : 'primary.light', borderRadius: 1 }}>
                 <Typography variant="body2" fontWeight="medium">
                   📝 {formik.values.includeEducational ? 'Descripción / Observaciones:' : 'Observaciones:'}
                 </Typography>
                 <Typography variant="body2" sx={{mt: 0.5, whiteSpace: 'pre-wrap'}}>
                   {formik.values.description}
                 </Typography>
              </Box>
            )}
            {formik.values.includeNutrition && (
              <Box sx={{ mb: 2, p: 2, bgcolor: 'secondary.light', borderRadius: 1 }}>
                <Typography variant="body2" fontWeight="medium">🍽️ Entrega de Alimentos:</Typography>
                <Typography variant="body2">
                  {formik.values.locationType === 'center'
                    ? 'Raciones alimenticias en Centro de Vida'
                    : formik.values.locationType === 'park'
                      ? 'Meriendas en Parque/Espacio Comunitario'
                      : 'Entrega de alimentos (tipo de lugar no especificado)'}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 2 }}>
              📎 Evidencias (Opcional)
            </Typography>
            <TextField
              key="drive-link-field" // ✅ Key estática
              fullWidth 
              placeholder="https://drive.google.com/drive/folders/..."
              value={formik.values.driveLink} 
              onChange={formik.handleChange}
              onBlur={formik.handleBlur} 
              name="driveLink"
              error={formik.touched.driveLink && Boolean(formik.errors.driveLink)}
              helperText={(formik.touched.driveLink && formik.errors.driveLink) || "Enlace a carpeta de Google Drive con evidencias"}
              InputProps={{
                startAdornment: formik.values.driveLink && (
                  <InsertDriveFileIcon color="primary" sx={{ mr: 1 }} />
                ),
                sx: { fontSize: '1.1rem' }
              }}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  </Box>
));

// ========== COMPONENTE PRINCIPAL ==========
const ActivityForm = ({ user, onSuccess, initialData, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  const steps = [
    { label: 'Tipo', icon: '📋' },
    { label: 'Básico', icon: '📍' },
    { label: 'Actividad', icon: '🎓' },
    { label: 'Confirmar', icon: '✅' }
  ];

  // ✅ CLAVE 4: MEMOIZAR SCHEMA Y VALORES INICIALES
  const validationSchema = useMemo(() => createValidationSchema(), []);
  const initialValues = useMemo(() => createInitialValues(initialData), [initialData]);

  // Corregir una actividad rechazada la actualiza y la devuelve a revisión;
  // duplicar (initialData sin id) crea una actividad nueva.
  const isResubmission = Boolean(initialData?.id && initialData?.status === 'rejected');

  const formik = useFormik({
    initialValues,
    validationSchema,
    enableReinitialize: false, // ✅ CRÍTICO: No reinicializar
    onSubmit: async (values) => {
      if (!user) return;
      setLoading(true);
      try {
        const selectedLocation = locations.find(loc =>
          loc?.name === values.locationName && loc?.type === values.locationType
        );
        const activityData = {
          date: values.date,
          contractor: user.contractor,
          locationId: selectedLocation?.id || null,
          location: {
            name: values.locationName,
            type: values.locationType,
            coordinates: selectedLocation?.coordinates || null
          },
          totalBeneficiaries: Number(values.beneficiaries),
          educationalActivity: {
            included: values.includeEducational,
            type: values.includeEducational ? values.type : null,
            subtype: values.includeEducational ? values.subtype : null,
            description: values.includeEducational ? values.description : null
          },
          nutritionDelivery: {
            included: values.includeNutrition,
            type: values.includeNutrition ?
              (values.locationType === 'center' ? 'centerRation' : 'parkSnack') : null,
            description: values.includeNutrition ?
              `Entrega de ${values.locationType === 'center' ? 'raciones alimenticias' : 'meriendas'} a los beneficiarios` : null
          },
          generalObservations: !values.includeEducational && values.description ? values.description : null,
          schedule: values.schedule || 'J1',
          driveLink: values.driveLink || null,
          createdBy: {
            uid: user.uid,
            name: user.name || 'Usuario Desconocido',
            role: user.role
          }
        };

        let successMessage;
        if (isResubmission) {
          if (!localStorageService.isOnline()) {
            setSnackbar({ open: true, message: 'Necesita conexión para reenviar una actividad corregida.', severity: 'warning' });
            return;
          }
          await activitiesService.resubmitActivity(initialData.id, activityData, initialData);
          successMessage = 'Actividad corregida y enviada de nuevo a revisión';
        } else if (!localStorageService.isOnline()) {
          localStorageService.savePendingActivity(activityData);
          successMessage = 'Sin conexión: actividad guardada en este dispositivo. Se enviará automáticamente al recuperar la conexión.';
        } else {
          await activitiesService.createActivity(activityData);
          successMessage = 'Actividad registrada correctamente';
        }
        formik.resetForm();
        localStorageService.clearFormDraft();
        if (onSuccess) onSuccess(successMessage);
      } catch (error) {
        console.error('Error al registrar actividad:', error);
        setSnackbar({ open: true, message: 'Error al registrar actividad. Verifique los datos o la conexión.', severity: 'error' });
      } finally {
        setLoading(false);
      }
    }
  });

  // ✅ CLAVE 5: MEMOIZAR UBICACIONES FILTRADAS
  const filteredLocations = useMemo(() => {
    const locationType = formik.values.locationType;
    const activeLocations = locations.filter(loc => loc?.active !== false);
    if (!locationType) return activeLocations;
    return activeLocations.filter(loc => loc?.type === locationType);
  }, [locations, formik.values.locationType]);

  // ✅ CLAVE 6: CARGAR UBICACIONES SIN DEPENDENCIAS PROBLEMÁTICAS
  useEffect(() => {
    const loadLocations = async () => {
      if (!user?.contractor) return;
      setLoadingLocations(true);
      try {
        const contractorLocations = await locationsService.getLocationsByContractor(user.contractor);
        setLocations(contractorLocations);
      } catch (error) {
        console.error("Error al cargar ubicaciones:", error);
        setSnackbar({ open: true, message: "Error al cargar ubicaciones.", severity: "error" });
      } finally {
        setLoadingLocations(false);
      }
    };
    loadLocations();
  }, [user?.contractor]);

  // Recuperar el borrador guardado (solo para actividades nuevas, una vez al abrir)
  useEffect(() => {
    if (initialData) return;
    const draft = localStorageService.getFormDraft();
    if (draft?.formValues) {
      formik.setValues({ ...createInitialValues(null), ...draft.formValues }, false);
      setSnackbar({ open: true, message: 'Se recuperó el borrador guardado.', severity: 'info' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ CLAVE 7: HANDLERS OPTIMIZADOS SIN DEPENDENCIAS PROBLEMÁTICAS
  const canProceedToNextStep = useCallback(() => {
    switch (currentStep) {
      case 0:
        return (formik.values.includeEducational || formik.values.includeNutrition) && !formik.errors.includeNutrition;
      case 1:
        return formik.values.date && formik.values.beneficiaries &&
               formik.values.locationName && formik.values.locationType &&
               !formik.errors.date && !formik.errors.beneficiaries &&
               !formik.errors.locationName && !formik.errors.locationType &&
               !formik.errors.schedule;
      case 2:
        if (!formik.values.includeEducational) return !formik.errors.description;
        return formik.values.type && formik.values.subtype && !formik.errors.description &&
               !formik.errors.type && !formik.errors.subtype;
      case 3:
        return formik.isValid;
      default:
        return false;
    }
  }, [currentStep, formik.values, formik.errors, formik.isValid]);

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
  }, [currentStep, steps.length]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  }, [currentStep]);

  const handleCloseSnackbar = useCallback((event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  // ✅ CLAVE 8: HANDLER SIMPLIFICADO PARA NAVEGACIÓN
  const handleNextStep = useCallback(async () => {
    try {
      const errors = await formik.validateForm();
      
      const fieldsToTouch = [];
      if (currentStep === 0) fieldsToTouch.push('includeEducational', 'includeNutrition');
      if (currentStep === 1) fieldsToTouch.push('date', 'beneficiaries', 'locationType', 'locationName', 'schedule');
      if (currentStep === 2) {
        if (formik.values.includeEducational) fieldsToTouch.push('type', 'subtype');
        fieldsToTouch.push('description');
      }
      
      fieldsToTouch.forEach(field => {
        formik.setFieldTouched(field, true, false);
      });
      
      if (canProceedToNextStep()) {
        nextStep();
      } else {
        setSnackbar({
          open: true,
          message: 'Completa los campos requeridos para continuar.',
          severity: 'warning'
        });
      }
    } catch (error) {
      console.error('Error en navegación:', error);
      setSnackbar({
        open: true,
        message: 'Error al validar formulario.',
        severity: 'error'
      });
    }
  }, [currentStep, formik, canProceedToNextStep, nextStep]);

  // ✅ CLAVE 9: MEMOIZAR CONTENIDO DE PASOS
  const stepContent = useMemo(() => {
    switch (currentStep) {
      case 0: 
        return <TypeSelectionStep formik={formik} />;
      case 1: 
        return <BasicInfoStep formik={formik} filteredLocations={filteredLocations} loadingLocations={loadingLocations} />;
      case 2: 
        return <ActivityDetailsStep formik={formik} user={user} />;
      case 3: 
        return <ConfirmationStep formik={formik} user={user} />;
      default: 
        return null;
    }
  }, [currentStep, formik, filteredLocations, loadingLocations, user]);

  if (!user || !user.contractor) {
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Cargando formulario...
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ maxWidth: 'md', mx: 'auto', pb: 15 }}>
      {/* Header fijo con progreso */}
      <AppBar position="sticky" color="primary" elevation={1}>
        <Toolbar>
          {onCancel && (
            <IconButton edge="start" color="inherit" onClick={onCancel} sx={{ mr: 2 }}>
              <ArrowBackIcon />
            </IconButton>
          )}
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">
              {isResubmission ? 'Corregir' : 'Nueva'} Actividad
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              {getContractorName(user.contractor)} - {user.name}
            </Typography>
          </Box>
        </Toolbar>
        <LinearProgress
          variant="determinate"
          value={(currentStep + 1) / steps.length * 100}
          sx={{ height: 4 }}
        />
      </AppBar>

      {isResubmission && initialData.rejectionReason && (
        <Alert severity="error" sx={{ mt: 2 }}>
          <strong>Motivo del rechazo:</strong> {initialData.rejectionReason}
        </Alert>
      )}

      {/* Stepper */}
      <Paper sx={{ mb: 2 }}>
        <Stepper activeStep={currentStep} alternativeLabel>
          {steps.map((step, index) => (
            <Step key={step.label} completed={currentStep > index && formik.isValid}>
              <StepLabel error={currentStep === index && !canProceedToNextStep() && Object.values(formik.touched).some(Boolean) && Object.keys(formik.errors).length > 0}>
                <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                  {step.label}
                </Box>
                <Typography sx={{ display: { xs: 'block', sm: 'none' } }}>
                  {step.icon}
                </Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* ✅ CLAVE 10: CONTENIDO CON KEY ESTÁTICA */}
      <Paper elevation={2}>
        <form onSubmit={formik.handleSubmit}>
          <Box key={`form-step-${currentStep}`}>
            {stepContent}
          </Box>
        </form>
      </Paper>

      {/* BOTONES DE NAVEGACIÓN */}
      <Paper
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          p: { xs: 1.5, sm: 2 },
          zIndex: 1000
        }}
        elevation={8}
      >
        <Grid container spacing={1} sx={{ maxWidth: 'md', mx: 'auto' }}>
          <Grid item xs={12} sm={3}>
            <Button
              fullWidth
              variant="outlined"
              onClick={prevStep}
              disabled={currentStep === 0}
              startIcon={<ArrowBackIcon />}
              size={window.innerWidth < 600 ? "small" : "medium"}
              sx={{ 
                minHeight: { xs: '40px', sm: '48px' },
                fontSize: { xs: '0.8rem', sm: '0.875rem' }
              }}
            >
              Atrás
            </Button>
          </Grid>

          <Grid item xs={12} sm={6} sx={{ display: { xs: 'none', sm: 'block' } }}>
            <Button
              fullWidth
              variant="text"
              startIcon={<SaveIcon />}
              onClick={() => {
                localStorageService.saveFormDraft({ formValues: formik.values });
                setSnackbar({ open: true, message: 'Borrador guardado', severity: 'success' });
              }}
              disabled={!formik.dirty || !!initialData}
              size="medium"
              sx={{ minHeight: '48px' }}
            >
              Guardar Borrador
            </Button>
          </Grid>

          <Grid item xs={12} sm={3}>
            {currentStep === steps.length - 1 ? (
              <Button
                fullWidth
                variant="contained"
                onClick={() => {
                  formik.validateForm().then(errors => {
                    if (Object.keys(errors).length === 0) {
                      formik.submitForm();
                    } else {
                      Object.keys(formik.initialValues).forEach(key => {
                        formik.setFieldTouched(key, true, true);
                      });
                      setSnackbar({
                        open: true,
                        message: 'Hay errores en el formulario. Revisa los pasos.',
                        severity: 'error'
                      });
                    }
                  });
                }}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                size={window.innerWidth < 600 ? "small" : "medium"}
                sx={{ 
                  minHeight: { xs: '40px', sm: '48px' },
                  fontSize: { xs: '0.8rem', sm: '0.875rem' }
                }}
              >
                {loading ? '' : (isResubmission ? 'Reenviar' : 'Enviar')}
              </Button>
            ) : (
              <Button
                fullWidth
                variant="contained"
                onClick={handleNextStep}
                endIcon={<ArrowForwardIcon />}
                size={window.innerWidth < 600 ? "small" : "medium"}
                sx={{ 
                  minHeight: { xs: '40px', sm: '48px' },
                  fontSize: { xs: '0.8rem', sm: '0.875rem' }
                }}
              >
                Siguiente
              </Button>
            )}
          </Grid>

          <Grid item xs={12} sx={{ display: { xs: 'block', sm: 'none' }, mt: 1 }}>
            <Button
              fullWidth
              variant="text"
              startIcon={<SaveIcon />}
              onClick={() => {
                localStorageService.saveFormDraft({ formValues: formik.values });
                setSnackbar({ open: true, message: 'Borrador guardado', severity: 'success' });
              }}
              disabled={!formik.dirty || !!initialData}
              size="small"
              sx={{ minHeight: '36px', fontSize: '0.75rem' }}
            >
              Guardar Borrador
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: { xs: 13, sm: 8 } }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default React.memo(ActivityForm);