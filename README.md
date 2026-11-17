# SEPAM – Seguimiento de Centros de Vida (Programa Adulto Mayor)

Aplicación web (PWA) para que los contratistas registren las actividades que realizan en
cada parque o Centro de Vida (CDV) fijo —actividades educativas y entrega de raciones— y
para que el Distrito haga seguimiento: qué sedes no han recibido atención, avance de metas
y comparativos entre contratistas.

## Roles

| Rol | Qué hace |
|---|---|
| `district` (Distrito) | Dashboard completo, sedes, metas y gestión de usuarios (activar/desactivar, representante principal). |
| `contractor-admin` (Representante / administrador) | Aprueba o rechaza actividades de su equipo, gestiona su equipo y ve el dashboard del contratista (cobertura de sedes, metas, reporte de usuarios). El representante **principal** (`adminType: 'main'`) es quien edita y desactiva a su equipo. |
| `field` (Profesional de campo) | Registra actividades (también sin conexión), corrige las rechazadas y ve su propio dashboard. |

Las actividades nacen `pending`, el contratista las aprueba o rechaza, y una rechazada se
corrige y vuelve a `pending` (queda el historial del rechazo).

## Desarrollo

```bash
npm install
npm start        # http://localhost:3000
npm run build    # build de producción (Netlify publica la carpeta build/)
```

Para probar sin tocar la base real, con los emuladores de Firebase:

```bash
firebase emulators:start --only auth,firestore      # en otra terminal
REACT_APP_USE_EMULATORS=true npm start
```

## Configuración

- **Contratistas:** se definen en `src/config/contractors.js` (id guardado en Firestore,
  nombre visible, estilo de etiquetas y color). Es el único lugar que hay que editar para
  cambiar o agregar un contratista.
- **Fechas:** las actividades guardan la fecha como `'YYYY-MM-DD'` y se interpretan en hora
  local con `src/utils/dates.js` (no usar `new Date('YYYY-MM-DD')`, que es UTC).

## Firebase (reglas e índices)

Las reglas de seguridad y los índices están versionados en `firestore.rules` y
`firestore.indexes.json`. Para publicarlos:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,firestore:indexes --project cdv1-74cb3
```

(O copiar `firestore.rules` en Firebase Console → Firestore Database → Reglas.)

Notas:
- Los usuarios los crea el Distrito (o el representante del contratista para su equipo)
  desde la app. Las reglas impiden que alguien se asigne un rol por su cuenta.
- El primer usuario del Distrito debe tener su documento en `users/{uid}` con
  `role: 'district'` (crearlo una vez desde Firebase Console si el proyecto es nuevo).
- Un usuario con `active: false` no puede iniciar sesión ni leer o escribir datos.
