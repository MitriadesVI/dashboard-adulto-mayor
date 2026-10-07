// src/components/dashboard/alerts/AlertsPanel.jsx

import React, { useMemo } from 'react';
import {
  Card, CardHeader, CardContent, List, ListItem, 
  ListItemIcon, ListItemText, ListItemButton, Chip,
  Divider, Typography, Box, Alert as MuiAlert
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import PeopleIcon from '@mui/icons-material/People';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import {
  calculateUniqueAttendance,
  getActivityTypeLabel,
  getEducationalActivityCount
} from '../common/helpers';

const GOAL_COMPONENTS = ['nutrition', 'physical', 'psychosocial'];

// Genera las alertas a partir de los datos recibidos (se recalculan solo cuando cambian)
const buildAlerts = (activities, goals, contractor) => {
  const alerts = [];
  const now = new Date();
  const activityList = Array.isArray(activities) ? activities : [];

  // Baja actividad: solo actividades educativas (las entregas de alimentos no cuentan como actividades)
  const educationalCount = getEducationalActivityCount(activityList);
  if (educationalCount < 5) {
    alerts.push({
      id: 'low-activity',
      type: 'warning',
      message: 'Baja actividad detectada en el período seleccionado',
      details: `Solo ${educationalCount} actividades registradas`,
      timestamp: now,
      icon: <TrendingDownIcon />
    });
  }

  // Alertas basadas en metas si seleccionamos un contratista específico y tiene metas configuradas
  if (contractor && contractor !== 'all' && goals?.hasGoals) {
    GOAL_COMPONENTS.forEach(category => {
      // Solo componentes con al menos una estrategia con meta (el promedio ya excluye las que no tienen)
      const hasGoals = Object.values(goals.goals?.[category] || {}).some(value => value > 0);
      const average = goals.averages?.[category] || 0;

      if (hasGoals && average < 30) {
        alerts.push({
          id: `low-goal-${category}`,
          type: 'error',
          message: `Meta de ${getActivityTypeLabel(category, contractor)} muy por debajo del objetivo`,
          details: `${Math.round(average)}% de cumplimiento`,
          timestamp: now,
          icon: <WarningIcon />
        });
      }
    });
  }

  // Beneficiarios del período (sin doble conteo, igual que el KPI "Total Beneficiarios")
  const totalBeneficiaries = calculateUniqueAttendance(activityList);

  if (totalBeneficiaries < 100 && activityList.length > 0) {
    alerts.push({
      id: 'low-beneficiaries',
      type: 'info',
      message: 'Bajo número de beneficiarios en el período',
      details: `${totalBeneficiaries} beneficiarios registrados`,
      timestamp: now,
      icon: <PeopleIcon />
    });
  }

  return alerts;
};

const AlertsPanel = ({ 
  activities,
  goals,
  contractor = 'all'
}) => {
  const alerts = useMemo(
    () => buildAlerts(activities, goals, contractor),
    [activities, goals, contractor]
  );

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