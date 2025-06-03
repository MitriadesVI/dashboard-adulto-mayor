// src/components/field/stats/FieldStrategiesTable.jsx
import React from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Chip,
  useTheme
} from '@mui/material';
import {
  getActivityTypeLabel,
  getActivitySubtypeLabel
} from '../../dashboard/common/helpers';

const FieldStrategiesTable = ({ strategiesData, userContractor }) => {
  const theme = useTheme();

  if (!strategiesData || strategiesData.length === 0) {
    return (
      <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          📊 Mis Estrategias Ejecutadas
        </Typography>
        <Typography color="text.secondary">
          Aún no has registrado actividades educativas en este período.
        </Typography>
      </Paper>
    );
  }

  // Colores por componente para las estrategias
  const getComponentColor = (componentType) => {
    switch (componentType) {
      case 'nutrition': return theme.palette.success.main;
      case 'physical': return theme.palette.info.main; 
      case 'psychosocial': return theme.palette.warning.main;
      default: return theme.palette.grey[500];
    }
  };

  const getComponentChip = (componentType) => {
    const componentLabel = getActivityTypeLabel(componentType, userContractor);
    const color = getComponentColor(componentType);
    
    return (
      <Chip 
        size="small" 
        label={componentLabel}
        sx={{ 
          backgroundColor: color,
          color: 'white',
          fontWeight: 'bold',
          fontSize: '0.7rem'
        }}
      />
    );
  };

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', mb: 2, color: theme.palette.primary.main }}>
        📊 Mis Estrategias Ejecutadas
      </Typography>
      
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Estrategia</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="center">Componente</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="center">Cantidad</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {strategiesData.map((strategy, index) => (
              <TableRow 
                key={index}
                sx={{ 
                  '&:last-child td, &:last-child th': { border: 0 },
                  '&:hover': { 
                    backgroundColor: theme.palette.action.hover 
                  }
                }}
              >
                <TableCell component="th" scope="row">
                  <Typography variant="body2" fontWeight="medium">
                    {strategy.strategyName}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  {getComponentChip(strategy.componentType)}
                </TableCell>
                <TableCell align="center">
                  <Chip 
                    label={strategy.count}
                    color="primary"
                    variant="outlined"
                    size="small"
                    sx={{ fontWeight: 'bold' }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Total de actividades educativas: {strategiesData.reduce((sum, strategy) => sum + strategy.count, 0)}
        </Typography>
      </Box>
    </Paper>
  );
};

export default FieldStrategiesTable;