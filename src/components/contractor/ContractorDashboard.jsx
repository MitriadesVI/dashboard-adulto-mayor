// src/components/contractor/ContractorDashboard.jsx

import React, { useState, useEffect } from 'react';
import {
 Container, Grid, Paper, Typography, Box,
 CircularProgress, Tab, Tabs, Button,
 FormControl, InputLabel, Select, MenuItem,
 TextField
} from '@mui/material';

import activitiesService from '../../services/activitiesService';
import goalsService from '../../services/goalsService';

// IMPORTAR COMPONENTES MODULARES
import OverviewTab from './dashboard/OverviewTab';
import ActivitiesTab from './dashboard/ActivitiesTab';
import UsersReportTab from './dashboard/UsersReportTab';

const ContractorDashboard = ({ user }) => {
 const [tabValue, setTabValue] = useState(0);
 const [activities, setActivities] = useState([]);
 const [filteredActivities, setFilteredActivities] = useState([]);
 const [goals, setGoals] = useState(null);
 const [loading, setLoading] = useState(true);
 const [filterType, setFilterType] = useState('all');
 const [filterDateStart, setFilterDateStart] = useState('');
 const [filterDateEnd, setFilterDateEnd] = useState('');
 const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
 
 useEffect(() => {
   loadData();
 }, [user]);
 
 useEffect(() => {
   applyFilters();
 }, [activities, filterType, filterDateStart, filterDateEnd]);
 
 const loadData = async () => {
   setLoading(true);
   try {
     const allActivities = await activitiesService.getAllActivities();
     const contractorActivities = allActivities
       .filter(a => a && a.contractor === user.contractor && a.status === 'approved');
     
     setActivities(contractorActivities);
     
     try {
       const goalsData = await goalsService.calculateProgress(
         user.contractor, 
         currentYear, 
         contractorActivities
       );
       setGoals(goalsData);
     } catch (error) {
       console.error("Error cargando metas:", error);
     }
     
   } catch (error) {
     console.error("Error cargando datos:", error);
   } finally {
     setLoading(false);
   }
 };
 
 const applyFilters = () => {
   if (!activities || !Array.isArray(activities)) {
     setFilteredActivities([]);
     return;
   }
   
   let filtered = [...activities];
   
   if (filterType !== 'all') {
     filtered = filtered.filter(a => {
       if (a.educationalActivity?.included) {
         return a.educationalActivity.type === filterType;
       }
       return false;
     });
   }
   
   if (filterDateStart) {
     const startDate = new Date(filterDateStart);
     startDate.setHours(0,0,0,0);
     filtered = filtered.filter(a => {
       if (!a.date) return false;
       const activityDate = new Date(a.date);
       return activityDate >= startDate;
     });
   }
   
   if (filterDateEnd) {
     const endDate = new Date(filterDateEnd);
     endDate.setHours(23,59,59,999);
     filtered = filtered.filter(a => {
       if (!a.date) return false;
       const activityDate = new Date(a.date);
       return activityDate <= endDate;
     });
   }
   
   setFilteredActivities(filtered);
 };
 
 const handleRefresh = () => {
   loadData();
 };
 
 const handleTabChange = (event, newValue) => {
   setTabValue(newValue);
 };
 
 if (loading) {
   return (
     <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
       <CircularProgress />
     </Box>
   );
 }
 
 return (
   <Container maxWidth="lg">
     <Box sx={{ py: 4 }}>
       <Typography variant="h4" component="h1" gutterBottom>
         Dashboard de {user.contractor}
       </Typography>
       
       {/* FILTROS COMPARTIDOS */}
       <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
         <Grid container spacing={2} alignItems="center">
           <Grid item xs={12} md={3}>
             <FormControl fullWidth size="small">
               <InputLabel>Tipo de Actividad</InputLabel>
               <Select
                 value={filterType}
                 onChange={(e) => setFilterType(e.target.value)}
                 label="Tipo de Actividad"
               >
                 <MenuItem value="all">Todos</MenuItem>
                 <MenuItem value="nutrition">Nutricional</MenuItem>
                 <MenuItem value="physical">Salud Física</MenuItem>
                 <MenuItem value="psychosocial">Psicosocial</MenuItem>
               </Select>
             </FormControl>
           </Grid>
           
           <Grid item xs={12} md={3}>
             <TextField
               fullWidth
               size="small"
               label="Desde"
               type="date"
               value={filterDateStart}
               onChange={(e) => setFilterDateStart(e.target.value)}
               InputLabelProps={{ shrink: true }}
             />
           </Grid>
           
           <Grid item xs={12} md={3}>
             <TextField
               fullWidth
               size="small"
               label="Hasta"
               type="date"
               value={filterDateEnd}
               onChange={(e) => setFilterDateEnd(e.target.value)}
               InputLabelProps={{ shrink: true }}
             />
           </Grid>
           
           <Grid item xs={12} md={3}>
             <Button 
               variant="contained" 
               fullWidth
               onClick={handleRefresh}
             >
               Actualizar
             </Button>
           </Grid>
         </Grid>
       </Paper>
       
       {/* PESTAÑAS */}
       <Tabs 
         value={tabValue} 
         onChange={handleTabChange}
         variant="fullWidth" 
         indicatorColor="primary"
         textColor="primary"
         sx={{ mb: 3 }}
       >
         <Tab label="Resumen" />
         <Tab label="Actividades" />
         <Tab label="Reporte de Usuarios" />
       </Tabs>
       
       {/* CONTENIDO DE PESTAÑAS */}
       {tabValue === 0 && (
         <OverviewTab 
           activities={filteredActivities}
           goals={goals}
           user={user}
         />
       )}
       
       {tabValue === 1 && (
         <ActivitiesTab 
           activities={filteredActivities}
           goals={goals}
           user={user}
         />
       )}
       
       {tabValue === 2 && (
         <UsersReportTab 
           activities={activities}
           user={user}
         />
       )}
     </Box>
   </Container>
 );
};

export default ContractorDashboard;