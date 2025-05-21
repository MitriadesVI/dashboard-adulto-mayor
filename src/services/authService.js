// src/services/authService.js

import { 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const authService = {
  // Iniciar sesión
  login: async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      try {
        await setDoc(doc(db, 'users', user.uid), {
          lastLogin: serverTimestamp()
        }, { merge: true });
      } catch (updateError) {
        console.warn('Error al actualizar lastLogin (no crítico):', updateError);
      }
      
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          return {
            uid: user.uid,
            email: user.email,
            ...userDoc.data()
          };
        } else {
          console.warn('Usuario autenticado pero sin documento en Firestore (login)');
          const basicUserData = {
            uid: user.uid,
            email: user.email,
            name: user.email.split('@')[0],
            role: 'field', 
            contractor: 'PENDIENTE',
            active: true,
            createdAt: serverTimestamp() 
          };
          
          try {
            await setDoc(doc(db, 'users', user.uid), basicUserData);
            const createdDoc = await getDoc(doc(db, 'users', user.uid)); 
             if (createdDoc.exists()) {
                return {
                    uid: user.uid,
                    email: user.email,
                    ...createdDoc.data()
                };
            }
            // Si la re-lectura falla o no existe por alguna razón, devolver datos básicos sin timestamps resueltos
            const returnData = { ...basicUserData };
            delete returnData.createdAt; // serverTimestamp no es serializable directamente
            return returnData;

          } catch (setDocError) {
            console.error('Error al crear documento de usuario básico en Firestore (login):', setDocError);
            const returnData = { ...basicUserData };
            delete returnData.createdAt;
            return returnData;
          }
        }
      } catch (userDocError) {
        console.error('Error al obtener/crear datos de usuario en Firestore (login):', userDocError);
        return {
          uid: user.uid,
          email: user.email,
          name: user.email.split('@')[0],
          role: 'field',
          contractor: 'PENDIENTE'
        };
      }
    } catch (error) {
      console.error('Error en inicio de sesión (Firebase Auth):', error.code, error.message);
      throw error;
    }
  },
  
  logout: async () => {
    try {
      await signOut(auth);
      console.log("Usuario cerró sesión exitosamente.");
      return true;
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      throw error;
    }
  },
  
  // --- FUNCIÓN registerUser MODIFICADA ---
  registerUser: async (email, password, userData) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Crear una copia de userData para modificarla si es necesario
      const userProfileDataToSave = { ...userData };

      // Asegurar que adminType esté establecido si es contractor-admin
      if (userProfileDataToSave.role === 'contractor-admin' && !userProfileDataToSave.adminType) {
        userProfileDataToSave.adminType = 'secondary'; // Por defecto, los nuevos son secundarios
        console.log(`Asignado adminType='secondary' por defecto para contractor-admin: ${email}`);
      }
      
      // Guardar datos del usuario en Firestore con manejo de errores
      try {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          ...userProfileDataToSave, // Usar la copia modificada
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        });
        console.log("Datos de usuario guardados en Firestore para:", email);
      } catch (firestoreError) {
        console.error('Error al guardar datos en Firestore para el nuevo usuario:', email, firestoreError);
        // El usuario ya está creado en Authentication. Considerar si se debe eliminar el usuario de Auth aquí.
      }
      
      // Devolver los datos con los que se intentó crear el perfil,
      // pero sin los serverTimestamps ya que no se resuelven inmediatamente en el cliente
      // y no son serializables directamente (ej. para localStorage).
      const returnData = { 
        uid: user.uid,
        email: user.email,
        ...userProfileDataToSave // Devolver la copia que podría tener adminType añadido
       };
      // No es necesario eliminar createdAt y lastLogin aquí, ya que no los añadimos a returnData
      // si userProfileDataToSave no los tenía explícitamente (lo cual no debería).
      // La función que llama (ej. Login.jsx) recibirá estos datos y luego App.js
      // obtendrá la versión completa con timestamps resueltos de Firestore.
      return returnData;

    } catch (error) {
      console.error('Error al registrar usuario (Firebase Auth):', error.code, error.message);
      throw error;
    }
  },
  // --- FIN FUNCIÓN registerUser MODIFICADA ---
  
  resetPassword: async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      console.log("Correo de restablecimiento de contraseña enviado a:", email);
      return true;
    } catch (error) {
      console.error('Error al enviar correo de restablecimiento:', error);
      throw error;
    }
  },
  
  getCurrentUser: () => {
    return new Promise((resolve, reject) => {
      let timeoutId = setTimeout(() => {
        console.warn("getCurrentUser: Timeout después de 8 segundos.");
        resolve(null); 
      }, 8000);
      
      const currentUser = auth.currentUser;
      if (currentUser) {
        clearTimeout(timeoutId);
        console.log("getCurrentUser: Usuario desde auth.currentUser:", currentUser.email);
        getDoc(doc(db, 'users', currentUser.uid))
          .then(userDoc => {
            if (userDoc.exists()) {
              resolve({ uid: currentUser.uid, email: currentUser.email, ...userDoc.data() });
            } else {
              console.warn('getCurrentUser: auth.currentUser existe pero sin doc en Firestore:', currentUser.email);
              resolve({ uid: currentUser.uid, email: currentUser.email, name: currentUser.email.split('@')[0], role: 'field', contractor: 'PENDIENTE', active: true });
            }
          })
          .catch(error => {
            console.error('getCurrentUser: Error Firestore (auth.currentUser):', error);
            resolve({ uid: currentUser.uid, email: currentUser.email, name: currentUser.email.split('@')[0], role: 'field', contractor: 'PENDIENTE', active: true });
          });
        return;
      }
      
      const unsubscribe = auth.onAuthStateChanged(async (userAuth) => {
        clearTimeout(timeoutId); 
        unsubscribe(); 
        if (userAuth) {
          console.log("getCurrentUser: Usuario desde onAuthStateChanged:", userAuth.email);
          try {
            const userDoc = await getDoc(doc(db, 'users', userAuth.uid));
            if (userDoc.exists()) {
              resolve({ uid: userAuth.uid, email: userAuth.email, ...userDoc.data() });
            } else {
              console.warn('getCurrentUser: onAuthStateChanged dio user pero sin doc en Firestore:', userAuth.email);
              resolve({ uid: userAuth.uid, email: userAuth.email, name: userAuth.email.split('@')[0], role: 'field', contractor: 'PENDIENTE', active: true });
            }
          } catch (error) {
            console.error('getCurrentUser: Error Firestore (onAuthStateChanged):', error);
            resolve({ uid: userAuth.uid, email: userAuth.email, name: userAuth.email.split('@')[0], role: 'field', contractor: 'PENDIENTE', active: true });
          }
        } else {
          console.log("getCurrentUser: No hay usuario (onAuthStateChanged).");
          resolve(null);
        }
      }, (error) => { 
        clearTimeout(timeoutId);
        unsubscribe(); 
        console.error("getCurrentUser: Error en listener onAuthStateChanged:", error);
        resolve(null); 
      });
    });
  },
};

export default authService;