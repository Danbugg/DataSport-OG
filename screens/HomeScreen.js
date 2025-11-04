import React, { useState, useCallback } from "react";
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList,
    ActivityIndicator, 
    Alert, 
    Image,
    TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons"; // Importamos Ionicons para los íconos
import AsyncStorage from "@react-native-async-storage/async-storage"; // Necesario para obtener el userId

// ✅ CORRECCIÓN FINAL: Usamos la IP del host 10.0.2.2
const API_BASE_URL = "http://localhost:3000"; 
// ------------------------------------


// --- Componente de Tarjeta de Publicación (Modificado) ---
const PostCard = ({ post, navigation, onLikeToggle, currentUserId }) => {
    // Estado local para manejar si el usuario actual ya le dio like
    const [isLiked, setIsLiked] = useState(post.isLikedByCurrentUser || false);
    // Estado local para el conteo de likes (se actualiza al hacer toggle)
    const [likeCount, setLikeCount] = useState(post.likeCount || 0);

    const navigateToAuthorProfile = () => {
        if (post.authorId) {
            navigation.navigate('Profile', { userId: post.authorId }); 
        }
    };

    const handleLike = async () => {
        // Toggle de estado local inmediatamente para una respuesta rápida
        const newIsLiked = !isLiked;
        const newLikeCount = newIsLiked ? likeCount + 1 : likeCount - 1;

        setIsLiked(newIsLiked);
        setLikeCount(newLikeCount);

        // Llamar a la función del padre para la lógica del API
        const success = await onLikeToggle(post.id, newIsLiked);

        if (!success) {
            // Revertir el estado local si la llamada al API falla
            setIsLiked(!newIsLiked);
            setLikeCount(newIsLiked ? likeCount - 1 : likeCount + 1);
            Alert.alert("Error", "No se pudo registrar tu 'Me gusta'.");
        }
    };

    const navigateToComments = () => {
        // Navega a la nueva pantalla de Comentarios (debes crear esta ruta)
        navigation.navigate('Comments', { postId: post.id });
    };

    return (
        <View style={postStyles.postCard}> 
            <View style={postStyles.postHeader}>
                <Image
                    source={{ uri: post.authorProfilePic || 'https://i.imgur.com/k6KxI1x.png' }}
                    style={postStyles.authorImage}
                />
                <TouchableOpacity onPress={navigateToAuthorProfile}>
                    <Text style={postStyles.authorUsername}>{post.authorUsername || 'Usuario Desconocido'}</Text>
                </TouchableOpacity>
            </View>
            <Text style={postStyles.postContent}>{post.content}</Text>
            {post.imageUrl && (
                <Image 
                    source={{ uri: post.imageUrl }} 
                    style={postStyles.postImage} 
                    onError={(e) => { 
                        console.log('❌ Error al cargar imagen de la publicación (URL):', post.imageUrl);
                        console.log('RN Error:', e.nativeEvent.error);
                    }}
                />
            )}

            {/* --- SECCIÓN DE ACCIONES (LIKES Y COMENTARIOS) --- */}
            <View style={postStyles.postActions}>
                {/* Botón de Like */}
                <TouchableOpacity onPress={handleLike} style={postStyles.actionButton}>
                    <Ionicons 
                        name={isLiked ? "heart" : "heart-outline"} 
                        size={24} 
                        color={isLiked ? "#ff0000" : "#eee"} // Rojo para liked
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

// --- Estilos de la tarjeta (PostCard) con los nuevos estilos de acciones ---
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
    // ... estilos existentes
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
    // Nuevos estilos para la sección de acciones
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

// --- Componente Principal HomeScreen (Modificado) ---
export default function HomeScreen({ navigation }) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState(null); // Nuevo estado para el ID del usuario

    // Función para obtener el ID del usuario al cargar
    const getUserId = async () => {
        const id = await AsyncStorage.getItem("userId");
        setCurrentUserId(id);
    };

    // Función para manejar el like/unlike en el backend
    const handleLikeToggle = useCallback(async (postId, newIsLiked) => {
        if (!currentUserId) {
            Alert.alert("Error", "Debes iniciar sesión para dar 'Me gusta'.");
            return false;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/posts/${postId}/like`, {
                method: newIsLiked ? "POST" : "DELETE",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: currentUserId }),
            });

            if (response.ok) {
                return true;
            } else {
                const errorData = await response.json();
                console.error("Error del API al dar like:", errorData);
                return false;
            }
        } catch (error) {
            console.error("Error de red al dar like:", error);
            return false;
        }
    }, [currentUserId]); // Dependencia: currentUserId

    const fetchGlobalPosts = async () => {
        setLoading(true);
        try {
            await getUserId(); // Asegurarse de tener el ID del usuario
            
            // Incluimos el ID del usuario en los parámetros de la petición
            // Esto le permite al backend saber si el usuario actual ya dio like a cada post.
            const response = await fetch(`${API_BASE_URL}/posts?userId=${currentUserId}`); 

            if (response.ok) {
                const data = await response.json();
                setPosts(data.posts || []); 
            } else {
                Alert.alert("Error", "No se pudo cargar el feed de publicaciones.");
                setPosts([]);
            }
        } catch (error) {
            console.error("Error de conexión al obtener posts:", error);
            Alert.alert("Error de Conexión", "No se pudo conectar con el servidor.");
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            getUserId().then(() => {
                // Llama a fetchGlobalPosts una vez que el currentUserId esté disponible
                // La dependencia [currentUserId] en useEffect se encargará de esto si se usa.
                // Usaremos la dependencia en useCallback para más control.
            });
            fetchGlobalPosts();
        }, [currentUserId]) // El fetch se ejecuta cuando el userId cambia o al enfocar
    );

    const renderItem = ({ item }) => (
        <PostCard 
            post={item} 
            navigation={navigation} 
            onLikeToggle={handleLikeToggle} 
            currentUserId={currentUserId}
        />
    );
    
    return ( 
        <View style={styles.container}> 
            <View style={styles.header}>
                <Text style={styles.logo}>
                    Data<Text style={styles.sport}>Sport</Text>
                </Text>
                <Text style={styles.title}>Feed</Text>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#ff0000ff" />
                    <Text style={styles.loadingText}>Cargando feed...</Text>
                </View>
            ) : (
                <FlatList
                    data={posts}
                    keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.subtitle}>
                                ¡Sé el primero! Aún no hay publicaciones.
                            </Text>
                            <Text style={styles.subtitleSmall}>
                                Presiona el botón de '+' para comenzar a compartir.
                            </Text>
                        </View>
                    )}
                    onRefresh={fetchGlobalPosts}
                    refreshing={loading} 
                />
            )}
        </View>
    );
}

// ... Estilos (styles) originales.
const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#000000',
        paddingTop: 50,
    },
    header: {
        alignItems: "center",
        marginBottom: 20,
        paddingHorizontal: 20,
    },
    logo: { fontSize: 32, fontWeight: "bold", color: "#ff0000" },
    sport: { color: "#00aaff" },
    title: { fontSize: 22, fontWeight: "bold", color: "#fff", marginTop: 5 },
    subtitle: { fontSize: 16, color: "#eee", marginBottom: 10, textAlign: "center" },
    subtitleSmall: { fontSize: 14, color: "#bbb", textAlign: "center" },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40, 
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#fff',
        marginTop: 10,
    },
    emptyContainer: {
        padding: 30,
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        marginTop: 20,
        borderWidth: 1,
        borderColor: '#00aaff55'
    }
});