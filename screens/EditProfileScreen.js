import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker"; 

export default function EditProfileScreen({ route, navigation }) {
  const { userId, userProfile } = route.params;

  const [newPhotoUri, setNewPhotoUri] = useState(userProfile.foto_perfil);
  const [newDescription, setNewDescription] = useState(userProfile.descripcion || "");
  const [loading, setLoading] = useState(false);

  const fondoLogin = require("../assets/fondoLogin.jpg");

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permiso denegado",
        "Necesitamos permiso para acceder a tu galería de fotos."
      );
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setNewPhotoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      const response = await fetch(`http://192.168.1.6:3000/profile/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          foto_perfil: newPhotoUri,
          descripcion: newDescription,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Éxito", "Perfil actualizado correctamente.");
        navigation.navigate("HomeScreen", { userId, userProfile: { ...userProfile, foto_perfil: newPhotoUri, descripcion: newDescription } });
      } else {
        Alert.alert("Error", data.error || "No se pudo actualizar el perfil.");
      }
    } catch (error) {
      console.error("Error al actualizar el perfil:", error);
      Alert.alert("Error", "Error de conexión al servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground source={fondoLogin} style={styles.background}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Editar perfil</Text>

          <TouchableOpacity onPress={pickImage}>
            <Image
              source={{ uri: newPhotoUri || 'https://i.imgur.com/k6KxI1x.png' }}
              style={styles.profileImage}
            />
            <View style={styles.cameraIconContainer}>
              <Text style={styles.cameraIcon}>📷</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.username}>{userProfile.nombre_usuario}</Text>
         

          <TextInput
            style={styles.descriptionInput}
            onChangeText={setNewDescription}
            value={newDescription}
            placeholder="Escribe una descripción..."
            placeholderTextColor="#999"
            multiline
            maxLength={150}
          />
          <Text style={styles.charCount}>{newDescription.length}/150</Text>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Guardar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    alignItems: "center",
    padding: 20,
    width: "90%",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#fff",
  },
  cameraIconContainer: {
    position: "absolute",
    bottom: 5,
    right: 5,
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 5,
  },
  cameraIcon: {
    fontSize: 20,
  },
  username: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 10,
  },
  notEditableText: {
    fontSize: 12,
    color: "#999",
    marginBottom: 20,
  },
  descriptionInput: {
    width: "100%",
    minHeight: 80,
    borderColor: "#555",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    color: "#fff",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    textAlignVertical: "top",
  },
  charCount: {
    alignSelf: "flex-end",
    color: "#999",
    fontSize: 12,
    marginTop: 5,
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: "#00aaff",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
