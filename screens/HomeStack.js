import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './HomeScreen';
import CommentsScreen from './CommentsScreen'; 
import ProfileScreen from './ProfileScreen'; 

const Stack = createStackNavigator();

export default function HomeStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {/* 1. La pantalla principal del Feed */}
            <Stack.Screen name="Feed" component={HomeScreen} /> 
            
            {/* 2. Pantalla de Comentarios (a la que navegamos desde el Feed) */}
            <Stack.Screen name="Comments" component={CommentsScreen} />
            
            {/* 3. Pantalla de Perfil de otro usuario (a la que navegamos desde el Feed) */}
            <Stack.Screen name="Profile" component={ProfileScreen} />
        </Stack.Navigator>
    );
}