import { 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs, 
    query, 
    where,
    serverTimestamp
  } from 'firebase/firestore';
  import { db } from '../firebase/config';
  
  const goalsService = {
    // Establecer metas para un contratista y año
    setGoals: async (contractor, year, goalsData) => {
      try {
        const goalId = `${contractor}_${year}`;
        
        await setDoc(doc(db, 'goals', goalId), {
          contractor,
          year,
          activities: {
            nutrition: {
              workshops: goalsData.nutrition.workshops || 0,
              rations: goalsData.nutrition.rations || 0
            },
            physical: {
              preventionTalks: goalsData.physical.preventionTalks || 0,
              therapeuticActivity: goalsData.physical.therapeuticActivity || 0,
              rumbaTherapy: goalsData.physical.rumbaTherapy || 0,
              walkingClub: goalsData.physical.walkingClub || 0
            },
            psychosocial: {
              mentalHealth: goalsData.psychosocial.mentalHealth || 0,
              cognitive: goalsData.psychosocial.cognitive || 0,
              abusePreventionWorkshops: goalsData.psychosocial.abusePreventionWorkshops || 0,
              artsAndCrafts: goalsData.psychosocial.artsAndCrafts || 0,
              intergenerational: goalsData.psychosocial.intergenerational || 0
            }
          },
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        }, { merge: true });
        
        return true;
      } catch (error) {
        console.error('Error al establecer metas:', error);
        throw error;
      }
    },
    
    // Obtener metas para un contratista y año
    getGoals: async (contractor, year) => {
      try {
        const goalId = `${contractor}_${year}`;
        const goalDoc = await getDoc(doc(db, 'goals', goalId));
        
        if (goalDoc.exists()) {
          return {
            id: goalDoc.id,
            ...goalDoc.data()
          };
        } else {
          // Devolver estructura vacía si no hay metas
          return {
            contractor,
            year,
            activities: {
              nutrition: {
                workshops: 0,
                rations: 0
              },
              physical: {
                preventionTalks: 0,
                therapeuticActivity: 0,
                rumbaTherapy: 0,
                walkingClub: 0
              },
              psychosocial: {
                mentalHealth: 0,
                cognitive: 0,
                abusePreventionWorkshops: 0,
                artsAndCrafts: 0,
                intergenerational: 0
              }
            }
          };
        }
      } catch (error) {
        console.error('Error al obtener metas:', error);
        throw error;
      }
    },
    
    // Obtener todas las metas para mostrar en el panel de administración
    getAllGoals: async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'goals'));
        const goals = [];
        
        querySnapshot.forEach((doc) => {
          goals.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        return goals;
      } catch (error) {
        console.error('Error al obtener todas las metas:', error);
        throw error;
      }
    },
    
    // Calcular el progreso hacia las metas
    calculateProgress: async (contractor, year, activities) => {
      try {
        // Obtener las metas
        const goals = await goalsService.getGoals(contractor, year);
        
        // Inicializar contadores
        const counts = {
          nutrition: {
            workshops: 0,
            rations: 0
          },
          physical: {
            preventionTalks: 0,
            therapeuticActivity: 0,
            rumbaTherapy: 0,
            walkingClub: 0
          },
          psychosocial: {
            mentalHealth: 0,
            cognitive: 0,
            abusePreventionWorkshops: 0,
            artsAndCrafts: 0,
            intergenerational: 0
          }
        };
        
        // Contar actividades por tipo y subtipo
        activities.forEach(activity => {
          if (activity.type === 'nutrition') {
            if (activity.subtype === 'workshop') {
              counts.nutrition.workshops += 1;
            } else if (activity.subtype === 'ration') {
              counts.nutrition.rations += 1;
            }
          } else if (activity.type === 'physical') {
            if (activity.subtype === 'prevention') {
              counts.physical.preventionTalks += 1;
            } else if (activity.subtype === 'therapeutic') {
              counts.physical.therapeuticActivity += 1;
            } else if (activity.subtype === 'rumba') {
              counts.physical.rumbaTherapy += 1;
            } else if (activity.subtype === 'walking') {
              counts.physical.walkingClub += 1;
            }
          } else if (activity.type === 'psychosocial') {
            if (activity.subtype === 'mental') {
              counts.psychosocial.mentalHealth += 1;
            } else if (activity.subtype === 'cognitive') {
              counts.psychosocial.cognitive += 1;
            } else if (activity.subtype === 'abuse') {
              counts.psychosocial.abusePreventionWorkshops += 1;
            } else if (activity.subtype === 'arts') {
              counts.psychosocial.artsAndCrafts += 1;
            } else if (activity.subtype === 'intergenerational') {
              counts.psychosocial.intergenerational += 1;
            }
          }
        });
        
        // Calcular porcentajes de avance
        const progress = {
          nutrition: {
            workshops: goals.activities.nutrition.workshops > 0 
              ? (counts.nutrition.workshops / goals.activities.nutrition.workshops) * 100 
              : 0,
            rations: goals.activities.nutrition.rations > 0 
              ? (counts.nutrition.rations / goals.activities.nutrition.rations) * 100 
              : 0
          },
          physical: {
            preventionTalks: goals.activities.physical.preventionTalks > 0 
              ? (counts.physical.preventionTalks / goals.activities.physical.preventionTalks) * 100 
              : 0,
            therapeuticActivity: goals.activities.physical.therapeuticActivity > 0 
              ? (counts.physical.therapeuticActivity / goals.activities.physical.therapeuticActivity) * 100 
              : 0,
            rumbaTherapy: goals.activities.physical.rumbaTherapy > 0 
              ? (counts.physical.rumbaTherapy / goals.activities.physical.rumbaTherapy) * 100 
              : 0,
            walkingClub: goals.activities.physical.walkingClub > 0 
              ? (counts.physical.walkingClub / goals.activities.physical.walkingClub) * 100 
              : 0
          },
          psychosocial: {
            mentalHealth: goals.activities.psychosocial.mentalHealth > 0 
              ? (counts.psychosocial.mentalHealth / goals.activities.psychosocial.mentalHealth) * 100 
              : 0,
            cognitive: goals.activities.psychosocial.cognitive > 0 
              ? (counts.psychosocial.cognitive / goals.activities.psychosocial.cognitive) * 100 
              : 0,
            abusePreventionWorkshops: goals.activities.psychosocial.abusePreventionWorkshops > 0 
              ? (counts.psychosocial.abusePreventionWorkshops / goals.activities.psychosocial.abusePreventionWorkshops) * 100 
              : 0,
            artsAndCrafts: goals.activities.psychosocial.artsAndCrafts > 0 
              ? (counts.psychosocial.artsAndCrafts / goals.activities.psychosocial.artsAndCrafts) * 100 
              : 0,
            intergenerational: goals.activities.psychosocial.intergenerational > 0 
              ? (counts.psychosocial.intergenerational / goals.activities.psychosocial.intergenerational) * 100 
              : 0
          }
        };
        
        // Calcular promedios generales por tipo
        const averages = {
          nutrition: (progress.nutrition.workshops + progress.nutrition.rations) / 2,
          physical: (
            progress.physical.preventionTalks + 
            progress.physical.therapeuticActivity + 
            progress.physical.rumbaTherapy + 
            progress.physical.walkingClub
          ) / 4,
          psychosocial: (
            progress.psychosocial.mentalHealth + 
            progress.psychosocial.cognitive + 
            progress.psychosocial.abusePreventionWorkshops + 
            progress.psychosocial.artsAndCrafts + 
            progress.psychosocial.intergenerational
          ) / 5
        };
        
        return {
          counts,
          goals: goals.activities,
          progress,
          averages
        };
      } catch (error) {
        console.error('Error al calcular progreso:', error);
        throw error;
      }
    }
  };
  
  export default goalsService;