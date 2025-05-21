// src/components/dashboard/common/NoDataMessage.jsx

import React from 'react';
import { Paper, Typography, Button, Box } from '@mui/material';

const NoDataMessage = ({ 
  message = "No hay datos para mostrar con los filtros actuales.",
  debugInfo = null,
  onResetFilters = null,
  onRefreshData = null
}) => {
  return (
    <Paper sx={{ p: 3, textAlign: 'center' }}>
      <Typography variant="h6">{message}</Typography>
      
      {debugInfo && (
        <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1, textAlign: 'left' }}>
          <Typography variant="subtitle2" gutterBottom>Información de depuración:</Typography>
          <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
            {typeof debugInfo === 'string' ? debugInfo : JSON.stringify(debugInfo, null, 2)}
          </Typography>
        </Box>
      )}
      
      {(onResetFilters || onRefreshData) && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
          {onResetFilters && (
            <Button 
              variant="contained" 
              color="secondary"
              onClick={onResetFilters}
            >
              Recargar sin filtros
            </Button>
          )}
          
          {onRefreshData && (
            <Button 
              variant="contained" 
              color="primary"
              onClick={onRefreshData}
            >
              Recargar con filtros actuales
            </Button>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default NoDataMessage;