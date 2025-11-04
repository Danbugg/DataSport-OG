import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";

import CustomTabNavigator from "./screens/TabNavigator"; 
import RegisterScreen from "./screens/RegisterScreen";
import LoginScreen from "./screens/LoginScreen";

// pantallas
import DetalleLigaScreen from "./screens/DetalleLigaScreen";
import DetalleEquipoScreen from "./screens/DetalleEquipoScreen";
import DetalleJugadorScreen from "./screens/DetalleJugadorScreen";

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
			
				<Stack.Screen name="DetalleLigaScreen" component={DetalleLigaScreen} />
				<Stack.Screen name="DetalleEquipoScreen" component={DetalleEquipoScreen} />
				<Stack.Screen name="DetalleJugadorScreen" component={DetalleJugadorScreen} />
				<Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
				<Stack.Screen name="PartidoScreen" component={PartidoScreen} />
				<Stack.Screen name="OlvidarContraScreen" component={OlvidarContraScreen} />
				
			</Stack.Navigator>
		</NavigationContainer>
	);
}
