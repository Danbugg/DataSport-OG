// screens/OlvidarContraScreen.js

import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function OlvidarContraScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const fondoLogin = require("../assets/fondoLogin.jpg");

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Por favor, ingresa tu correo electrónico.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://192.168.1.6:3000/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert('Éxito', data.message);
        setStep(2);
      } else {
        Alert.alert('Error', data.message || 'Error al solicitar el token.');
      }
    } catch (error) {
      console.error('Error en /forgot-password:', error);
      Alert.alert('Error', 'No se pudo conectar al servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyToken = async () => {
    if (!token) {
      Alert.alert('Error', 'Por favor, ingresa el token.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://192.168.1.6:3000/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert('Éxito', data.message);
        setStep(3);
      } else {
        Alert.alert('Error', data.message || 'Token inválido o expirado.');
      }
    } catch (error) {
      console.error('Error en /verify-token:', error);
      Alert.alert('Error', 'No se pudo conectar al servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden o están vacías.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://192.168.1.6:3000/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert('Éxito', data.message);
        navigation.navigate('LoginScreen');
      } else {
        Alert.alert('Error', data.message || 'No se pudo restablecer la contraseña.');
      }
    } catch (error) {
      console.error('Error en /reset-password:', error);
      Alert.alert('Error', 'No se pudo conectar al servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground source={fondoLogin} style={styles.background}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1, width: "100%" }}>
          <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>
              Recuperar <Text style={styles.sport}>Contraseña</Text>
            </Text>

            {/* Paso 1: Ingresar correo */}
            {step === 1 && (
              <View style={styles.formContainer}>
                <Text style={styles.subtitle}>Ingresa tu correo para recuperar la contraseña</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Correo electrónico"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={[styles.button, loading && { opacity: 0.7 }]}
                  onPress={handleForgotPassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Enviar</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Paso 2: Ingresar token */}
            {step === 2 && (
              <View style={styles.formContainer}>
                <Text style={styles.subtitle}>Ingresa el token que recibiste.</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Token de recuperación"
                  value={token}
                  onChangeText={setToken}
                  keyboardType="default"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={[styles.button, loading && { opacity: 0.7 }]}
                  onPress={handleVerifyToken}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Verificar Token</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Paso 3: Ingresar nueva contraseña */}
            {step === 3 && (
              <View style={styles.formContainer}>
                <Text style={styles.subtitle}>Establece tu nueva contraseña.</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="Nueva contraseña"
                    secureTextEntry={!showPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
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
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="Confirmar contraseña"
                    secureTextEntry={!showPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
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
                  onPress={handleResetPassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Restablecer</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Botón para volver */}
            <TouchableOpacity
              style={{ marginTop: 20 }}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.link}>Volver al inicio de sesión</Text>
            </TouchableOpacity>

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
  container: {
    flexGrow: 1,
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
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ff0000",
    marginBottom: 10,
  },
  sport: { color: "#fff" },
  subtitle: { fontSize: 14, color: "#fff", marginBottom: 20, textAlign: 'center' },
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
  link: { color: "#fff", fontWeight: "bold", textDecorationLine: 'underline' },
});