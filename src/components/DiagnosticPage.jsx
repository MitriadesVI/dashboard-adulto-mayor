// Crea un nuevo archivo llamado src/components/DiagnosticPage.jsx

import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Box, Paper, Typography, CircularProgress, Button, List, ListItem, Divider } from '@mui/material';

const DiagnosticPage = () => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState(null);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Cargar usuarios
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
      
      // Cargar todas las actividades sin filtrar
      const activitiesSnapshot = await getDocs(collection(db, 'activities'));
      const activitiesData = activitiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setActivities(activitiesData);
      
      console.log("Diagnóstico - Usuarios:", usersData.length);
      console.log("Diagnóstico - Actividades:", activitiesData.length);
      
    } catch (err) {
      console.error("Error en diagnóstico:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Página de Diagnóstico</Typography>
      
      <Button 
        variant="contained" 
        onClick={loadAllData} 
        disabled={loading}
        sx={{ mb: 3 }}
      >
        Cargar todos los datos
      </Button>
      
      {loading && <CircularProgress sx={{ display: 'block', mx: 'auto', my: 2 }} />}
      
      {error && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'error.light', color: 'error.contrastText' }}>
          <Typography>Error: {error}</Typography>
        </Paper>
      )}
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">Resumen:</Typography>
        <Typography>Total de usuarios: {users.length}</Typography>
        <Typography>Total de actividades: {activities.length}</Typography>
        <Typography>Actividades aprobadas: {activities.filter(a => a.status === 'approved').length}</Typography>
        <Typography>Actividades pendientes: {activities.filter(a => a.status === 'pending').length}</Typography>
        <Typography>Actividades rechazadas: {activities.filter(a => a.status === 'rejected').length}</Typography>
      </Paper>
      
      {activities.length > 0 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Últimas 5 actividades:</Typography>
          <List>
            {activities.slice(0, 5).map((activity, index) => (
              <React.Fragment key={activity.id}>
                <ListItem>
                  <Box>
                    <Typography variant="subtitle1">
                      {activity.type} - {activity.subtype} ({activity.status})
                    </Typography>
                    <Typography variant="body2">
                      Contratista: {activity.contractor} | 
                      Fecha: {activity.date} | 
                      Beneficiarios: {activity.beneficiarios || activity.beneficiaries}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ID: {activity.id}
                    </Typography>
                  </Box>
                </ListItem>
                {index < 4 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default DiagnosticPage;