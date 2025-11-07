import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";

import CustomTabNavigator from "./screens/TabNavigator"; 
import RegisterScreen from "./screens/RegisterScreen";
import LoginScreen from "./screens/LoginScreen";

// pantallas de detalle
import DetalleLigaScreen from "./screens/DetalleLigaScreen";
import DetalleEquipoScreen from "./screens/DetalleEquipoScreen";
import DetalleJugadorScreen from "./screens/DetalleJugadorScreen";
// 🛑 IMPORTAR LA NUEVA PANTALLA
import PerfilUsuarioScreen from "./screens/PerfilUsuarioScreen"; // <-- ¡NUEVO!

import EditProfileScreen from "./screens/EditProfileScreen"; 
import PartidoScreen from "./screens/PartidoScreen";
import OlvidarContraScreen from "./screens/OlvidarContraScreen";

const Stack = createStackNavigator();

export default function App() {
    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName="LoginScreen"
                screenOptions={{
                    headerShown: false,
                }}
            >
                <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
                <Stack.Screen name="LoginScreen" component={LoginScreen} />
                
                <Stack.Screen 
                    name="MainTabs" 
                    component={CustomTabNavigator}
                />
            
                {/* Rutas de detalle fuera del Tab Navigator */}
                <Stack.Screen name="DetalleLigaScreen" component={DetalleLigaScreen} />
                <Stack.Screen name="DetalleEquipoScreen" component={DetalleEquipoScreen} />
                <Stack.Screen name="DetalleJugadorScreen" component={DetalleJugadorScreen} />
                {/* 🛑 REGISTRO DE LA PANTALLA DE PERFIL DE USUARIO */}
                <Stack.Screen 
                    name="PerfilUsuarioScreen" 
                    component={PerfilUsuarioScreen}
                    options={{ headerShown: true, title: 'Perfil' }} // Se muestra el header en esta vista
                />
                
                <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
                <Stack.Screen name="PartidoScreen" component={PartidoScreen} />
                <Stack.Screen name="OlvidarContraScreen" component={OlvidarContraScreen} />
                
            </Stack.Navigator>
        </NavigationContainer>
    );
}
