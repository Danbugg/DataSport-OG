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

export default function ProfileScreen({ route, navigation }) {
  const { userId } = route.params || {};

  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fondoLogin = require("../assets/fondoLogin.jpg");

  const fetchProfile = async () => {
    if (!userId || isNaN(userId)) {
      setLoading(false);
      Alert.alert("Error", "ID de usuario inválido. Por favor, inicia sesión de nuevo.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`http://10.0.2.2:3000/profile/${userId}`);

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
            <TouchableOpacity onPress={() => console.log('Configuración')}>
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => navigation.navigate('EditProfileScreen', { userId, userProfile })}
          >
            <Text style={styles.editButtonText}>Editar perfil</Text>
          </TouchableOpacity>
          
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
  }
});
