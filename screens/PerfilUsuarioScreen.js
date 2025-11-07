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
    StatusBar,
} from "react-native";
import { useFocusEffect, useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Usaremos la URL de IP local (AJUSTA ESTO SI USAS EMULADOR/DISPOSITIVO REAL)
const API_BASE_URL = "http://localhost:3000"; 

const { width } = Dimensions.get('window');

// --- Componente de Tarjeta de Publicación (PostCard) ---
const PostCard = ({ post, navigation, onLikeToggle }) => {
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
        }
    };

    const navigateToComments = () => {
        navigation.navigate('CommentsScreen', { postId: post.id });
    };

    return (
        <View style={postStyles.postCard}> 
            <View style={postStyles.postHeader}>
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
            
            <View style={postStyles.postActions}>
                {/* Botón de Like */}
                <TouchableOpacity onPress={handleLike} style={postStyles.actionButton}>
                    <Ionicons 
                        name={isLiked ? "heart" : "heart-outline"} 
                        size={24} 
                        color={isLiked ? "#ff0000" : "#eee"} // Estilo del Home/Perfil
                    />
                    <Text style={postStyles.actionText}>{likeCount}</Text>
                </TouchableOpacity>

                {/* Botón de Comentarios */}
                <TouchableOpacity onPress={navigateToComments} style={postStyles.actionButton}>
                    <Ionicons 
                        name="chatbubble-outline" 
                        size={24} 
                        color="#00aaff" // Estilo del Home/Perfil
                    />
                    <Text style={postStyles.actionText}>{post.commentCount || 0}</Text>
                </TouchableOpacity>
            </View>

            <Text style={postStyles.postDate}>{new Date(post.createdAt).toLocaleDateString()}</Text>
        </View>
    );
};


