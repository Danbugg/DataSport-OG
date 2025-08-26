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

export default function RegisterScreen({ navigation }) {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [email, setEmail] = useState("");
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const showDatePicker = () => setDatePickerVisibility(true);
  const hideDatePicker = () => setDatePickerVisibility(false);
  const handleConfirm = (date) => {
    const formatted = date.toISOString().split("T")[0];
    setFechaNacimiento(formatted);
    hideDatePicker();
  };

  const handleRegister = async () => {
    if (!nombre || !apellido || !fechaNacimiento || !email || !usuario || !password) {
      Alert.alert("Error", "Por favor completa todos los campos");
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
        Alert.alert("Error de registro", data.error || "Ocurrió un error en el servidor.");
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
                <Text style={styles.link} onPress={() => navigation.navigate("LoginScreen")}>
                  Inicia sesión
                </Text>
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Nombre"
                placeholderTextColor="#555555ff"
                value={nombre}
                onChangeText={setNombre}
              />
              <TextInput
                style={styles.input}
                placeholder="Apellido"
                placeholderTextColor="#555555ff"
                value={apellido}
                onChangeText={setApellido}
              />
              <TouchableOpacity style={styles.input} onPress={showDatePicker}>
                <Text style={{ color: fechaNacimiento ? "#000" : "#555" }}>
                  {fechaNacimiento || "Fecha de nacimiento (YYYY-MM-DD)"}
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
                placeholder="Email"
                placeholderTextColor="#555555ff"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Nombre de usuario"
                placeholderTextColor="#555555ff"
                value={usuario}
                onChangeText={setUsuario}
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#555555ff"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

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
  background: { flex: 1, resizeMode: "cover", justifyContent: "center", alignItems: "center" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", width: "100%", justifyContent: "center", alignItems: "center" },
  formContainer: { backgroundColor: "#9ac4ff7c", marginHorizontal: 20, borderRadius: 20, padding: 25, width: "90%", alignItems: "center" },
  logo: { fontSize: 32, fontWeight: "bold", color: "#000" },
  sport: { color: "#0033ffff" },
  title: { fontSize: 26, fontWeight: "bold", color: "#fff", marginTop: 5, marginBottom: 5 },
  subtitle: { fontSize: 14, color: "#fff", marginBottom: 20 },
  link: { color: "#fff", fontWeight: "bold" },
  input: { width: "100%", height: 50, borderColor: "#afcfffff", borderWidth: 1, borderRadius: 25, marginBottom: 15, paddingHorizontal: 20, justifyContent: "center", backgroundColor: "#ffffff88" },
  button: { width: "100%", backgroundColor: "#2b8aff83", padding: 15, borderRadius: 25, alignItems: "center", marginTop: 10 },
  buttonText: { color: "#ffffffff", fontSize: 18, fontWeight: "bold" },
});
