import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import BuscadorScreen from './BuscadorScreen'; 
import EstadisticaScreen from './EstadisticaScreen'; 
import ProfileScreen from './ProfileScreen'; 
import CreatePostScreen from './CreatePostScreen'; 
import HomeStack from './HomeStack'; // Importamos el Stack

const Tab = createBottomTabNavigator();

const CustomTabNavigator = ({ route }) => {
    const { userId } = route.params || {};

    return (
        <Tab.Navigator
            // Usamos HomeTab como ruta inicial. 
            // Ojo: Si la ruta inicial no es un Stack, hay que asegurar que la navegacion entre Stack y Tab funcione.
            initialRouteName="HomeTab" 
            screenOptions={{
                tabBarActiveTintColor: '#0033ff', 
                tabBarInactiveTintColor: 'gray',
                tabBarStyle: { 
                    backgroundColor: '#000', 
                    borderTopWidth: 0, 
                    height: 60, 
                    paddingBottom: 5,
                    paddingTop: 5,
                },
                headerShown: false, 
            }}
        >
            
            {/* 1. Estadísticas */}
            <Tab.Screen
                name="Estadisticas"
                component={EstadisticaScreen}
                options={{
                    tabBarLabel: '', 
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="arrow-up-circle-outline" color={color} size={30} />
                    ),
                }}
            />

            {/* 2. Buscador */}
            <Tab.Screen
                name="Buscador"
                component={BuscadorScreen}
                initialParams={{ userId: userId }}
                options={{
                    tabBarLabel: '',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="search-outline" color={color} size={30} />
                    ),
                }}
            />

            {/* 3. Pestaña PRINCIPAL (Ahora usando HomeStack) */}
            <Tab.Screen
                name="HomeTab" // ⬅️ Nombre clave para la navegación anidada desde otras pestañas
                component={HomeStack} 
                options={{
                    tabBarLabel: '',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" color={'red'} size={38} /> 
                    ),
                }}
            />

            {/* 4. Crear Post */}
            <Tab.Screen
                name="CrearPost"
                component={CreatePostScreen} 
                options={{
                    tabBarLabel: '',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="add-circle-outline" color={color} size={30} />
                    ),
                }}
            />

            {/* 5. Perfil */}
            <Tab.Screen
                name="Perfil"
                component={ProfileScreen}
                initialParams={{ userId: userId }}
                options={{
                    tabBarLabel: '',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person-circle-outline" color={color} size={30} />
                    ),
                }}
            />
            
        </Tab.Navigator>
    );
};

export default CustomTabNavigator;
