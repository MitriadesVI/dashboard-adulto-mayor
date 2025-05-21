// src/components/dashboard/overview/DashboardSummary.jsx

import React from 'react';
import { Paper, Typography, Button, Box } from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';

const DashboardSummary = ({ activities, filteredActivities, onExportCSV }) => {
  // Función para calcular total de beneficiarios
  const getTotalBeneficiaries = () => 
    filteredActivities.reduce((sum, activity) => 
      sum + (Number(activity?.beneficiaries) || 0), 0);

  return (
    <Paper sx={{ p: 2, mb: 3, bgcolor: 'info.light', color: 'info.contrastText' }}>
      <Typography variant="subtitle2" gutterBottom>Información de depuración:</Typography>
      <Typography variant="body2">
        Activities recibidas: {activities ? activities.length : 'ninguna'}<br />
        Activities filtradas: {filteredActivities ? filteredActivities.length : '0'}<br />
        Total beneficiarios: {getTotalBeneficiaries()}<br />
        <Button 
          size="small" 
          variant="contained" 
          color="inherit" 
          startIcon={<CloudDownloadIcon />} 
          onClick={onExportCSV}
          disabled={!filteredActivities.length}
          sx={{ mt: 1 }}
        >
          Exportar CSV
        </Button>
      </Typography>
    </Paper>
  );
};

export default DashboardSummary;