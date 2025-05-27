// src/components/dashboard/overview/NutritionStats.jsx
import React from 'react';
import { Card, CardContent, CardHeader, Typography, Grid, Box, LinearProgress, Divider } from '@mui/material';
import { 
  getNutritionCountByLocationType, 
  getAverageRationsByLocationType,
  getNutritionStatsByLocation,
  getNutritionStats
} from '../common/helpers';

const NutritionStats = ({ activities, title = "Distribución de Beneficios Nutricionales" }) => {
  // Obtener estadísticas
  const counts = getNutritionCountByLocationType(activities);
  const averages = getAverageRationsByLocationType(activities);
  const topLocations = getNutritionStatsByLocation(activities).slice(0, 5); // Top 5 ubicaciones
  const nutritionStats = getNutritionStats(activities);
  
  // Calcular porcentajes para la visualización
  const centerPercentage = counts.total > 0 ? (counts.centers / counts.total) * 100 : 0;
  const parkPercentage = counts.total > 0 ? (counts.parks / counts.total) * 100 : 0;
  
  // Obtener contadores específicos
  const workshopCount = nutritionStats.workshops;
  const rationDeliveryCount = nutritionStats.rationCount;
  
  return (
    <Card>
      <CardHeader 
        title={title} 
        subheader="Las entregas de raciones/meriendas se cuentan como beneficios, no como actividades" 
      />
      <CardContent>
        <Grid container spacing={3}>
          {/* Columna izquierda: Totales de Beneficios */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom>Total Beneficios Alimentarios</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle1">Raciones (Centros):</Typography>
                <Typography variant="h4" color="primary">{counts.centers.toLocaleString()}</Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={centerPercentage} 
                  color="primary"
                  sx={{ height: 10, borderRadius: 5, my: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {Math.round(centerPercentage)}% del total de beneficios
                </Typography>
              </Box>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1">Meriendas (Parques):</Typography>
                <Typography variant="h4" color="secondary">{counts.parks.toLocaleString()}</Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={parkPercentage} 
                  color="secondary"
                  sx={{ height: 10, borderRadius: 5, my: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {Math.round(parkPercentage)}% del total de beneficios
                </Typography>
              </Box>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1">Total beneficios:</Typography>
                <Typography variant="h4" color="text.primary">{counts.total.toLocaleString()}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Suma de todas las raciones y meriendas
                </Typography>
              </Box>
            </Box>
          </Grid>
          
          {/* Columna central: Promedios y Conteos */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom>Análisis de Entregas</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="subtitle1">Promedio raciones/entrega (Centros):</Typography>
                <Typography variant="h4" color="primary">{averages.centers.toLocaleString()}</Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle1">Promedio meriendas/entrega (Parques):</Typography>
                <Typography variant="h4" color="secondary">{averages.parks.toLocaleString()}</Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              {/* Distinción clara entre actividades y entregas */}
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">Total de entregas realizadas:</Typography>
                <Typography variant="h4" color="text.secondary">{rationDeliveryCount}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Entregas de alimentos (no contadas como actividades)
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">Total de actividades educativas:</Typography>
                <Typography variant="h4" color="success.main">{workshopCount}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Talleres nutritivos (actividades reales)
                </Typography>
              </Box>
            </Box>
          </Grid>
          
          {/* Columna derecha: Top Ubicaciones */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom>Top Ubicaciones por Beneficios</Typography>
            {topLocations.length > 0 ? (
              topLocations.map((location, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">{location.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {location.type === 'center' ? 'Centro de Vida' : 'Parque/Espacio'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={100} 
                        color={location.type === 'center' ? 'primary' : 'secondary'}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                    <Typography variant="body2" fontWeight="bold">
                      {location.total.toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No hay datos disponibles
              </Typography>
            )}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default NutritionStats;