// src/components/activities/ActivityDescription.jsx - VERSIÓN CORREGIDA PARA EVITAR LOOPS
import React, { useState, useRef } from 'react';
import { 
  Typography, 
  Card, 
  CardContent,
  Box
} from '@mui/material';

const ActivityDescription = ({ 
  value, 
  onChange, 
  onBlur, 
  error, 
  helperText, 
  name,
  includeEducational = false,
  includeNutrition = false 
}) => {
  // ========== SOLUCIÓN: Estado local SIN useEffect problemático ==========
  const [description, setDescription] = useState(value || '');
  const timeoutRef = useRef(null);

  // ========== HANDLER OPTIMIZADO SIN LOOPS ==========
  const handleChange = (e) => {
    const newValue = e.target.value;
    setDescription(newValue);
    
    // Debounce para evitar demasiadas llamadas
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      // Crear evento sintético para Formik
      const syntheticEvent = {
        target: {
          name: name,
          value: newValue
        }
      };
      
      // Llamar onChange del padre
      if (onChange) {
        onChange(syntheticEvent);
      }
    }, 150); // Pequeño delay para evitar spam
  };

  const handleBlur = (e) => {
    // Asegurar sincronización final en blur
    const finalValue = e.target.value;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Sincronizar inmediatamente en blur
    const syntheticEvent = {
      target: {
        name: name,
        value: finalValue
      }
    };
    
    if (onChange) {
      onChange(syntheticEvent);
    }
    
    if (onBlur) {
      onBlur(syntheticEvent);
    }
  };

  // Determinar título y placeholder según contexto
  const getTitle = () => {
    if (includeEducational && includeNutrition) {
      return "Descripción de la Actividad y Observaciones";
    } else if (includeEducational) {
      return "Descripción de la Actividad Educativa";
    } else if (includeNutrition) {
      return "Observaciones de la Entrega de Alimentos";
    } else {
      return "Descripción y Observaciones";
    }
  };

  const getPlaceholder = () => {
    if (includeEducational && includeNutrition) {
      return "Describe detalladamente la actividad educativa realizada y cualquier observación sobre la entrega de alimentos...";
    } else if (includeEducational) {
      return "Describe detalladamente la actividad educativa realizada: objetivos, metodología, participación, resultados...";
    } else if (includeNutrition) {
      return "Registra observaciones sobre la entrega de alimentos: proceso, participación, incidencias, comentarios...";
    } else {
      return "Registra cualquier observación o detalle relevante de la actividad...";
    }
  };

  const getHelperText = () => {
    if (error) return helperText;
    
    if (includeEducational && includeNutrition) {
      return "Incluye detalles de la actividad educativa y observaciones sobre la entrega de alimentos";
    } else if (includeEducational) {
      return "Mínimo 20 caracteres. Describe objetivos, desarrollo y resultados de la actividad";
    } else if (includeNutrition) {
      return "Opcional. Registra cualquier observación relevante sobre la entrega de alimentos";
    } else {
      return "Registra observaciones generales sobre lo realizado";
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 2 }}>
          {getTitle()}
        </Typography>
        
        {/* TEXTAREA NATIVO - OPTIMIZADO PARA EVITAR RE-RENDERS */}
        <textarea
          id={name}
          name={name}
          value={description}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={getPlaceholder()}
          rows={5}
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '12px',
            border: error ? '2px solid #d32f2f' : '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '1rem',
            fontFamily: 'inherit',
            resize: 'vertical',
            outline: 'none',
            transition: 'border-color 0.2s',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => {
            if (!error) {
              e.target.style.borderColor = '#1976d2';
            }
          }}
          onBlurCapture={(e) => {
            if (!error) {
              e.target.style.borderColor = '#ccc';
            }
          }}
        />

        {/* Helper text y contador */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
          <Typography 
            variant="caption" 
            color={error ? 'error' : 'text.secondary'}
            sx={{ fontSize: '0.75rem' }}
          >
            {getHelperText()}
          </Typography>
          <Typography 
            variant="caption" 
            color={description.length < 20 && includeEducational ? 'error' : 'text.secondary'}
            sx={{ fontSize: '0.75rem' }}
          >
            {description.length} caracteres
            {includeEducational && ` (mínimo 20)`}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ActivityDescription;