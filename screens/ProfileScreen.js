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
    FlatList,
    Dimensions,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Usaremos la URL de IP local (asumiendo que estás usando el emulador de Android)
const API_BASE_URL = "http://localhost:3000"; 

const { width } = Dimensions.get('window');

// --- ESTILOS DE LA TARJETA PROFESIONAL (REUTILIZADOS DEL HOME) ---
const POST_IMAGE_WIDTH = width - 40; 
const postStyles = StyleSheet.create({
    postCard: {
        backgroundColor: '#1a1a1a', 
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        width: '100%',
        shadowColor: '#ffffff', 
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1, 
        shadowRadius: 3,
        elevation: 3,
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    authorImage: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        marginRight: 10,
        borderWidth: 2,
        borderColor: '#00aaff',
    },
    authorUsername: {
        color: '#00aaff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    postContent: {
        color: '#eee',
        fontSize: 16,
        lineHeight: 22,
        marginBottom: 10,
    },
    postImage: {
        width: '100%',
        height: 250, 
        borderRadius: 8,
        marginBottom: 10,
        resizeMode: 'cover',
    },
    postDate: {
        color: '#888',
        fontSize: 12,
        textAlign: 'right',
    },
    postActions: { 
        flexDirection: 'row',
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: '#333',
        marginBottom: 5,
    },
    actionButton: { 
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 20,
        padding: 5,
    },
    actionText: { 
        color: '#eee',
        fontSize: 14,
        marginLeft: 5,
        fontWeight: '600',
    },
});


// --- Componente de Tarjeta de Publicación (FUNCIONAL Y REUTILIZADO) ---
const PostCard = ({ post, navigation, onLikeToggle }) => {
    // El estado del like y el conteo deben ser locales
    const [isLiked, setIsLiked] = useState(post.isLikedByCurrentUser || false);
    const [likeCount, setLikeCount] = useState(post.likeCount || 0);

    const handleLike = async () => {
        const newIsLiked = !isLiked;
        const newLikeCount = newIsLiked ? likeCount + 1 : likeCount - 1;

        setIsLiked(newIsLiked);
        setLikeCount(newLikeCount);

        const success = await onLikeToggle(post.id, newIsLiked);

        if (!success) {
            setIsLiked(!newIsLiked);
            setLikeCount(newIsLiked ? likeCount - 1 : likeCount + 1);
            Alert.alert("Error", "No se pudo registrar tu 'Me gusta'.");
        }
    };

    const navigateToComments = () => {
        // Usa la navegación anidada para ir a Comments (HomeTab -> Comments)
        navigation.navigate('HomeTab', {
            screen: 'Comments',
            params: { postId: post.id },
        });
    };

    return (
        <View style={postStyles.postCard}> 
            <View style={postStyles.postHeader}>
                {/* Se muestra el autor, que en este caso es el dueño del perfil */}
                <Image
                    source={{ uri: post.authorProfilePic || 'https://i.imgur.com/k6KxI1x.png' }}
                    style={postStyles.authorImage}
                />
                <Text style={postStyles.authorUsername}>{post.authorUsername || 'Usuario Desconocido'}</Text>
            </View>
            <Text style={postStyles.postContent}>{post.content}</Text>
            {post.imageUrl && (
                <Image 
                    source={{ uri: post.imageUrl }} 
                    style={postStyles.postImage} 
                    onError={() => console.log('Error al cargar imagen de la publicación')}
                />
            )}
            
            {/* --- SECCIÓN DE ACCIONES (LIKES Y COMENTARIOS) --- */}
            <View style={postStyles.postActions}>
                {/* Botón de Like */}
                <TouchableOpacity onPress={handleLike} style={postStyles.actionButton}>
                    <Ionicons 
                        name={isLiked ? "heart" : "heart-outline"} 
                        size={24} 
                        color={isLiked ? "#ff0000" : "#eee"} 
                    />
                    <Text style={postStyles.actionText}>{likeCount}</Text>
                </TouchableOpacity>

                {/* Botón de Comentarios */}
                <TouchableOpacity onPress={navigateToComments} style={postStyles.actionButton}>
                    <Ionicons 
                        name="chatbubble-outline" 
                        size={24} 
                        color="#00aaff"
                    />
                    <Text style={postStyles.actionText}>{post.commentCount || 0}</Text>
                </TouchableOpacity>
            </View>
            {/* ---------------------------------------------------- */}

            <Text style={postStyles.postDate}>{new Date(post.createdAt).toLocaleDateString()}</Text>
        </View>
    );
};


// --- Componente Principal ProfileScreen ---
export default function ProfileScreen({ route, navigation }) {
    const { userId: routeUserId } = route.params || {};

    const [userProfile, setUserProfile] = useState(null);
    const [userPosts, setUserPosts] = useState([]);
    // Inicializamos currentLoggedInId a null y usamos string para consistencia
    const [currentLoggedInId, setCurrentLoggedInId] = useState(null); 
    const [loading, setLoading] = useState(true);
    const [currentViewingId, setCurrentViewingId] = useState(null); 
    
    const fondoLogin = require("../assets/fondoLogin.jpg");

    // Función para manejar el like/unlike en el backend 
    const handleLikeToggle = useCallback(async (postId, newIsLiked) => {
        if (!currentLoggedInId) {
            Alert.alert("Error", "Debes iniciar sesión para dar 'Me gusta'.");
            return false;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/posts/${postId}/like`, {
                method: newIsLiked ? "POST" : "DELETE",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentLoggedInId }),
            });

            if (response.ok) {
                return true;
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error("Error del API al dar like:", errorData);
                return false;
            }
        } catch (error) {
            console.error("Error de red al dar like:", error);
            return false;
        }
    }, [currentLoggedInId]);

    // Función para obtener las publicaciones del usuario (Modificada para métricas)
    const fetchUserPosts = async (id, loggedInId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/profile/${id}/posts?currentUserId=${loggedInId}`);
            
            if (response.ok) {
                const data = await response.json();
                setUserPosts(data.posts || []); 
            } else {
                console.log("No se pudieron cargar las publicaciones del usuario.");
                setUserPosts([]);
            }
        } catch (error) {
            console.error("Error de conexión al obtener posts:", error);
            setUserPosts([]);
        }
    };

    const fetchProfile = async () => {
        setLoading(true);

        // 1. Determinar el ID del usuario logueado (para likes)
        const loggedId = await AsyncStorage.getItem("userId");
        setCurrentLoggedInId(loggedId); // Guardado como string

        // 2. Determinar el ID del perfil a ver
        const finalUserId = routeUserId || loggedId;
        setCurrentViewingId(finalUserId);

        if (!finalUserId) {
            setLoading(false);
            Alert.alert("Error", "ID de usuario inválido. Por favor, inicia sesión de nuevo.");
            return;
        }

        let success = false;

        try {
            // 3. Obtener datos del perfil
            const profileResponse = await fetch(`${API_BASE_URL}/profile/${finalUserId}`);

            if (profileResponse.ok) {
                const data = await profileResponse.json();
                // 💡 CLAVE: Aseguramos que el ID de la base de datos se convierta a STRING si es necesario
                const profileData = { 
                    ...data.user, 
                    id_usuario: String(data.user.id_usuario), // Asegurar que sea string
                    descripcion: data.user.descripcion || '' 
                };
                setUserProfile(profileData);
                success = true;
            } else {
                const data = await profileResponse.json().catch(() => ({}));
                Alert.alert("Error", data.error || "No se pudo cargar el perfil.");
            }

            // 4. Obtener publicaciones con métricas
            if (success) {
                // Pasamos finalUserId (que puede ser string o el valor que vino de routeUserId) y loggedId (string)
                await fetchUserPosts(finalUserId, loggedId);
            }

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
        }, [routeUserId]) 
    );
    
    // --- Lógica de Manejo de Cuenta (Funciones de ejemplo) ---
    // 💡 CLAVE: Convertimos currentViewingId a string antes de comparar
    const isOwnProfile = String(currentViewingId) === String(currentLoggedInId);

    const handleDeleteAccount = async () => {
        const idToDelete = await AsyncStorage.getItem("userId");
        if (!idToDelete) {
            Alert.alert("Error", "No se encontró el ID de usuario para eliminar.");
            return;
        }
        
        Alert.alert(
            "Eliminar Cuenta",
            "¿Estás seguro de que quieres eliminar tu cuenta? Esta acción es irreversible.",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const response = await fetch(`${API_BASE_URL}/delete-account/${idToDelete}`, {
                                method: "DELETE",
                            });

                            if (response.ok) {
                                Alert.alert("¡Hecho!", "Tu cuenta ha sido eliminada con éxito.");
                                await AsyncStorage.clear();
                                navigation.replace('LoginScreen');
                            } else {
                                const errorData = await response.json().catch(() => ({}));
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
        if (!isOwnProfile) return; // Solo mostrar si es el perfil propio

        Alert.alert(
            "Opciones",
            "Selecciona una opción",
            [
                {
                    text: "Editar Perfil",
                    onPress: () => navigation.navigate('EditProfileScreen', { userId: currentLoggedInId, userProfile }),
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
    // -----------------------------------------------------------------


    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ff0000ff" />
                <Text style={{ marginTop: 10, color: '#fff' }}>Cargando perfil y publicaciones...</Text>
            </View>
        );
    }

    if (!userProfile) {
        return (
            <View style={styles.errorContainer}>
                <Text style={{ color: '#fff' }}>No se pudo cargar la información del usuario.</Text>
            </View>
        );
    }

    const usernameMarginLeft = 0; 

    return (
        <ImageBackground source={fondoLogin} style={styles.background}>
            <View style={styles.overlay}>
                <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                    <View style={styles.profileHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={[styles.profileInfo, { marginLeft: usernameMarginLeft }]}>
                                <Image
                                    source={{ uri: userProfile.foto_perfil || 'https://i.imgur.com/k6KxI1x.png' }}
                                    style={styles.profileImage}
                                />
                                <View style={styles.userInfoText}>
                                    <Text style={styles.usernameText}>{userProfile.nombre_usuario}</Text>
                                    <Text style={styles.userStatus}>{userProfile.descripcion || 'Sin descripción'}</Text>
                                </View>
                            </View>
                        </View>
                        
                        {/* 🟢 El botón de Ajustes ahora debería aparecer si isOwnProfile es true 🟢 */}
                        {isOwnProfile && (
                            <TouchableOpacity onPress={handleSettings}>
                                <Ionicons name="settings-outline" size={28} color="#fff" />
                            </TouchableOpacity>
                        )}
                        
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

                    <View style={styles.publicationsTitleContainer}>
                        <Text style={styles.publicationsTitle}>Publicaciones ({userPosts.length})</Text>
                    </View>
                    
                    <View style={styles.publicationsContainer}>
                        {userPosts.length > 0 ? (
                            <FlatList
                                data={userPosts}
                                keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                                renderItem={({ item }) => (
                                    <PostCard 
                                        post={item} 
                                        navigation={navigation} 
                                        onLikeToggle={handleLikeToggle}
                                    />
                                )}
                                scrollEnabled={false} 
                                ListEmptyComponent={() => (
                                    <Text style={styles.publicationsPlaceholder}>Aún no hay publicaciones</Text>
                                )}
                            />
                        ) : (
                            <Text style={styles.publicationsPlaceholder}>Aún no hay publicaciones</Text>
                        )}
                    </View>
                    
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
        paddingHorizontal: 20,
    },
    profileHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 40,
    },
    backButton: {
        // Posicionamiento para que no choque con el resto del contenido del header
        position: 'absolute',
        left: -20, 
        top: 0,
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
    publicationsTitleContainer: {
        borderBottomWidth: 2,
        borderBottomColor: '#ff0000ff',
        paddingBottom: 5,
        marginBottom: 15,
    },
    publicationsTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    publicationsContainer: {
        width: '100%',
        flexGrow: 1,
    },
    publicationsPlaceholder: {
        color: '#aaa',
        fontSize: 16,
        textAlign: 'center',
        paddingVertical: 30,
    },
    button: {
        width: "100%",
        backgroundColor: "#3c0404c1",
        padding: 12,
        borderRadius: 25,
        alignItems: "center",
        marginTop: 15,
        marginBottom: 20,
    },
    buttonText: { color: "#ffffffff", fontSize: 16, fontWeight: "bold" },
    loadingContainer: {
        flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: 'rgba(0,0,0,0.85)'
    },
    errorContainer: {
        flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: 'rgba(0,0,0,0.85)'
    },
});
