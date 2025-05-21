const fs = require('fs');
const path = require('path');

// Carpeta raíz del proyecto
const rootDir = './src';

// Lista de archivos a corregir
const filesToFix = [
  'components/pages/ActivitiesPage.jsx',
  'components/pages/AdminPanel.jsx',
  'components/approval/ApprovalPanel.jsx'
];

// Mapa de correcciones de importación
const importCorrections = {
  '../components/ActivityForm': '../activities/ActivityForm',
  '../services/activitiesService': '../../services/activitiesService',
  '../services/localStorageService': '../../services/localStorageService',
  '../services/syncService': '../../services/syncService',
  '../services/goalsService': '../../services/goalsService',
  '../services/authService': '../../services/authService'
};

// Función para corregir las importaciones en un archivo
function fixImportsInFile(filePath) {
  const fullPath = path.join(rootDir, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${fullPath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Agregar Divider a importaciones de Material UI si falta
  if (content.includes('ListItem') && !content.includes('Divider')) {
    content = content.replace(
      /(import {[^}]+)(} from '@mui\/material';)/,
      '$1, Divider$2'
    );
  }
  
  // Corregir rutas de importación
  for (const [oldPath, newPath] of Object.entries(importCorrections)) {
    content = content.replace(
      new RegExp(`from ['"]${oldPath}['"]`, 'g'),
      `from '${newPath}'`
    );
  }
  
  fs.writeFileSync(fullPath, content);
  console.log(`Fixed imports in ${filePath}`);
}

// Corregir todos los archivos en la lista
filesToFix.forEach(fixImportsInFile);
console.log('Import correction complete!');