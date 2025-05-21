// src/components/dashboard/common/DashboardCard.jsx

import React from 'react';
import { Card, CardContent, CardHeader, Typography, Box } from '@mui/material';

const DashboardCard = ({ 
  title, 
  value, 
  subtitle,
  icon,
  color = 'primary',
  backgroundColor = 'white'
}) => {
  return (
    <Card sx={{ 
      backgroundColor,
      position: 'relative',
      overflow: 'hidden'
    }}>
      <CardHeader 
        title={title} 
        sx={{ 
          pb: 0,
          '& .MuiCardHeader-title': { 
            fontSize: '1rem', 
            fontWeight: 500,
            color: theme => theme.palette.text.secondary 
          }
        }} 
      />
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography 
            variant="h3" 
            component="div" 
            sx={{ 
              fontWeight: 'bold', 
              color: theme => theme.palette[color].main 
            }}
          >
            {value}
          </Typography>
          
          {icon && (
            <Box sx={{ 
              color: theme => theme.palette[color].light,
              opacity: 0.8
            }}>
              {icon}
            </Box>
          )}
        </Box>
        
        {subtitle && (
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ mt: 1 }}
          >
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardCard;