// src/components/field/gamification/FieldAchievements.jsx
import React from 'react';
import {
  Grid,
  Paper,
  Typography,
  Tooltip as MuiTooltip, // Renombrar para evitar conflicto con Recharts si se usa
  Chip,
  useTheme
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'; // Icono genérico para logros
import StarIcon from '@mui/icons-material/Star'; // Para mejor promedio o especialista
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'; // Para componente físico
import LocalDiningIcon from '@mui/icons-material/LocalDining'; // Para componente nutrición
import PsychologyIcon from '@mui/icons-material/Psychology'; // Para componente psicosocial
import TrendingUpIcon from '@mui/icons-material/TrendingUp'; // Para más productivo
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'; // Icono genérico medalla

const AchievementIcon = ({ title }) => {
  if (title.includes('Más Productivo')) return <TrendingUpIcon color="primary" sx={{ fontSize: 30 }} />;
  if (title.includes('Mejor Promedio')) return <StarIcon color="secondary" sx={{ fontSize: 30 }} />;
  if (title.includes('Nutricional') || title.includes('Nutrición')) return <LocalDiningIcon color="success" sx={{ fontSize: 30 }} />;
  if (title.includes('Física') || title.includes('Physical')) return <FitnessCenterIcon sx={{ color: 'info.main', fontSize: 30 }} />;
  if (title.includes('Psicosocial')) return <PsychologyIcon sx={{ color: 'warning.main', fontSize: 30 }} />;
  if (title.includes('Especialista')) return <WorkspacePremiumIcon color="primary" sx={{ fontSize: 30 }}/>;
  return <EmojiEventsIcon color="disabled" sx={{ fontSize: 30 }} />; // Default
};


const FieldAchievements = ({ achievements, activeStreak }) => {
  const theme = useTheme();

  const hasAchievements = achievements && achievements.length > 0;
  const hasStreak = activeStreak !== undefined && activeStreak > 0;

  if (!hasAchievements && !hasStreak) {
    return (
      <Paper elevation={3} sx={{ p: 3, textAlign: 'center', mt: 2 }}>
        <Typography variant="h6" gutterBottom>🏆 Logros y Rachas 🏆</Typography>
        <Typography color="text.secondary">
          Aún no has desbloqueado logros. ¡Sigue registrando actividades para ganar medallas y mantener tu racha!
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', mb: 2, color: theme.palette.primary.main }}>
        🏆 Mis Trofeos y Rachas 🏆
      </Typography>
      <Grid container spacing={2}>
        {hasStreak && (
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', backgroundColor: theme.palette.success.lightest }}>
               <Typography variant="h5" component="div" sx={{ color: theme.palette.success.dark, fontWeight: 'bold' }}>
                🔥 ¡{activeStreak} DÍA{activeStreak > 1 ? 'S' : ''} DE RACHA ACTIVA! 🔥
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.success.main }}>
                ¡Sigue así registrando actividades educativas consecutivamente!
              </Typography>
            </Paper>
          </Grid>
        )}

        {hasAchievements && achievements.map((achievement, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <MuiTooltip title={`${achievement.description} (Valor: ${achievement.value})`} placement="top" arrow>
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 2, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  textAlign: 'center', 
                  height: '100%',
                  borderColor: theme.palette.secondary.light,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: theme.shadows[6]
                  }
                }}
              >
                <AchievementIcon title={achievement.title} />
                <Typography variant="subtitle1" component="div" fontWeight="bold" sx={{ mt: 1, color: theme.palette.text.primary }}>
                  {achievement.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{display: {xs: 'none', sm: 'block'}}}> 
                  {achievement.description}
                </Typography>
                <Chip 
                    label={`Valor: ${achievement.value}`} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                    sx={{ mt: 1, display: {xs: 'block', sm: 'none'}}} // Mostrar solo en móviles
                />
              </Paper>
            </MuiTooltip>
          </Grid>
        ))}
      </Grid>
      {!hasAchievements && hasStreak && (
         <Typography color="text.secondary" sx={{textAlign: 'center', mt: 2}}>
          ¡Mantén tu racha! Pronto desbloquearás más medallas.
        </Typography>
      )}
    </Paper>
  );
};

export default FieldAchievements;