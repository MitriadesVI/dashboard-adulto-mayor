// src/services/goalsService.js - COMPLETAMENTE REESCRITO

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
            centerRations: goalsData.nutrition.centerRations || 0,
            parkSnacks: goalsData.nutrition.parkSnacks || 0
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
      
      console.log(`Metas guardadas para ${contractor} ${year}:`, goalsData);
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
        const data = goalDoc.data();
        console.log(`Metas encontradas para ${contractor} ${year}:`, data);
        return {
          id: goalDoc.id,
          ...data
        };
      } else {
        console.log(`No hay metas para ${contractor} ${year}, devolviendo estructura vacía`);
        // Devolver estructura vacía si no hay metas
        return {
          contractor,
          year,
          activities: {
            nutrition: {
              workshops: 0,
              centerRations: 0,
              parkSnacks: 0
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
      
      console.log(`Se encontraron ${goals.length} registros de metas`);
      return goals;
    } catch (error) {
      console.error('Error al obtener todas las metas:', error);
      throw error;
    }
  },
  
  // FUNCIÓN COMPLETAMENTE REESCRITA: Calcular el progreso hacia las metas
  calculateProgress: async (contractor, year, activities) => {
    try {
      console.log(`Calculando progreso para ${contractor} ${year} con ${activities.length} actividades`);
      
      // Obtener las metas
      const goals = await goalsService.getGoals(contractor, year);
      console.log('Metas obtenidas:', goals.activities);
      
      // Inicializar contadores usando NUEVO modelo de datos
      const counts = {
        nutrition: {
          workshops: 0,
          centerRations: 0,
          parkSnacks: 0
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
      
      // NUEVO: Contar actividades usando el modelo actual
      activities.forEach(activity => {
        if (!activity) return;
        
        // CONTAR ACTIVIDADES EDUCATIVAS
        if (activity.educationalActivity && activity.educationalActivity.included) {
          const type = activity.educationalActivity.type;
          const subtype = activity.educationalActivity.subtype;
          
          if (type === 'nutrition' && subtype === 'workshop') {
            counts.nutrition.workshops += 1;
          } else if (type === 'physical') {
            if (subtype === 'prevention') counts.physical.preventionTalks += 1;
            else if (subtype === 'therapeutic') counts.physical.therapeuticActivity += 1;
            else if (subtype === 'rumba') counts.physical.rumbaTherapy += 1;
            else if (subtype === 'walking') counts.physical.walkingClub += 1;
          } else if (type === 'psychosocial') {
            if (subtype === 'mental') counts.psychosocial.mentalHealth += 1;
            else if (subtype === 'cognitive') counts.psychosocial.cognitive += 1;
            else if (subtype === 'abuse') counts.psychosocial.abusePreventionWorkshops += 1;
            else if (subtype === 'arts') counts.psychosocial.artsAndCrafts += 1;
            else if (subtype === 'intergenerational') counts.psychosocial.intergenerational += 1;
          }
        }
        
        // CONTAR ENTREGAS NUTRICIONALES (por beneficiarios)
        if (activity.nutritionDelivery && activity.nutritionDelivery.included) {
          const beneficiaries = Number(activity.totalBeneficiaries) || 0;
          
          // Determinar tipo de ubicación
          const locationType = activity.location?.type?.toLowerCase() || '';
          
          if (locationType.includes('center') || locationType.includes('centro')) {
            counts.nutrition.centerRations += beneficiaries;
          } else if (locationType.includes('park') || locationType.includes('parque')) {
            counts.nutrition.parkSnacks += beneficiaries;
          }
        }
      });
      
      console.log('Conteos calculados:', counts);
      
      // Calcular porcentajes de avance
      const progress = {
        nutrition: {
          workshops: goals.activities.nutrition.workshops > 0 
            ? (counts.nutrition.workshops / goals.activities.nutrition.workshops) * 100 
            : 0,
          centerRations: goals.activities.nutrition.centerRations > 0 
            ? (counts.nutrition.centerRations / goals.activities.nutrition.centerRations) * 100 
            : 0,
          parkSnacks: goals.activities.nutrition.parkSnacks > 0 
            ? (counts.nutrition.parkSnacks / goals.activities.nutrition.parkSnacks) * 100 
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
      
      console.log('Progreso calculado:', progress);
      
      // Calcular promedios generales por tipo
      const nutritionValues = Object.values(progress.nutrition).filter(val => !isNaN(val));
      const physicalValues = Object.values(progress.physical).filter(val => !isNaN(val));
      const psychosocialValues = Object.values(progress.psychosocial).filter(val => !isNaN(val));
      
      const averages = {
        nutrition: nutritionValues.length > 0 
          ? nutritionValues.reduce((sum, val) => sum + val, 0) / nutritionValues.length 
          : 0,
        physical: physicalValues.length > 0 
          ? physicalValues.reduce((sum, val) => sum + val, 0) / physicalValues.length 
          : 0,
        psychosocial: psychosocialValues.length > 0 
          ? psychosocialValues.reduce((sum, val) => sum + val, 0) / psychosocialValues.length 
          : 0
      };
      
      console.log('Promedios calculados:', averages);
      
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