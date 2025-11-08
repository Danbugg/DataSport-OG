import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Modal,
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

  // Estados para modales personalizados
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [warningModalVisible, setWarningModalVisible] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

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
          setWarningMessage(`Demasiados intentos. Intenta de nuevo en ${Math.ceil(remainingTime / 60000)} minutos.`);
          setWarningModalVisible(true);
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
      setWarningMessage(`Tu cuenta está bloqueada. Por favor, espera ${Math.floor(lockoutTime / 60)}:${('0' + (lockoutTime % 60)).slice(-2)} antes de intentarlo de nuevo.`);
      setWarningModalVisible(true);
      return;
    }

    if (!email || !password) {
      setErrorMessage("Por favor ingresa correo y contraseña");
      setErrorModalVisible(true);
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
        setSuccessMessage(`Has iniciado sesión como ${usuario.nombre_usuario}`);
        setSuccessModalVisible(true);
        
        // Navegar después de cerrar el modal de éxito
        setTimeout(() => {
          navigation.navigate("MainTabs", { userId: usuario.id_usuario });
        }, 1500);
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
          setWarningMessage("Has fallado 3 veces. Tu cuenta ha sido bloqueada por 1 minuto.");
          setWarningModalVisible(true);
        } else {
          setErrorMessage(`${data.error || "Credenciales inválidas"}. Te quedan ${3 - newAttempts} intentos.`);
          setErrorModalVisible(true);
        }
      }
    } catch (error) {
      console.error("Error en fetch:", error);
      setErrorMessage("No se pudo conectar al servidor");
      setErrorModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const fondoLogin = require("../assets/fondoLogin.jpg");

  // --- MODAL DE ERROR ---
  const ErrorModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={errorModalVisible}
      onRequestClose={() => setErrorModalVisible(false)}
    >
      <TouchableOpacity 
        style={modalStyles.centeredView} 
        activeOpacity={1}
        onPress={() => setErrorModalVisible(false)}
      >
        <View style={modalStyles.errorModalView}>
          <Ionicons name="close-circle" size={60} color="#ff3333" style={{ marginBottom: 15 }} />
          
          <Text style={modalStyles.errorTitle}>Error</Text>
          <Text style={modalStyles.errorMessage}>{errorMessage}</Text>

          <TouchableOpacity
            style={modalStyles.errorButton}
            onPress={() => setErrorModalVisible(false)}
          >
            <Text style={modalStyles.errorButtonText}>Aceptar</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // --- MODAL DE ÉXITO ---
  const SuccessModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={successModalVisible}
      onRequestClose={() => setSuccessModalVisible(false)}
    >
      <TouchableOpacity 
        style={modalStyles.centeredView} 
        activeOpacity={1}
        onPress={() => setSuccessModalVisible(false)}
      >
        <View style={modalStyles.successModalView}>
          <Ionicons name="checkmark-circle" size={60} color="#002affff" style={{ marginBottom: 15 }} />
          
          <Text style={modalStyles.successTitle}>¡Bienvenido a DataSport!</Text>
          <Text style={modalStyles.successMessage}>{successMessage}</Text>

          <TouchableOpacity
            style={modalStyles.successButton}
            onPress={() => setSuccessModalVisible(false)}
          >
            <Text style={modalStyles.successButtonText}>Continuar</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // --- MODAL DE ADVERTENCIA ---
  const WarningModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={warningModalVisible}
      onRequestClose={() => setWarningModalVisible(false)}
    >
      <TouchableOpacity 
        style={modalStyles.centeredView} 
        activeOpacity={1}
        onPress={() => setWarningModalVisible(false)}
      >
        <View style={modalStyles.warningModalView}>
          <Ionicons name="warning-outline" size={60} color="#ffcc00" style={{ marginBottom: 15 }} />
          
          <Text style={modalStyles.warningTitle}>Cuenta Bloqueada</Text>
          <Text style={modalStyles.warningMessage}>{warningMessage}</Text>

          <TouchableOpacity
            style={modalStyles.warningButton}
            onPress={() => setWarningModalVisible(false)}
          >
            <Text style={modalStyles.warningButtonText}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

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

      {/* Modales personalizados */}
      <ErrorModal />
      <SuccessModal />
      <WarningModal />
    </ImageBackground>
  );
}

// --- ESTILOS DE LOS MODALES ---
const modalStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  // Modal de Error
  errorModalView: {
    width: '85%',
    margin: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#ff3333',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ff3333',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  errorButton: {
    backgroundColor: '#ff3333',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 15,
    width: '100%',
    alignItems: 'center',
  },
  errorButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Modal de Éxito
  successModalView: {
    width: '85%',
    margin: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#7dd8ffff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2e24f1ff',
    marginBottom: 10,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  successButton: {
    backgroundColor: '#3799faff',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 15,
    width: '100%',
    alignItems: 'center',
  },
  successButtonText: {
    color: '#1a1a1a',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Modal de Advertencia
  warningModalView: {
    width: '85%',
    margin: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#ffcc00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  warningTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffcc00',
    marginBottom: 10,
    textAlign: 'center',
  },
  warningMessage: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  warningButton: {
    backgroundColor: '#ffcc00',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 15,
    width: '100%',
    alignItems: 'center',
  },
  warningButtonText: {
    color: '#1a1a1a',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

// --- ESTILOS PRINCIPALES ---
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