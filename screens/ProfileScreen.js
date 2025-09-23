import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ProfileScreen({ route, navigation }) {
  const { userId } = route.params || {};

  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fondoLogin = require("../assets/fondoLogin.jpg");

  const fetchProfile = async () => {
    const finalUserId = userId || (await AsyncStorage.getItem("userId"));

    if (!finalUserId || isNaN(finalUserId)) {
      setLoading(false);
      Alert.alert("Error", "ID de usuario inválido. Por favor, inicia sesión de nuevo.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`http://10.0.2.2:3000/profile/${finalUserId}`);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        Alert.alert("Error", data.error || "No se pudo cargar el perfil.");
        setLoading(false);
        return;
      }

      const data = await response.json();
      setUserProfile({ ...data.user, descripcion: data.user.descripcion || '' });
    } catch (error) {
      console.error("Error de conexión:", error);
      Alert.alert("Error", "Error al conectar con el servidor. Revisa tu IP y que el backend esté corriendo.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [userId])
  );

  const handleDeleteAccount = () => {
    Alert.alert(
      "Eliminar Cuenta",
      "¿Estás seguro de que quieres eliminar tu cuenta? Esta acción es irreversible y eliminará todos tus datos. Si deseas continuar, presiona 'Eliminar'.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            const idToDelete = await AsyncStorage.getItem("userId");
            if (!idToDelete) {
              Alert.alert("Error", "No se encontró el ID de usuario para eliminar.");
              return;
            }
            try {
              const response = await fetch(`http://10.0.2.2:3000/delete-account/${idToDelete}`, {
                method: "DELETE",
              });

              if (response.ok) {
                Alert.alert("¡Hecho!", "Tu cuenta ha sido eliminada con éxito.");
                await AsyncStorage.clear();
                navigation.replace('LoginScreen');
              } else {
                const errorData = await response.json();
                Alert.alert("Error", errorData.error || "No se pudo eliminar la cuenta.");
              }
            } catch (error) {
              console.error("Error al eliminar la cuenta:", error);
              Alert.alert("Error", "No se pudo conectar al servidor.");
            }
          },
        },
      ]
    );
  };

  const handleSettings = () => {
    Alert.alert(
      "Opciones",
      "Selecciona una opción",
      [
        {
          text: "Editar Perfil",
          onPress: () => navigation.navigate('EditProfileScreen', { userId, userProfile }),
        },
        {
          text: "Cerrar Sesión",
          onPress: async () => {
            await AsyncStorage.clear();
            navigation.replace('LoginScreen');
          }
        },
        {
          text: "Eliminar Cuenta",
          onPress: handleDeleteAccount,
          style: "destructive",
        },
        {
          text: "Cancelar",
          style: "cancel",
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff0000ff" />
        <Text style={{ marginTop: 10 }}>Cargando perfil...</Text>
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View style={styles.errorContainer}>
        <Text>No se pudo cargar la información del usuario.</Text>
      </View>
    );
  }

  return (
    <ImageBackground source={fondoLogin} style={styles.background}>
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View style={styles.profileHeader}>
            <View style={styles.profileInfo}>
              <Image
                source={{ uri: userProfile.foto_perfil || 'https://i.imgur.com/k6KxI1x.png' }}
                style={styles.profileImage}
              />
              <View style={styles.userInfoText}>
                <Text style={styles.usernameText}>{userProfile.nombre_usuario}</Text>
                <Text style={styles.userStatus}>{userProfile.descripcion || 'Sin descripción'}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleSettings}>
              <Ionicons name="settings-outline" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.profileDetailsContainer}>
            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Nombre: </Text>
              {userProfile.nombre} {userProfile.apellido}
            </Text>
            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Email: </Text>
              {userProfile.email}
            </Text>
          </View>

          <View style={styles.publicationsContainer}>
            <Text style={styles.publicationsPlaceholder}>Aquí irán las publicaciones</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, styles.logoutButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>Volver</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, justifyContent: "flex-start", alignItems: "center" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    width: "100%",
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 40,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#fff',
  },
  userInfoText: {
    marginLeft: 12,
  },
  usernameText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  userStatus: {
    fontSize: 15,
    color: '#00aaff',
    marginTop: 3,
  },
  settingsIcon: {
    fontSize: 28,
    color: '#fff',
  },
  editButton: {
    backgroundColor: '#0033ff',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 15,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  profileDetailsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  detailText: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 5,
  },
  detailLabel: {
    fontWeight: 'bold',
  },
  publicationsContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#111111',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center'
  },
  publicationsPlaceholder: {
    color: '#aaa',
    fontSize: 16,
  },
  button: {
    width: "100%",
    backgroundColor: "#3c0404c1",
    padding: 12,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 15,
  },
  buttonText: { color: "#ffffffff", fontSize: 16, fontWeight: "bold" },
  loadingContainer: {
    flex: 1, justifyContent: "center", alignItems: "center"
  },
  errorContainer: {
    flex: 1, justifyContent: "center", alignItems: "center"
  },
  deleteOption: {
    color: 'red',
    fontWeight: 'bold',
  }
});