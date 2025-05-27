import React from 'react';
import { Card, CardContent, CardHeader, Box, Alert, Typography, Chip } from '@mui/material';
import LightbulbIcon from '@mui/icons-material/Lightbulb';

const LocationInsightsPanel = ({ insights }) => (
  <Card sx={{ mb: 3 }}>
    <CardHeader
      title="Insights Automáticos"
      avatar={<LightbulbIcon />}
      subheader="Análisis inteligente de patrones detectados"
    />
    <CardContent>
      {insights.length === 0 ? (
        <Alert severity="info">
          No hay suficientes datos para generar insights automáticos. Seleccione un período más amplio.
        </Alert>
      ) : (
        <Box>
          {insights.slice(0, 8).map((insight, index) => (
            <Alert
              key={index}
              severity={insight.type}
              sx={{ mb: 1.5 }}
            >
              <Typography variant="body2">
                {insight.message}
              </Typography>
              {insight.priority === 'high' && (
                <Chip
                  label="Prioritario"
                  size="small"
                  color="error"
                  sx={{ mt: 0.5 }}
                />
              )}
            </Alert>
          ))}
          {insights.length > 8 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Mostrando los 8 insights más relevantes de {insights.length} detectados.
            </Typography>
          )}
        </Box>
      )}
    </CardContent>
  </Card>
);

export default LocationInsightsPanel;