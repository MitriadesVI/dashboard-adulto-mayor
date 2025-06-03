// src/components/field/gamification/FieldInsights.jsx
import React from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
} from '@mui/material';
import LightbulbIcon from '@mui/icons-material/Lightbulb'; // Icono para insights
import LocationCityIcon from '@mui/icons-material/LocationCity';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import StarRateIcon from '@mui/icons-material/StarRate';

const InsightIcon = ({ title }) => {
  if (title.includes('Ubicación Estrella')) return <LocationCityIcon color="primary" />;
  if (title.includes('Día Clave')) return <CalendarTodayIcon color="secondary" />;
  if (title.includes('Alto Impacto')) return <StarRateIcon sx={{ color: 'warning.main' }} />;
  if (title.includes('Tendencia')) return <TrendingUpIcon color="success" />;
  return <LightbulbIcon color="disabled" />; // Default
};

const FieldInsights = ({ insights }) => {
  const theme = useTheme();

  if (!insights || insights.length === 0) {
    return (
      <Paper elevation={3} sx={{ p: 3, textAlign: 'center', mt: 2 }}>
        <Typography variant="h6" gutterBottom>💡 Mis Estadísticas Clave 💡</Typography>
        <Typography color="text.secondary">
          A medida que registres más actividades, aquí aparecerán análisis y tendencias personalizadas sobre tu desempeño.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', mb: 2, color: theme.palette.primary.main }}>
        💡 Mis Estadísticas Clave 💡
      </Typography>
      <List>
        {insights.map((insight, index) => (
          <React.Fragment key={index}>
            <ListItem alignItems="flex-start">
              <ListItemIcon sx={{ mt: 0.5 }}>
                <InsightIcon title={insight.title} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="subtitle1" component="div" fontWeight="bold" sx={{ color: theme.palette.text.primary }}>
                    {insight.title}
                  </Typography>
                }
                secondary={
                  <Typography variant="body2" color="text.secondary">
                    {insight.description}
                  </Typography>
                }
              />
            </ListItem>
            {index < insights.length - 1 && <Divider variant="inset" component="li" />}
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
};

export default FieldInsights;