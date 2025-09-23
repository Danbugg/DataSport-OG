import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
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

  const showDatePicker = () => setDatePickerVisibility(true);
  const hideDatePicker = () => setDatePickerVisibility(false);
  const handleConfirm = (date) => {
    const formatted = date.toISOString().split("T")[0];
    setFechaNacimiento(formatted);
    hideDatePicker();
  };

  // Validación de contraseña
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
    // Validaciones personalizadas
    if (!nombre.trim()) {
      Alert.alert("Error", "Por favor ingresa tu nombre");
      return;
    }
    if (!apellido.trim()) {
      Alert.alert("Error", "Por favor ingresa tu apellido");
      return;
    }
    if (!fechaNacimiento) {
      Alert.alert("Error", "Por favor selecciona tu fecha de nacimiento");
      return;
    }
    if (!email.trim()) {
      Alert.alert("Error", "Por favor ingresa tu correo electrónico");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Por favor ingresa un correo electrónico válido");
      return;
    }
    if (!usuario.trim()) {
      Alert.alert("Error", "Por favor elige un nombre de usuario");
      return;
    }
    if (!password.trim()) {
      Alert.alert("Error", "Por favor ingresa una contraseña");
      return;
    }
    if (!validatePassword(password)) {
      Alert.alert(
        "Contraseña insegura",
        "La contraseña debe tener:\n• Al menos 8 caracteres\n• Una mayúscula\n• Una minúscula\n• Un número\n• Un símbolo especial"
      );
      return;
    }

    setLoading(true);
    const serverUrl = "http://10.0.2.2:3000/register";

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
        Alert.alert("Registro exitoso", `Bienvenido/a ${nombre} ${apellido}`, [
          { text: "OK", onPress: () => navigation.navigate("LoginScreen") },
        ]);
      } else {
        Alert.alert(
          "Error de registro",
          data.error || "Ocurrió un error en el servidor."
        );
      }
    } catch (error) {
      console.error("Error de conexión:", error);
      Alert.alert("Error de Conexión", "No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const fondoRegister = require("../assets/fondoRegister.jpg");

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

              {/* Campo de contraseña con ojito */}
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
    </ImageBackground>
  );
}

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
