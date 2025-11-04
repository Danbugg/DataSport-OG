import React, { useState, useEffect } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);

  useEffect(() => {
    const checkLockoutStatus = async () => {
      const storedAttempts = await AsyncStorage.getItem("failedAttempts");
      const storedLockoutTime = await AsyncStorage.getItem("lockoutTime");

      if (storedAttempts) {
        setFailedAttempts(parseInt(storedAttempts, 10));
      }

      if (storedLockoutTime) {
        const lockoutTimestamp = parseInt(storedLockoutTime, 10);
        const now = Date.now();
        const remainingTime = lockoutTimestamp - now;

        if (remainingTime > 0) {
          setIsLocked(true);
          setLockoutTime(Math.ceil(remainingTime / 1000));
          Alert.alert(
            "Bloqueado",
            `Demasiados intentos. Intenta de nuevo en ${Math.ceil(remainingTime / 60000)} minutos.`
          );
        } else {
          setIsLocked(false);
          setFailedAttempts(0);
          AsyncStorage.removeItem("failedAttempts");
          AsyncStorage.removeItem("lockoutTime");
        }
      }
    };
    checkLockoutStatus();
  }, []);

  useEffect(() => {
    let timer;
    if (isLocked) {
      timer = setInterval(() => {
        setLockoutTime((prevTime) => {
          if (prevTime <= 1) {
            setIsLocked(false);
            setFailedAttempts(0);
            AsyncStorage.removeItem("failedAttempts");
            AsyncStorage.removeItem("lockoutTime");
            clearInterval(timer);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isLocked]);

  const handleLogin = async () => {
    if (isLocked) {
      Alert.alert(
        "Cuenta bloqueada",
        `Tu cuenta está bloqueada. Por favor, espera ${Math.floor(lockoutTime / 60)}:${('0' + (lockoutTime % 60)).slice(-2)} antes de intentarlo de nuevo.`
      );
      return;
    }

    if (!email || !password) {
      Alert.alert("Error", "Por favor ingresa correo y contraseña");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:3000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, contrasena: password }),
      });

      const data = await response.json();

      if (response.ok) {
        setFailedAttempts(0);
        await AsyncStorage.removeItem("failedAttempts");
        await AsyncStorage.removeItem("lockoutTime");
        
        await AsyncStorage.setItem('userId', String(data.usuario.id_usuario));

        const usuario = data.usuario;
        Alert.alert("Te damos la bienvenida a DataSport", `Has iniciado sesión como ${usuario.nombre_usuario}`);
        navigation.navigate("MainTabs", { userId: usuario.id_usuario });
      } else {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        await AsyncStorage.setItem("failedAttempts", newAttempts.toString());

        if (newAttempts >= 3) {
          const lockoutDuration = 1 * 60 * 1000;
          const lockoutTimestamp = Date.now() + lockoutDuration;
          setIsLocked(true);
          setLockoutTime(1 * 60);
          await AsyncStorage.setItem("lockoutTime", lockoutTimestamp.toString());
          Alert.alert(
            "Demasiados intentos",
            "Has fallado 3 veces. Tu cuenta ha sido bloqueada por 1 minuto."
          );
        } else {
          Alert.alert(
            "Error",
            `${data.error || "Credenciales inválidas"}. Te quedan ${3 - newAttempts} intentos.`
          );
        }
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
            {isLocked ? (
              <View style={styles.lockoutContainer}>
                <Ionicons name="lock-closed" size={80} color="#ff4040" />
                <Text style={styles.lockoutTitle}>Cuenta Bloqueada</Text>
                <Text style={styles.lockoutText}>
                  Has excedido el número de intentos.
                </Text>
                <Text style={styles.lockoutTimer}>
                  Espera {Math.floor(lockoutTime / 60)}:{('0' + (lockoutTime % 60)).slice(-2)}
                </Text>
              </View>
            ) : (
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

                <TouchableOpacity
                  style={styles.forgotPasswordButton}
                  onPress={() => navigation.navigate("OlvidarContraScreen")}
                >
                  <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
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
            )}
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
  lockoutContainer: {
    backgroundColor: "#ff40404a",
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 25,
    width: "90%",
    alignItems: "center",
    justifyContent: "center",
  },
  lockoutTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 10,
  },
  lockoutText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    marginTop: 10,
  },
  lockoutTimer: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 20,
  },
  forgotPasswordButton: {
    marginTop: 10,
  },
  forgotPasswordText: {
    color: "#fff",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});