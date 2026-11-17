// src/components/dashboard/overview/DashboardSummary.jsx

import React from 'react';
import { Paper, Typography, Button } from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import { calculateUniqueAttendance } from '../common/helpers';

const DashboardSummary = ({ activities, filteredActivities, onExportCSV }) => {
  // Total de beneficiarios sin doble conteo (el mismo valor que muestra el KPI del Dashboard)
  const getTotalBeneficiaries = () => calculateUniqueAttendance(filteredActivities);

  return (
    <Paper sx={{ p: 2, mb: 3, bgcolor: 'info.light', color: 'info.contrastText' }}>
      <Typography variant="subtitle2" gutterBottom>Información de depuración:</Typography>
      <Typography variant="body2">
        Activities recibidas: {activities ? activities.length : 'ninguna'}<br />
        Activities filtradas: {filteredActivities ? filteredActivities.length : '0'}<br />
        Total beneficiarios (únicos): {getTotalBeneficiaries()}<br />
        <Button 
          size="small" 
          variant="contained" 
          color="inherit" 
          startIcon={<CloudDownloadIcon />} 
          onClick={onExportCSV}
          disabled={!filteredActivities?.length}
          sx={{ mt: 1 }}
        >
          Exportar CSV
        </Button>
      </Typography>
    </Paper>
  );
};

export default DashboardSummary;