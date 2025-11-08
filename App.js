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
import ImgCompletaScreen from "./screens/ImgCompletaScreen";

// 🛑 Importación de la pantalla de perfil de OTROS usuarios
import PerfilUsuarioScreen from "./screens/PerfilUsuarioScreen"; 

import EditProfileScreen from "./screens/EditProfileScreen"; 
import PartidoScreen from "./screens/PartidoScreen";
import OlvidarContraScreen from "./screens/OlvidarContraScreen";

// Importación de las listas de seguimiento (SeguidoresScreen y SeguidosScreen)
import SeguidoresScreen from "./screens/SeguidoresScreen"; 
import SeguidosScreen from "./screens/SeguidosScreen"; 

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
                
                {/* 1. La navegación principal con pestañas (Contiene tu perfil propio) */}
                <Stack.Screen 
                    name="MainTabs" 
                    component={CustomTabNavigator}
                />
            
                {/* 2. Rutas de detalle y rutas que deben ser accesibles globalmente */}
                <Stack.Screen name="DetalleLigaScreen" component={DetalleLigaScreen} />
                <Stack.Screen name="DetalleEquipoScreen" component={DetalleEquipoScreen} />
                <Stack.Screen name="DetalleJugadorScreen" component={DetalleJugadorScreen} />
                <Stack.Screen name="ImgCompletaScreen" component={ImgCompletaScreen} />
                
                {/* ✅ CORRECCIÓN: Ruta Global para ver OTROS perfiles */}
                <Stack.Screen name="PerfilUsuarioScreen" component={PerfilUsuarioScreen}/> 
                
                <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
                <Stack.Screen name="PartidoScreen" component={PartidoScreen} />
                <Stack.Screen name="OlvidarContraScreen" component={OlvidarContraScreen} />
                
                {/* Rutas de Listas de Seguimiento (Están en el Stack principal, lo cual es correcto) */}
                <Stack.Screen name="SeguidoresScreen" component={SeguidoresScreen} />
                <Stack.Screen name="SeguidosScreen" component={SeguidosScreen} />
                
            </Stack.Navigator>
        </NavigationContainer>
    );
}