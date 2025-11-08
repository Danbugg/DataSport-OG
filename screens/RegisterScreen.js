import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Modal,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Ionicons } from "@expo/vector-icons";

export default function RegisterScreen({ navigation }) {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [email, setEmail] = useState("");
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  // Estados para modales personalizados
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successName, setSuccessName] = useState('');

  const showDatePicker = () => setDatePickerVisibility(true);
  const hideDatePicker = () => setDatePickerVisibility(false);
  const handleConfirm = (date) => {
    const formatted = date.toISOString().split("T")[0];
    setFechaNacimiento(formatted);
    hideDatePicker();
  };

  const validatePassword = (password) => {
    const regex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._-])[A-Za-z\d@$!%*?&._-]{8,}$/;
    return regex.test(password);
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    if (!validatePassword(text)) {
      setPasswordError(
        "Debe tener: mínimo 8 caracteres, una mayúscula, una minúscula, un número y un símbolo."
      );
    } else {
      setPasswordError("");
    }
  };

  const handleRegister = async () => {
    // 🔹 Validaciones antes de enviar
    if (!nombre.trim()) {
      setErrorMessage("Por favor ingresa tu nombre");
      setErrorModalVisible(true);
      return;
    }
    if (!apellido.trim()) {
      setErrorMessage("Por favor ingresa tu apellido");
      setErrorModalVisible(true);
      return;
    }
    if (!fechaNacimiento) {
      setErrorMessage("Por favor selecciona tu fecha de nacimiento");
      setErrorModalVisible(true);
      return;
    }
    if (!email.trim()) {
      setErrorMessage("Por favor ingresa tu correo electrónico");
      setErrorModalVisible(true);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage("Por favor ingresa un correo electrónico válido");
      setErrorModalVisible(true);
      return;
    }

    if (!usuario.trim()) {
      setErrorMessage("Por favor elige un nombre de usuario");
      setErrorModalVisible(true);
      return;
    }
    if (!password.trim()) {
      setErrorMessage("Por favor ingresa una contraseña");
      setErrorModalVisible(true);
      return;
    }

    if (!validatePassword(password)) {
      setErrorMessage(
        "La contraseña debe tener:\n• Al menos 8 caracteres\n• Una mayúscula\n• Una minúscula\n• Un número\n• Un símbolo especial"
      );
      setErrorModalVisible(true);
      return;
    }

    // 🔹 Envío al servidor
    setLoading(true);
    const serverUrl = "http://localhost:3000/register";

    try {
      const response = await fetch(serverUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          apellido,
          fecha_nacimiento: fechaNacimiento,
          email,
          nombre_usuario: usuario,
          contrasena: password,
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (response.ok) {
        setSuccessName(`${nombre} ${apellido}`);
        setSuccessMessage("¡Tu cuenta ha sido creada exitosamente! Ya puedes iniciar sesión.");
        setSuccessModalVisible(true);
      } else {
        // 🔹 Manejo de errores que manda el backend
        if (data.error && data.error.toLowerCase().includes("correo")) {
          setErrorMessage("El correo ya existe. Por favor usa otro correo electrónico.");
        } else if (data.error && data.error.toLowerCase().includes("usuario")) {
          setErrorMessage("El nombre de usuario ya existe. Por favor elige otro.");
        } else {
          setErrorMessage(data.error || "Ocurrió un error en el servidor.");
        }
        setErrorModalVisible(true);
      }
    } catch (error) {
      console.error("Error de conexión:", error);
      setErrorMessage("No se pudo conectar con el servidor. Verifica tu conexión.");
      setErrorModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const fondoRegister = require("../assets/fondoRegister.jpg");

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
          
          <Text style={modalStyles.errorTitle}>Error de Registro</Text>
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
      onRequestClose={() => {
        setSuccessModalVisible(false);
        navigation.navigate("LoginScreen");
      }}
    >
      <TouchableOpacity 
        style={modalStyles.centeredView} 
        activeOpacity={1}
        onPress={() => {
          setSuccessModalVisible(false);
          navigation.navigate("LoginScreen");
        }}
      >
        <View style={modalStyles.successModalView}>
          <Ionicons name="checkmark-circle" size={60} color="#002affff" style={{ marginBottom: 15 }} />
          
          <Text style={modalStyles.successTitle}>¡Bienvenido/a {successName}!</Text>
          <Text style={modalStyles.successMessage}>{successMessage}</Text>

          <TouchableOpacity
            style={modalStyles.successButton}
            onPress={() => {
              setSuccessModalVisible(false);
              navigation.navigate("LoginScreen");
            }}
          >
            <Text style={modalStyles.successButtonText}>Ir a Iniciar Sesión</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <ImageBackground source={fondoRegister} style={styles.background}>
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
              <Text style={styles.title}>Nueva cuenta</Text>
              <Text style={styles.subtitle}>
                ¿Ya tienes cuenta?{" "}
                <Text
                  style={styles.link}
                  onPress={() => navigation.navigate("LoginScreen")}
                >
                  Inicia sesión
                </Text>
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Nombre *"
                placeholderTextColor="#555555ff"
                value={nombre}
                onChangeText={setNombre}
              />
              <TextInput
                style={styles.input}
                placeholder="Apellido *"
                placeholderTextColor="#555555ff"
                value={apellido}
                onChangeText={setApellido}
              />
              <TouchableOpacity style={styles.input} onPress={showDatePicker}>
                <Text style={{ color: fechaNacimiento ? "#000" : "#555" }}>
                  {fechaNacimiento || "Fecha de nacimiento (AAAA-MM-DD) *"}
                </Text>
              </TouchableOpacity>

              <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                onConfirm={handleConfirm}
                onCancel={hideDatePicker}
              />

              <TextInput
                style={styles.input}
                placeholder="Email *"
                placeholderTextColor="#555555ff"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Nombre de usuario *"
                placeholderTextColor="#555555ff"
                value={usuario}
                onChangeText={setUsuario}
                autoCapitalize="none"
              />

              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0, borderWidth: 0 }]}
                  placeholder="Password *"
                  placeholderTextColor="#555555ff"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={handlePasswordChange}
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
              {passwordError ? (
                <Text style={styles.errorText}>{passwordError}</Text>
              ) : null}

              <TouchableOpacity
                style={[styles.button, loading && { opacity: 0.7 }]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#0033ffff" />
                ) : (
                  <Text style={styles.buttonText}>Regístrate</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      {/* Modales personalizados */}
      <ErrorModal />
      <SuccessModal />
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
});

