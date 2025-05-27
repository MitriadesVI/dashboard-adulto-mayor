import React from 'react';
import { Card, CardContent, CardHeader, Box, Alert, Typography } from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';

const LocationWeaknessPanel = ({ weaknesses }) => (
  <Card sx={{ mb: 3 }}>
    <CardHeader
      title="Análisis de Debilidades"
      avatar={<WarningIcon />}
      subheader="Identificación de áreas de mejora"
    />
    <CardContent>
      {weaknesses.weaknesses.length === 0 ? (
        <Alert severity="success">
          No se detectaron debilidades significativas en esta ubicación.
        </Alert>
      ) : (
        <Box>
          {weaknesses.weaknesses.map((weakness, index) => (
            <Alert
              key={index}
              severity={weakness.severity === 'high' ? 'error' : 'warning'}
              sx={{ mb: 2 }}
            >
              <Typography variant="subtitle2" gutterBottom>
                {weakness.message}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Sugerencia:</strong> {weakness.suggestion}
              </Typography>
            </Alert>
          ))}
        </Box>
      )}
    </CardContent>
  </Card>
);

export default LocationWeaknessPanel;