// --- Componente PRINCIPAL PerfilUsuarioScreen ---
export default function PerfilUsuarioScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    
    const viewingUserId = route.params?.itemId; 

    const [userProfile, setUserProfile] = useState(null);
    const [userPosts, setUserPosts] = useState([]);
    const [currentLoggedInId, setCurrentLoggedInId] = useState(null); 
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false); 
    
    const fondoLogin = require("../assets/fondoLogin.jpg"); 

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


    const fetchUserPosts = async (id, loggedInId) => {
        try {
            // AÑADIDO: Log para depuración de la URL de posts
            console.log(`[POSTS DEBUG] Solicitando posts para ID: ${id}. Usuario actual: ${loggedInId}`);
            const response = await fetch(`${API_BASE_URL}/profile/${id}/posts?currentUserId=${loggedInId}`);
            
            if (response.ok) {
                const data = await response.json();
                setUserPosts(data.posts || []); 
            } else {
                // Si la respuesta HTTP no es ok, el servidor pudo enviar el error 42601 aquí
                console.error(`[POSTS DEBUG] Error HTTP al cargar posts: ${response.status}`);
                console.log("No se pudieron cargar las publicaciones del usuario.");
                setUserPosts([]);
            }
        } catch (error) {
            console.error("Error de conexión al obtener posts:", error);
            setUserPosts([]);
        }
    };


    const handleFollowToggle = async () => {
        if (!currentLoggedInId) {
            Alert.alert("Error", "Debes iniciar sesión para seguir a otros usuarios.");
            return;
        }
        
        const followedId = viewingUserId; 
        const followerId = currentLoggedInId;

        const endpoint = isFollowing ? `unfollow/${followedId}` : `follow/${followedId}`;
        const method = isFollowing ? 'DELETE' : 'POST';
        
        // AÑADIDO: Log para depuración de follow
        console.log(`[FOLLOW DEBUG] Intento: ${method} ${API_BASE_URL}/${endpoint} con followerId: ${followerId}`);
        
        setIsFollowing(!isFollowing);

        try {
            const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ followerId: Number(followerId) }), 
            });

            if (!response.ok) {
                setIsFollowing(prev => !prev); 
                const errorData = await response.json().catch(() => ({}));
                Alert.alert("Error", errorData.error || `Error al ${isFollowing ? 'dejar de seguir' : 'seguir'}.`);
            }

        } catch (error) {
            console.error("Error de red en follow/unfollow:", error);
            setIsFollowing(prev => !prev); 
            Alert.alert("Error de Conexión", "No se pudo conectar al servidor para realizar la acción de seguimiento.");
        }
    };


    const fetchProfile = async () => {
        setLoading(true);

        const loggedId = await AsyncStorage.getItem("userId");
        setCurrentLoggedInId(loggedId); 
        
        // AÑADIDO: Logs CLAVE para IDs
        console.log("=====================================");
        console.log(`[ID DEBUG] Usuario logueado (AsyncStorage): ${loggedId}`);
        console.log(`[ID DEBUG] Usuario del perfil (Route params): ${viewingUserId}`);
        console.log("=====================================");


        if (!viewingUserId) {
            setLoading(false);
            Alert.alert("Error", "ID de usuario a visualizar no encontrado.");
            return;
        }

        const apiUrl = `${API_BASE_URL}/profile/${viewingUserId}`;
        let success = false;

        try {
            // 1. Obtener datos del perfil
            const profileResponse = await fetch(apiUrl);
            
            if (!profileResponse.ok) {
                Alert.alert("Error", `Error HTTP ${profileResponse.status} al cargar perfil.`);
                return;
            }

            const data = await profileResponse.json();
            const profileData = { ...data.user, id_usuario: String(data.user.id_usuario), descripcion: data.user.descripcion || '' };
            setUserProfile(profileData);
            success = true;

            // 2. Obtener el estado inicial de seguimiento (SOLO SI loggedId existe)
            if (loggedId) { 
                const followUrl = `${API_BASE_URL}/isFollowing/${viewingUserId}?followerId=${loggedId}`; 
                
                const followResponse = await fetch(followUrl);
                
                if (followResponse.ok) {
                    const followData = await followResponse.json();
                    setIsFollowing(followData.isFollowing);
                } else {
                    console.error("Error al obtener estado de seguimiento. Respuesta HTTP:", followResponse.status);
                    setIsFollowing(false);
                }
            } else {
                setIsFollowing(false); // No hay usuario logueado, no puede seguir
            }
            
            // 3. Obtener publicaciones
            if (success) {
                await fetchUserPosts(viewingUserId, loggedId);
            }

        } catch (error) {
            console.error("FATAL ERROR:", error);
            Alert.alert("Error de Conexión", `Asegúrate que el servidor esté corriendo en ${API_BASE_URL}`);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchProfile();
        }, [viewingUserId]) 
    );
    
    const isOwnProfile = String(viewingUserId) === String(currentLoggedInId);


    // --- Renderizado de Carga/Error ---
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.85)" />
                <ActivityIndicator size="large" color="#ff0000ff" />
                <Text style={{ marginTop: 10, color: '#fff' }}>Cargando perfil y publicaciones...</Text>
            </View>
        );
    }

    if (!userProfile) {
        return (
            <View style={styles.errorContainer}>
                <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.85)" />
                <Text style={{ color: '#fff' }}>No se pudo cargar la información del usuario.</Text>
            </View>
        );
    }

    // --- Renderizado Principal ---
    return (
        <ImageBackground source={fondoLogin} style={styles.background}>
            {/* Aseguramos que la barra de estado sea oscura para que el texto sea blanco */}
            <StatusBar barStyle="light-content" backgroundColor="black" /> 

            <View style={styles.overlay}>
                <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                    <View style={styles.profileHeader}>
                        
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={28} color="#fff" />
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={styles.profileInfo}>
                                <Image
                                    source={{ uri: userProfile.foto_perfil || 'https://i.imgur.com/k6KxI1x.png' }}
                                    style={styles.profileImage}
                                />
                                <View style={styles.userInfoText}>
                                    <Text style={styles.usernameText}>@{userProfile.nombre_usuario}</Text>
                                    <Text style={styles.userStatus}>{userProfile.descripcion || 'Sin descripción'}</Text>
                                </View>
                            </View>
                        </View>
                        
                        {/* BOTÓN DE SEGUIR/SEGUIR (solo si NO es tu perfil) */}
                        {!isOwnProfile ? (
                            <TouchableOpacity 
                                onPress={handleFollowToggle}
                                style={[
                                    styles.followButton, 
                                    { backgroundColor: isFollowing ? '#333' : '#00aaff' }
                                ]}
                            >
                                <Text style={styles.followButtonText}>
                                    {isFollowing ? 'Siguiendo' : 'Seguir'}
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity onPress={() => navigation.navigate('AjustesPerfil')} style={{ marginLeft: 'auto' }}>
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

// --- ESTILOS ---

// --- Estilos de la Tarjeta de Publicación (PostCard) ---
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


// --- Estilos Principales de la Pantalla ---
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
        // Ajustado para que el contenido empiece desde la parte superior real
        marginTop: 15, 
        paddingTop: StatusBar.currentHeight + 10, // Añade padding dinámico para el StatusBar
        position: 'relative',
    },
    backButton: {
        position: 'absolute',
        left: -15, 
        top: StatusBar.currentHeight, // Ajusta la posición del botón de retroceso con el StatusBar
        zIndex: 10,
        padding: 10,
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
        flexShrink: 1,
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
    loadingContainer: {
        flex: 1, 
        justifyContent: "center", 
        alignItems: "center", 
        backgroundColor: 'rgba(0,0,0,0.85)'
    },
    errorContainer: {
        flex: 1, 
        justifyContent: "center", 
        alignItems: "center", 
        backgroundColor: 'rgba(0,0,0,0.85)'
    },
    followButton: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
        marginLeft: 10,
    },
    followButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    }
});