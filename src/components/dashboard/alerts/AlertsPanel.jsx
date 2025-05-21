// src/components/dashboard/alerts/AlertsPanel.jsx

import React, { useState, useEffect } from 'react';
import {
  Card, CardHeader, CardContent, List, ListItem, 
  ListItemIcon, ListItemText, ListItemButton, Chip,
  Divider, Typography, Box, Alert as MuiAlert
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import PeopleIcon from '@mui/icons-material/People';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

// Este componente sería expandido para obtener datos de API en tiempo real
const AlertsPanel = ({ 
  activities,
  goals,
  contractor = 'all',
  refreshInterval = 300000 // 5 minutos
}) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simular carga inicial de alertas
    const loadAlerts = () => {
      setLoading(true);
      
      // Aquí implementarías la lógica real de alertas basada en tus datos
      setTimeout(() => {
        const generatedAlerts = [];
        
        // Alertas de ejemplo basadas en datos reales
        if (activities?.length < 5) {
          generatedAlerts.push({
            id: 'low-activity',
            type: 'warning',
            message: 'Baja actividad detectada en el período seleccionado',
            details: `Solo ${activities?.length || 0} actividades registradas`,
            timestamp: new Date(),
            icon: <TrendingDownIcon />
          });
        }
        
        // Alertas basadas en metas si seleccionamos un contratista específico
        if (contractor !== 'all' && goals) {
          // Revisar si alguna meta está muy por debajo
          const categories = ['nutrition', 'physical', 'psychosocial'];
          categories.forEach(category => {
            if (goals.averages[category] < 30) {
              generatedAlerts.push({
                id: `low-goal-${category}`,
                type: 'error',
                message: `Meta de ${category === 'nutrition' ? 'Nutrición' : 
                          category === 'physical' ? 'Actividad Física' : 'Psicosocial'} 
                          muy por debajo del objetivo`,
                details: `${Math.round(goals.averages[category])}% de cumplimiento`,
                timestamp: new Date(),
                icon: <WarningIcon />
              });
            }
          });
        }
        
        // Alerta de ejemplo para beneficiarios
        const totalBeneficiaries = activities?.reduce(
          (sum, activity) => sum + (Number(activity?.beneficiaries) || 0), 0
        ) || 0;
        
        if (totalBeneficiaries < 100 && activities?.length > 0) {
          generatedAlerts.push({
            id: 'low-beneficiaries',
            type: 'info',
            message: 'Bajo número de beneficiarios en el período',
            details: `${totalBeneficiaries} beneficiarios registrados`,
            timestamp: new Date(),
            icon: <PeopleIcon />
          });
        }
        
        setAlerts(generatedAlerts);
        setLoading(false);
      }, 1000);
    };
    
    loadAlerts();
    
    // Establecer intervalo para refrescar alertas
    const interval = setInterval(loadAlerts, refreshInterval);
    
    return () => clearInterval(interval);
  }, [activities, goals, contractor, refreshInterval]);

  if (loading) {
    return (
      <Card>
        <CardHeader title="Alertas en Tiempo Real" />
        <CardContent>
          <Typography align="center">Cargando alertas...</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader 
        title="Alertas en Tiempo Real" 
        subheader={`Última actualización: ${new Date().toLocaleTimeString()}`}
      />
      <CardContent>
        {alerts.length === 0 ? (
          <MuiAlert severity="success" sx={{ mb: 2 }}>
            No hay alertas activas en este momento.
          </MuiAlert>
        ) : (
          <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
            {alerts.map((alert, index) => (
              <React.Fragment key={alert.id}>
                <ListItem
                  secondaryAction={
                    <Chip 
                      label={alert.type === 'error' ? 'Alta' : 
                             alert.type === 'warning' ? 'Media' : 'Baja'} 
                      color={alert.type === 'error' ? 'error' : 
                             alert.type === 'warning' ? 'warning' : 'info'}
                      size="small"
                    />
                  }
                  disablePadding
                >
                  <ListItemButton>
                    <ListItemIcon sx={{ 
                      color: theme => 
                        alert.type === 'error' ? theme.palette.error.main : 
                        alert.type === 'warning' ? theme.palette.warning.main : 
                        theme.palette.info.main
                    }}>
                      {alert.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={alert.message}
                      secondary={
                        <Box component="span" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{alert.details}</span>
                          <Typography 
                            component="span" 
                            variant="body2" 
                            color="text.secondary"
                          >
                            {new Date(alert.timestamp).toLocaleTimeString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
                {index < alerts.length - 1 && <Divider variant="inset" component="li" />}
              </React.Fragment>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

export default AlertsPanel;