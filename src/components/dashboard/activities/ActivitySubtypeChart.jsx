// src/components/dashboard/activities/ActivitySubtypeChart.jsx

import React from 'react';
import { 
  Card, CardContent, CardHeader, Grid, Typography, Paper, Box 
} from '@mui/material';
import { getActivitySubtypeLabel, COLORS } from '../common/helpers';

const ActivitySubtypeChart = ({ activities, title = "Actividades por Subtipo" }) => {
  // Función MODIFICADA para usar la nueva estructura de datos
  const getActivityCountsBySubtype = () => {
    if (!activities || !activities.length) return [];
    
    const counts = {};
    
    activities.forEach(activity => {
      if (!activity) return;
      
      // Verificar actividades educativas
      if (activity.educationalActivity && activity.educationalActivity.included) {
        try {
          // Obtener subtipo de la actividad educativa
          const subtypeKey = activity.educationalActivity.subtype;
          const typeKey = activity.educationalActivity.type;
          
          if (subtypeKey && typeKey) {
            // Usar helper existente o crear etiqueta directamente
            const label = getActivitySubtypeLabel(typeKey, subtypeKey, activity.contractor) || 
                         `${typeKey} - ${subtypeKey}`;
                         
            counts[label] = (counts[label] || 0) + 1;
          }
        } catch (e) {
          console.warn("Error procesando actividad educativa:", e);
        }
      }
      
      // Verificar entregas nutricionales (opcional, ya que mencionaste que no deberían contarse)
      // Las incluyo en el código pero comentadas por si quieres habilitarlas después
      /*
      if (activity.nutritionDelivery && activity.nutritionDelivery.included) {
        try {
          const subtypeKey = activity.nutritionDelivery.type;
          
          if (subtypeKey) {
            const label = `Nutrición - ${subtypeKey}`;
            counts[label] = (counts[label] || 0) + 1;
          }
        } catch (e) {
          console.warn("Error procesando entrega nutricional:", e);
        }
      }
      */
    });
    
    console.log("Conteos por subtipo:", counts); // Debug
    
    return Object.entries(counts).map(([name, value], index) => ({ 
      name, 
      value,
      color: COLORS[index % COLORS.length]
    }));
  };

  const data = getActivityCountsBySubtype();
  console.log("Datos para mostrar en tarjetas:", data); // Debug

  return (
    <Card>
      <CardHeader 
        title={title} 
        subheader="No incluye entregas de raciones y meriendas" 
      />
      <CardContent>
        {data.length > 0 ? (
          <Grid container spacing={3}>
            {data.map((item, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                <Paper 
                  elevation={3} 
                  sx={{ 
                    p: 2, 
                    height: '100%',
                    borderTop: 4, 
                    borderColor: item.color,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    textAlign: 'center'
                  }}
                >
                  <Typography variant="h3" sx={{ mb: 1, fontWeight: 'bold' }}>
                    {item.value}
                  </Typography>
                  <Typography variant="subtitle1">
                    {item.name}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="subtitle1" color="text.secondary">
              No hay datos de actividades para mostrar
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivitySubtypeChart;