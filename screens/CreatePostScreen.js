import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ImageBackground,
    TextInput,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
    ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

const API_BASE_URL = "http://localhost:3000";

export default function CreatePostScreen({ navigation }) {
    const [content, setContent] = useState("");
    const [imageUri, setImageUri] = useState(null);
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
            aspect: [4, 3],
            quality: 0.7,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    const handleCreatePost = async () => {
        const userId = await AsyncStorage.getItem("userId");

        if (!userId || isNaN(userId)) {
            Alert.alert("Error", "ID de usuario no válido. Por favor, vuelve a iniciar sesión.");
            return;
        }

        if (content.trim().length === 0) {
            Alert.alert("Error", "El contenido de la publicación no puede estar vacío.");
            return;
        }

        setLoading(true);

        try {
            // 1. Crear FormData para enviar texto y archivo binario (imagen)
            const formData = new FormData();
            formData.append("userId", userId);
            formData.append("content", content.trim());

            if (imageUri) {
                // Obtenemos la extensión del archivo para el tipo y nombre
                const filename = imageUri.split('/').pop();
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image`;

                // 2. Adjuntar la imagen con el formato esperado por el backend
                formData.append("postImage", {
                    uri: imageUri,
                    type: type, // Usamos el tipo inferido o 'image' por defecto
                    name: filename, // Usamos el nombre real
                });
            }

            // 3. 🔥 Petición con la URL corregida 🔥
            const response = await fetch(`${API_BASE_URL}/posts/create`, {
                method: "POST",
                // Importante: No especificar Content-Type. FormData lo hace.
                body: formData, // Enviar el objeto FormData
            });

            if (response.ok) {
                Alert.alert("Éxito", "Publicación creada con éxito.");
                
                // Limpiar el formulario
                setContent("");
                setImageUri(null);

                // 🔄 CAMBIO CLAVE AQUÍ 🔄
                // Navegar a la pestaña 'HomeTab' (el Stack Navigator) y luego a la pantalla 'Feed'
                navigation.navigate('HomeTab', { 
                    screen: 'Feed', 
                    params: { shouldRefresh: true } 
                });
                
            } else {
                const textResponse = await response.text();
                // Intentamos manejar errores de Express y de la API
                if (textResponse.includes('Cannot POST')) {
                    Alert.alert("Error de Conexión/Ruta", "El servidor no encontró la ruta POST /posts/create. Asegúrate de que el servidor esté corriendo en la IP correcta.");
                } else {
                    try {
                        const errorData = JSON.parse(textResponse);
                        Alert.alert("Error", errorData.error || "Error al crear la publicación.");
                    } catch (e) {
                        // Muestra el error HTML de Express
                        Alert.alert("Error", `Respuesta de error no válida (posible error de servidor): ${textResponse.substring(0, 100)}...`);
                    }
                }
            }
        } catch (error) {
            console.error("Error al crear la publicación:", error);
            // Error de red más claro
            Alert.alert("Error de Conexión", "No se pudo conectar con el servidor. Revisa que el servidor Node.js esté activo en http://10.0.2.2:3000.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ImageBackground source={fondoLogin} style={styles.background}>
            <View style={styles.overlay}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Text style={styles.title}>Crear Nueva Publicación</Text>
                    
                    <TextInput
                        style={styles.contentInput}
                        placeholder="¿Qué quieres compartir con la comunidad DataSport?"
                        placeholderTextColor="#999"
                        multiline
                        numberOfLines={4}
                        value={content}
                        onChangeText={setContent}
                        maxLength={500}
                    />
                    <Text style={styles.charCount}>{content.length}/500</Text>

                    <TouchableOpacity style={styles.imageButton} onPress={pickImage} disabled={loading}>
                        <Ionicons name="image-outline" size={24} color="#00aaff" />
                        <Text style={styles.imageButtonText}>
                            {imageUri ? "Cambiar Imagen" : "Seleccionar Imagen (Opcional)"}
                        </Text>
                    </TouchableOpacity>

                    {imageUri && (
                        <View style={styles.imagePreviewContainer}>
                            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                            <TouchableOpacity style={styles.removeImageButton} onPress={() => setImageUri(null)}>
                                <Ionicons name="close-circle" size={30} color="#ff0000ff" />
                            </TouchableOpacity>
                        </View>
                    )}

                    <TouchableOpacity
                        style={styles.postButton}
                        onPress={handleCreatePost}
                        disabled={loading || content.trim().length === 0}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.postButtonText}>Publicar Ahora</Text>
                        )}
                    </TouchableOpacity>
                    
                </ScrollView>
            </View>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    background: { flex: 1, resizeMode: "cover" },
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.85)",
        paddingTop: 40,
        paddingHorizontal: 20,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 40,
    },
    title: {
        fontSize: 26,
        fontWeight: "bold",
        color: "#fff",
        textAlign: "center",
        marginBottom: 25,
    },
    contentInput: {
        width: "100%",
        minHeight: 120,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        borderRadius: 10,
        padding: 15,
        color: "#fff",
        fontSize: 16,
        textAlignVertical: "top",
        borderWidth: 1,
        borderColor: "#555",
    },
    charCount: {
        alignSelf: "flex-end",
        color: "#999",
        fontSize: 12,
        marginTop: 5,
        marginBottom: 20,
    },
    imageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: "rgba(0, 170, 255, 0.2)",
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#00aaff',
    },
    imageButtonText: {
        color: "#00aaff",
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    imagePreviewContainer: {
        marginBottom: 20,
        alignItems: 'center',
    },
    imagePreview: {
        width: '100%',
        height: 200,
        borderRadius: 10,
        resizeMode: 'cover',
    },
    removeImageButton: {
        position: 'absolute',
        top: 5,
        right: 5,
    },
    postButton: {
        backgroundColor: "#ff0000ff",
        paddingVertical: 15,
        borderRadius: 25,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 20,
    },
    postButtonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
    },
    
});
