// src/services/authService.js

import { 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db, getSecondaryAuth } from '../firebase/config';

const appError = (code, message) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

// Lee el perfil de Firestore del usuario autenticado. Lanza un error con código
// 'app/no-profile' o 'app/user-disabled' si no puede usar la aplicación.
const loadProfile = async (firebaseUser) => {
  const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
  if (!userDoc.exists()) {
    throw appError('app/no-profile', 'Su usuario no tiene un perfil asignado. Contacte al administrador.');
  }
  const profile = { uid: firebaseUser.uid, email: firebaseUser.email, ...userDoc.data() };
  if (profile.active === false) {
    throw appError('app/user-disabled', 'Su cuenta está desactivada. Contacte al administrador.');
  }
  return profile;
};

const authService = {
  // ... (mantener todas las funciones existentes)
  
  // Iniciar sesión. Solo entran usuarios con perfil en Firestore y activos.
  login: async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      try {
        const profile = await loadProfile(userCredential.user);
        console.log("✅ Usuario logueado exitosamente:", profile.email, "Rol:", profile.role);
        return profile;
      } catch (profileError) {
        await signOut(auth).catch(() => {});
        throw profileError;
      }
    } catch (error) {
      console.error('❌ Error en inicio de sesión:', error.code, error.message);
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
  
  // Crea la cuenta de otro usuario sin cerrar la sesión del administrador:
  // la cuenta se crea en una instancia secundaria de Auth y el perfil lo escribe
  // el administrador (las reglas de Firestore solo permiten que un admin cree perfiles).
  registerUser: async (email, password, userData) => {
    const secondaryAuth = await getSecondaryAuth();
    let createdUser = null;
    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      createdUser = userCredential.user;

      const userProfileDataToSave = { ...userData };
      if (userProfileDataToSave.role === 'contractor-admin' && !userProfileDataToSave.adminType) {
        userProfileDataToSave.adminType = 'secondary';
      }

      try {
        await setDoc(doc(db, 'users', createdUser.uid), {
          uid: createdUser.uid,
          email: createdUser.email,
          ...userProfileDataToSave,
          createdAt: serverTimestamp(),
          createdBy: auth.currentUser ? auth.currentUser.uid : null
        });
      } catch (firestoreError) {
        // Sin perfil la cuenta no sirve: se elimina para poder reintentar con el mismo correo
        await deleteUser(createdUser).catch(() => {});
        throw appError('app/profile-write-failed', 'No se pudo guardar el perfil del usuario (permisos insuficientes o sin conexión).');
      }

      console.log("✅ Usuario creado:", email);
      return { uid: createdUser.uid, email: createdUser.email, ...userProfileDataToSave };
    } catch (error) {
      console.error('❌ Error al registrar usuario:', error.code, error.message);
      if (error.code === 'auth/email-already-in-use') {
        throw appError(error.code, 'Ya existe una cuenta con ese correo electrónico.');
      }
      if (error.code === 'auth/weak-password') {
        throw appError(error.code, 'La contraseña debe tener al menos 6 caracteres.');
      }
      if (error.code === 'auth/invalid-email') {
        throw appError(error.code, 'El correo electrónico no es válido.');
      }
      throw error;
    } finally {
      await signOut(secondaryAuth).catch(() => {});
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
  
  // Resuelve el perfil del usuario con sesión activa, o null si no hay sesión
  // (o si el usuario no tiene perfil o está desactivado; en ese caso cierra la sesión).
  // Rechaza si no se pudo verificar (sin conexión, timeout): quien llama decide
  // si mantiene el usuario guardado localmente.
  getCurrentUser: () => {
    return new Promise((resolve, reject) => {
      let settled = false;
      let unsubscribe = () => {};

      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        unsubscribe();
        reject(appError('app/timeout', 'No se pudo verificar la sesión (tiempo agotado).'));
      }, 8000);

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        unsubscribe();

        if (!firebaseUser) {
          resolve(null);
          return;
        }

        try {
          resolve(await loadProfile(firebaseUser));
        } catch (error) {
          if (error.code === 'app/no-profile' || error.code === 'app/user-disabled') {
            console.warn('⚠️ getCurrentUser:', error.message);
            await signOut(auth).catch(() => {});
            resolve(null);
          } else {
            reject(error);
          }
        }
      }, (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        unsubscribe();
        reject(error);
      });
    });
  },
};

export default authService;