import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Por favor ingresa correo y contraseña");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://10.0.2.2:3000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, contrasena: password }),
      });

      const data = await response.json();

      if (response.ok) {
        const usuario = data.usuario;
        Alert.alert("Bienvenido", `Has iniciado sesión como ${usuario.nombre_usuario}`);
        navigation.replace("HomeScreen", { userId: usuario.id_usuario });
      } else {
        Alert.alert("Error", data.error || "Credenciales inválidas");
      }
    } catch (error) {
      console.error("Error en fetch:", error);
      Alert.alert("Error", "No se pudo conectar al servidor");
    } finally {
      setLoading(false);
    }
  };

  const fondoLogin = require("../assets/fondoLogin.jpg");

  return (
    <ImageBackground source={fondoLogin} style={styles.background}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1, width: "100%" }}>
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View style={styles.formContainer}>
              <Text style={styles.logo}>
                Data<Text style={styles.sport}>Sport</Text>
              </Text>
              <Text style={styles.subtitle}>Infórmate de tus equipos favoritos</Text>

              <TextInput
                style={styles.input}
                placeholder="Correo"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* Campo contraseña con ojo */}
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="Contraseña"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={22}
                    color="#333"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.button, loading && { opacity: 0.7 }]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Continuar</Text>
                )}
              </TouchableOpacity>

              <Text style={{ marginTop: 15, color: "#fff" }}>
                ¿No tienes cuenta?{" "}
                <Text
                  style={styles.link}
                  onPress={() => navigation.navigate("RegisterScreen")}
                >
                  Regístrate
                </Text>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, justifyContent: "center", alignItems: "center" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  formContainer: {
    backgroundColor: "#ff40404a",
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 25,
    width: "90%",
    alignItems: "center",
  },
  logo: { fontSize: 32, fontWeight: "bold", color: "#ff0000" },
  sport: { color: "#fff" },
  subtitle: { fontSize: 14, color: "#fff", marginBottom: 20 },
  input: {
    width: "100%",
    height: 50,
    borderRadius: 25,
    marginBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: "#ffffffa8",
    color: "#000",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 15,
    backgroundColor: "#ffffffa8",
    borderRadius: 25,
  },
  eyeButton: {
    paddingHorizontal: 12,
  },
  button: {
    width: "100%",
    backgroundColor: "#3c0404c1",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  link: { color: "#fff", fontWeight: "bold" },
});