// --- ESTILOS PRINCIPALES ---
const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: "cover",
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  formContainer: {
    backgroundColor: "#9ac4ff7c",
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 25,
    width: "90%",
    alignItems: "center",
  },
  logo: { fontSize: 32, fontWeight: "bold", color: "#000" },
  sport: { color: "#0033ffff" },
  title: { fontSize: 26, fontWeight: "bold", color: "#fff", marginTop: 5, marginBottom: 5 },
  subtitle: { fontSize: 14, color: "#fff", marginBottom: 20 },
  link: { color: "#fff", fontWeight: "bold" },
  input: {
    width: "100%",
    height: 50,
    borderColor: "#afcfffff",
    borderWidth: 1,
    borderRadius: 25,
    marginBottom: 15,
    paddingHorizontal: 20,
    justifyContent: "center",
    backgroundColor: "#ffffff88",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    borderColor: "#afcfffff",
    borderWidth: 1,
    borderRadius: 25,
    marginBottom: 15,
    backgroundColor: "#ffffff88",
    paddingRight: 10,
  },
  eyeButton: {
    padding: 8,
  },
  button: {
    width: "100%",
    backgroundColor: "#2b8aff83",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#ffffffff", fontSize: 18, fontWeight: "bold" },
  errorText: { color: "red", fontSize: 12, marginBottom: 10, textAlign: "center" },
});