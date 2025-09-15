import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import RegisterScreen from "./screens/RegisterScreen";
import LoginScreen from "./screens/LoginScreen";
import HomeScreen from "./screens/HomeScreen";
import ProfileScreen from "./screens/ProfileScreen";
import EditProfileScreen from "./screens/EditProfileScreen"; 
import EstadisticaScreen from "./screens/EstadisticaScreen";
import PartidoScreen from "./screens/PartidoScreen";
import BuscadorScreen from "./screens/BuscadorScreen";
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
        <Stack.Screen name="HomeScreen" component={HomeScreen} />
        <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
        <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
        <Stack.Screen name="EstadisticaScreen" component={EstadisticaScreen} />
        <Stack.Screen name="PartidoScreen" component={PartidoScreen} />
        <Stack.Screen name="BuscadorScreen" component={BuscadorScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}


