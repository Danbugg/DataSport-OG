import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from "react-native";

export default function HomeScreen({ navigation, route }) {
  const { userId } = route.params || {};
  const fondoHome = require("../assets/fondoHome.jpeg"); 

  return (
    <ImageBackground source={fondoHome} style={styles.background}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.logo}>
            Data<Text style={styles.sport}>Sport</Text>
          </Text>
          <Text style={styles.title}>🏟️ Bienvenido</Text>
          <Text style={styles.subtitle}>Tu espacio para el deporte en tiempo real</Text>

          {/* Botón para ir al buscador */}
          <TouchableOpacity 
            style={styles.button}
            onPress={() => navigation.navigate("BuscadorScreen", { userId })}
          >
            <Text style={styles.buttonText}>Buscar Ligas, Equipos y Jugadores</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.button}
            onPress={() => navigation.navigate("EstadisticaScreen")}
          >
            <Text style={styles.buttonText}>Ver Partidos</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.button}
            onPress={() => navigation.navigate("ProfileScreen", { userId })}
          >
            <Text style={styles.buttonText}>Mi Perfil</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.logoutButton]}
            onPress={() => navigation.replace("LoginScreen")}
          >
            <Text style={styles.buttonText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, resizeMode: "cover" },
  overlay: { 
    flex: 1, 
    backgroundColor: "rgba(0,0,0,0.5)", 
    justifyContent: "center", 
    alignItems: "center" 
  },
  container: { 
    backgroundColor: "#ffffff55", 
    padding: 25, 
    borderRadius: 20, 
    width: "90%", 
    alignItems: "center" 
  },
  logo: { fontSize: 32, fontWeight: "bold", color: "#fff" },
  sport: { color: "#0033ff" },
  title: { fontSize: 26, fontWeight: "bold", color: "#fff", marginTop: 10 },
  subtitle: { fontSize: 16, color: "#eee", marginBottom: 30, textAlign: "center" },
  button: { 
    backgroundColor: "#0033ff", 
    padding: 15, 
    borderRadius: 25, 
    marginVertical: 10, 
    width: "80%", 
    alignItems: "center" 
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold", textAlign: "center" },
  logoutButton: { backgroundColor: "#ff3333" },
});
