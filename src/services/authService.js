// src/services/authService.js

import { 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const authService = {
  // ... (mantener todas las funciones existentes)
  
  // Iniciar sesión - CORREGIDO TEMPORALMENTE
  login: async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // ❌ COMENTADO TEMPORALMENTE - ESTA LÍNEA CAUSA EL PROBLEMA
      // try {
      //   await setDoc(doc(db, 'users', user.uid), {
      //     lastLogin: serverTimestamp()
      //   }, { merge: true });
      // } catch (updateError) {
      //   console.warn('Error al actualizar lastLogin (no crítico):', updateError);
      // }
      
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          const userData = {
            uid: user.uid,
            email: user.email,
            ...userDoc.data()
          };
          console.log("✅ Usuario logueado exitosamente:", userData.email, "Rol:", userData.role);
          return userData;
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
            const returnData = { ...basicUserData };
            delete returnData.createdAt;
            console.log("✅ Usuario creado y logueado:", returnData.email);
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
      console.error('❌ Error en inicio de sesión (Firebase Auth):', error.code, error.message);
      throw error;
    }
  },
  
  logout: async () => {
    try {
      await signOut(auth);
      console.log("✅ Usuario cerró sesión exitosamente.");
      return true;
    } catch (error) {
      console.error('❌ Error al cerrar sesión:', error);
      throw error;
    }
  },
  
  registerUser: async (email, password, userData) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const userProfileDataToSave = { ...userData };

      if (userProfileDataToSave.role === 'contractor-admin' && !userProfileDataToSave.adminType) {
        userProfileDataToSave.adminType = 'secondary';
        console.log(`Asignado adminType='secondary' por defecto para contractor-admin: ${email}`);
      }
      
      try {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          ...userProfileDataToSave,
          createdAt: serverTimestamp(),
          // ❌ COMENTADO TEMPORALMENTE
          // lastLogin: serverTimestamp()
        });
        console.log("✅ Datos de usuario guardados en Firestore para:", email);
      } catch (firestoreError) {
        console.error('❌ Error al guardar datos en Firestore para el nuevo usuario:', email, firestoreError);
      }
      
      const returnData = { 
        uid: user.uid,
        email: user.email,
        ...userProfileDataToSave
       };
      return returnData;

    } catch (error) {
      console.error('❌ Error al registrar usuario (Firebase Auth):', error.code, error.message);
      throw error;
    }
  },
  
  resetPassword: async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      console.log("✅ Correo de restablecimiento de contraseña enviado a:", email);
      return true;
    } catch (error) {
      console.error('❌ Error al enviar correo de restablecimiento:', error);
      throw error;
    }
  },

  // ===== NUEVAS FUNCIONES PARA CAMBIO DE CONTRASEÑA =====
  
  // Cambiar contraseña del usuario actual
  changePassword: async (currentPassword, newPassword) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No hay usuario autenticado');
      }

      // Crear credencial con la contraseña actual
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      
      // Re-autenticar al usuario
      await reauthenticateWithCredential(user, credential);
      console.log('✅ Usuario re-autenticado exitosamente');
      
      // Actualizar la contraseña
      await updatePassword(user, newPassword);
      console.log('✅ Contraseña actualizada exitosamente');
      
      // ❌ COMENTADO TEMPORALMENTE - REGISTRAR EL CAMBIO EN FIRESTORE
      // try {
      //   await updateDoc(doc(db, 'users', user.uid), {
      //     passwordChangedAt: serverTimestamp()
      //   });
      // } catch (updateError) {
      //   console.warn('Error al registrar cambio de contraseña en Firestore (no crítico):', updateError);
      // }
      
      return { success: true, message: 'Contraseña actualizada correctamente' };
      
    } catch (error) {
      console.error('❌ Error al cambiar contraseña:', error);
      
      // Manejar errores específicos
      let errorMessage = 'Error al cambiar la contraseña';
      switch (error.code) {
        case 'auth/wrong-password':
          errorMessage = 'La contraseña actual es incorrecta';
          break;
        case 'auth/weak-password':
          errorMessage = 'La nueva contraseña es muy débil. Debe tener al menos 6 caracteres';
          break;
        case 'auth/requires-recent-login':
          errorMessage = 'Por seguridad, debe volver a iniciar sesión antes de cambiar su contraseña';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Su cuenta está deshabilitada';
          break;
        case 'auth/user-not-found':
          errorMessage = 'Usuario no encontrado';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'La contraseña actual es incorrecta';
          break;
        default:
          errorMessage = error.message || 'Error desconocido al cambiar contraseña';
      }
      
      throw new Error(errorMessage);
    }
  },

  // Resetear contraseña de otro usuario (solo para admins)
  resetUserPassword: async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      console.log("✅ Correo de restablecimiento enviado a:", email);
      return { 
        success: true, 
        message: `Se ha enviado un correo de restablecimiento a ${email}` 
      };
    } catch (error) {
      console.error('❌ Error al resetear contraseña de usuario:', error);
      
      let errorMessage = 'Error al enviar correo de restablecimiento';
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No se encontró un usuario con ese correo electrónico';
          break;
        case 'auth/invalid-email':
          errorMessage = 'El correo electrónico no es válido';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Demasiados intentos. Intente más tarde';
          break;
        default:
          errorMessage = error.message || 'Error desconocido al resetear contraseña';
      }
      
      throw new Error(errorMessage);
    }
  },

  // Actualizar perfil del usuario
  updateUserProfile: async (userId, profileData) => {
    try {
      const userRef = doc(db, 'users', userId);
      
      // Solo permitir actualizar ciertos campos
      const allowedFields = ['name', 'displayName', 'photoURL'];
      const updateData = {};
      
      Object.keys(profileData).forEach(key => {
        if (allowedFields.includes(key) && profileData[key] !== undefined) {
          updateData[key] = profileData[key];
        }
      });
      
      if (Object.keys(updateData).length === 0) {
        return { success: false, message: 'No hay campos válidos para actualizar' };
      }
      
      updateData.updatedAt = serverTimestamp();
      
      await updateDoc(userRef, updateData);
      console.log('✅ Perfil actualizado exitosamente');
      
      return { success: true, message: 'Perfil actualizado correctamente' };
      
    } catch (error) {
      console.error('❌ Error al actualizar perfil:', error);
      throw new Error('Error al actualizar el perfil: ' + error.message);
    }
  },
  
  getCurrentUser: () => {
    return new Promise((resolve, reject) => {
      let timeoutId = setTimeout(() => {
        console.warn("⏰ getCurrentUser: Timeout después de 8 segundos.");
        resolve(null); 
      }, 8000);
      
      const currentUser = auth.currentUser;
      if (currentUser) {
        clearTimeout(timeoutId);
        console.log("✅ getCurrentUser: Usuario desde auth.currentUser:", currentUser.email);
        getDoc(doc(db, 'users', currentUser.uid))
          .then(userDoc => {
            if (userDoc.exists()) {
              const userData = { uid: currentUser.uid, email: currentUser.email, ...userDoc.data() };
              console.log("✅ getCurrentUser: Datos obtenidos de Firestore:", userData.role);
              resolve(userData);
            } else {
              console.warn('⚠️ getCurrentUser: auth.currentUser existe pero sin doc en Firestore:', currentUser.email);
              resolve({ uid: currentUser.uid, email: currentUser.email, name: currentUser.email.split('@')[0], role: 'field', contractor: 'PENDIENTE', active: true });
            }
          })
          .catch(error => {
            console.error('❌ getCurrentUser: Error Firestore (auth.currentUser):', error);
            resolve({ uid: currentUser.uid, email: currentUser.email, name: currentUser.email.split('@')[0], role: 'field', contractor: 'PENDIENTE', active: true });
          });
        return;
      }
      
      const unsubscribe = auth.onAuthStateChanged(async (userAuth) => {
        clearTimeout(timeoutId); 
        unsubscribe(); 
        if (userAuth) {
          console.log("✅ getCurrentUser: Usuario desde onAuthStateChanged:", userAuth.email);
          try {
            const userDoc = await getDoc(doc(db, 'users', userAuth.uid));
            if (userDoc.exists()) {
              const userData = { uid: userAuth.uid, email: userAuth.email, ...userDoc.data() };
              console.log("✅ getCurrentUser: Datos obtenidos (onAuthStateChanged):", userData.role);
              resolve(userData);
            } else {
              console.warn('⚠️ getCurrentUser: onAuthStateChanged dio user pero sin doc en Firestore:', userAuth.email);
              resolve({ uid: userAuth.uid, email: userAuth.email, name: userAuth.email.split('@')[0], role: 'field', contractor: 'PENDIENTE', active: true });
            }
          } catch (error) {
            console.error('❌ getCurrentUser: Error Firestore (onAuthStateChanged):', error);
            resolve({ uid: userAuth.uid, email: userAuth.email, name: userAuth.email.split('@')[0], role: 'field', contractor: 'PENDIENTE', active: true });
          }
        } else {
          console.log("ℹ️ getCurrentUser: No hay usuario (onAuthStateChanged).");
          resolve(null);
        }
      }, (error) => { 
        clearTimeout(timeoutId);
        unsubscribe(); 
        console.error("❌ getCurrentUser: Error en listener onAuthStateChanged:", error);
        resolve(null); 
      });
    });
  },
};

export default authService;