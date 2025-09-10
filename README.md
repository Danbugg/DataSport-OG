# 🎬 curso-react-native-metacritic-app

Proyecto fullstack con **React Native (Expo)** en el frontend y **Node.js + Express + PostgreSQL + Neo4j** en el backend.

---

## 📂 Estructura del proyecto

├── assets/ # Recursos de la app móvil
├── backend/ # Código del servidor Node.js
│ ├── db.js # Configuración PostgreSQL
│ ├── neo4j.js # Configuración Neo4j
│ ├── server.js # Servidor principal Express
│ ├── test-neo4j.js # Script de prueba Neo4j
│ ├── package.json # Dependencias backend
├── screens/ # Pantallas del frontend
├── App.js # Componente raíz RN
├── index.js # Entrada de la app Expo
├── package.json # Dependencias frontend
└── README.md # Archivo explicativo para entender las versiones de la app


---

## 📱 Frontend (React Native + Expo)

### 🚀 Tecnologías principales
- Expo: 53.0.22  
- React: 19.0.0  
- React Native: 0.79.5  
- React Navigation: @react-navigation/native, native-stack y stack  
- Npm: 10.9.3

### 📦 Dependencias clave
- @react-native-async-storage/async-storage  
- @react-native-community/datetimepicker  
- axios  
- bcrypt / bcryptjs  
- expo-firebase-core, expo-image-picker, expo-status-bar  
- moment, react-native-modal-datetime-picker  
- react-native-gesture-handler, reanimated, safe-area-context, screens  

### ▶️ Scripts disponibles
```bash
npm start       # Inicia el servidor de desarrollo con Expo
npm run android # Ejecuta en emulador/dispositivo Android
npm run ios     # Ejecuta en emulador/dispositivo iOS (solo macOS)
npm run web     # Abre la app en navegador
npm run lint    # Corre ESLint

## ▶️ Cómo correr el frontend
npm install
npm start

-----------

### 🖥️ Backend (Node.js + Express)
🚀 Tecnologías principales

Node.js: 22.18.0
Express: ^5.1.0
PostgreSQL (driver pg)
Neo4j (driver oficial neo4j-driver)

📦 Dependencias clave
bcrypt / bcryptjs (hash de contraseñas)
cors (seguridad)
express (servidor web)
multer (manejo de archivos)
pg (cliente PostgreSQL)
neo4j-driver (cliente Neo4j)

## ▶️ Cómo correr el backend
cd backend
npm install
node server.js


🖥️ Backend (Node.js + Express)
🚀 Tecnologías principales

Node.js (v18+ recomendado)

Express: ^5.1.0

PostgreSQL (driver pg)

Neo4j (driver oficial neo4j-driver)

📦 Dependencias clave

bcrypt / bcryptjs (hash de contraseñas)

cors (seguridad)

express (servidor web)

multer (manejo de archivos)

pg (cliente PostgreSQL)

neo4j-driver (cliente Neo4j)

▶️ Cómo correr el backend
cd backend
npm install
node server.js

⚙️ Configuración

PostgreSQL: credenciales en db.js

Neo4j: credenciales en neo4j.js

Asegúrate de tener PostgreSQL y Neo4j corriendo en tu máquina antes de iniciar el servidor.

⚙️ Requisitos generales

Node.js v18 o superior

npm 

Expo Go (para probar la app en el móvil)

PostgreSQL y Neo4j instalados

