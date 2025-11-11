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

const API_BASE_URL = "http://localhost:3000"; 

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
      quality: 0.7,
    });

    if (!result.canceled) {
      setNewPhotoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setLoading(true);

    const isNewImage = newPhotoUri && !newPhotoUri.startsWith("http");
    let endpoint = `${API_BASE_URL}/profile/${userId}`;
    let method = "PUT";
    let headers = {};
    let body;

    if (isNewImage) {
      const formData = new FormData();
      formData.append("descripcion", newDescription);

      const filename = newPhotoUri.split("/").pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;

      formData.append("profileImage", {
        uri: newPhotoUri,
        type: type,
        name: filename,
      });
      body = formData;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify({
        descripcion: newDescription,
        foto_perfil: newPhotoUri || userProfile.foto_perfil,
      });
    }

    try {
      const response = await fetch(endpoint, {
        method: method,
        headers: headers,
        body: body,
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Éxito", "Perfil actualizado correctamente.");

        const finalPhotoUri = data.user.foto_perfil;

        const updatedProfile = {
          ...userProfile,
          foto_perfil: finalPhotoUri,
          descripcion: newDescription,
        };

        navigation.navigate("MainTabs", {
          screen: "Perfil",
          params: {
            userId,
            userProfile: updatedProfile,
          },
        });
      } else {
        console.error("Error del servidor al guardar:", data);
        Alert.alert("Error del Servidor", data.error || "No se pudo actualizar el perfil.");
      }
    } catch (error) {
      console.error("Error al actualizar el perfil:", error);
      Alert.alert(
        "Error de Conexión",
        "Error de red. Asegúrate de que el servidor esté activo en http://localhost:3000."
      );
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
              source={{ uri: newPhotoUri || "https://i.imgur.com/k6KxI1x.png" }}
              style={styles.profileImage}
              onError={(e) =>
                console.log("❌ Error al cargar imagen:", newPhotoUri, e.nativeEvent.error)
              }
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
