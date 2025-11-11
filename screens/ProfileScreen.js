import React, { useState, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
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
    Modal
} from "react-native";
import { useFocusEffect, useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "http://localhost:3000"; 
const { width } = Dimensions.get('window');

// Formato de Fecha
const formatPostDate = (dateString) => {
    const postDate = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - postDate) / 1000);

    const MINUTE = 60;
    const HOUR = 60 * MINUTE;
    const DAY = 24 * HOUR;
    const DAYS_LIMIT = 2; 

    if (diffInSeconds < MINUTE) {
        return "Hace un momento"; 
    } else if (diffInSeconds < HOUR) {
        const minutes = Math.floor(diffInSeconds / MINUTE);
        return `Hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    } else if (diffInSeconds < DAY) {
        const hours = Math.floor(diffInSeconds / HOUR);
        return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    } else if (diffInSeconds < DAYS_LIMIT * DAY) {
        const days = Math.floor(diffInSeconds / DAY);
        return `Hace ${days} ${days === 1 ? 'día' : 'días'}`;
    } else {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return postDate.toLocaleDateString('es-ES', options);
    }
};

// ESTILOS DE LA TARJETA DE PUBLICACIÓN (POSTCARD)
const postStyles = StyleSheet.create({
    postCard: {
        backgroundColor: '#000000', 
        borderRadius: 0,
        padding: 15,
        marginBottom: 25, 
        width: '100%',
        shadowColor: 'transparent',
        shadowOpacity: 0, 
        elevation: 0,
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between', 
        marginBottom: 10,
    },
    authorInfo: {
        flexDirection: 'row',
        alignItems: 'center',
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
        marginLeft: 'auto', 
    },
    postActions: { 
        flexDirection: 'row',
        paddingVertical: 8,
        borderTopWidth: 0, 
        borderTopColor: 'transparent',
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
    postSeparator: {
        height: 1, 
        backgroundColor: 'rgba(100, 100, 100, 0.3)', 
        marginTop: 15, 
        marginHorizontal: -15, 
    },
    optionsButton: {
        padding: 5,
        marginLeft: 10,
    }
});

// RENDERIZADO: Tarjeta de Publicación
const PostCard = ({ post, navigation, onLikeToggle, isPostOwner, handleOptions, handleShare }) => {
    const [isLiked, setIsLiked] = useState(post.isLikedByCurrentUser || false);
    const [likeCount, setLikeCount] = useState(post.likeCount || 0);

    const navigateToImgCompleta = () => {
        if (post.imageUrl) {
            navigation.navigate('ImgCompletaScreen', { imageUrl: post.imageUrl }); 
        }
    };

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
        navigation.navigate('CommentsScreen', { postId: post.id });
    };

    return (
        <View style={postStyles.postCard}> 
            <View style={postStyles.postHeader}>
                <View style={postStyles.authorInfo}> 
                    <Image
                        source={{ uri: post.authorProfilePic || 'https://i.imgur.com/k6KxI1x.png' }}
                        style={postStyles.authorImage}
                    />
                    <Text style={postStyles.authorUsername}>{post.authorUsername || 'Usuario Desconocido'}</Text>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={postStyles.postDate}>
                        {formatPostDate(post.createdAt)}
                    </Text>
                    
                    <TouchableOpacity style={postStyles.optionsButton} onPress={() => handleOptions(post.id, isPostOwner)}>
                        <Ionicons 
                            name="ellipsis-vertical" 
                            size={20} 
                            color="#eee" 
                        />
                    </TouchableOpacity>
                </View>
            </View>
            
            <Text style={postStyles.postContent}>{post.content}</Text>
            
            {post.imageUrl && (
                <TouchableOpacity onPress={navigateToImgCompleta}>
                    <Image 
                        source={{ uri: post.imageUrl }} 
                        style={postStyles.postImage} 
                        onError={() => console.log('Error al cargar imagen de la publicación')}
                    />
                </TouchableOpacity>
            )}
            
            <View style={postStyles.postActions}>
                <TouchableOpacity onPress={handleLike} style={postStyles.actionButton}>
                    <Ionicons 
                        name={isLiked ? "heart" : "heart-outline"} 
                        size={24} 
                        color={isLiked ? "#ff0000" : "#eee"} 
                    />
                    <Text style={postStyles.actionText}>{likeCount}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={navigateToComments} style={postStyles.actionButton}>
                    <Ionicons 
                        name="chatbubble-outline" 
                        size={24} 
                        color="#00aaff"
                    />
                    <Text style={postStyles.actionText}>{post.commentCount || 0}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    onPress={() => handleShare(post.id, post.sharedPostId)} 
                    style={postStyles.actionButton}
                >
                    <Ionicons 
                        name="repeat" 
                        size={24} 
                        color="#4CAF50"
                    />
                    <Text style={postStyles.actionText}>{post.shareCount || 0}</Text>
                </TouchableOpacity>
            </View>

            <View style={postStyles.postSeparator} />
        </View>
    );
};

// COMPONENTE PRINCIPAL: ProfileScreen
export default function ProfileScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    
    const routeUserId = route.params?.userId || route.params?.itemId; 
    
    // ESTADOS
    const [userProfile, setUserProfile] = useState(null);
    const [userPosts, setUserPosts] = useState([]);
    const [followMetrics, setFollowMetrics] = useState({ followersCount: 0, followingCount: 0 });
    const [currentLoggedInId, setCurrentLoggedInId] = useState(null); 
    const [isFollowing, setIsFollowing] = useState(false); 
    const [loading, setLoading] = useState(true);
    const [isToggleLoading, setIsToggleLoading] = useState(false); 
    const [currentViewingId, setCurrentViewingId] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const fondoLogin = require("../assets/fondoLogin.jpg"); 

    // Estados del Modal de Publicaciones
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState(null);
    const [isModalPostOwner, setIsModalPostOwner] = useState(false);
    const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
    const [confirmReportVisible, setConfirmReportVisible] = useState(false);

    // Estados del Modal de Ajustes
    const [settingsModalVisible, setSettingsModalVisible] = useState(false);
    const [confirmDeleteAccountVisible, setConfirmDeleteAccountVisible] = useState(false);

    const isOwnProfile = String(currentViewingId) === String(currentLoggedInId);

    // Funciones de Navegación Social 
    const navigateToFollowers = () => {
        if (!userProfile) return;
        navigation.navigate('SeguidoresScreen', { 
            profileId: currentViewingId, 
            profileUsername: userProfile.nombre_usuario,
        });
    };

    const navigateToFollowing = () => {
        if (!userProfile) return;
        navigation.navigate('SeguidosScreen', { 
            profileId: currentViewingId, 
            profileUsername: userProfile.nombre_usuario,
        });
    };

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

    const deletePost = useCallback((postId) => {
        setModalVisible(false);
        setSelectedPostId(postId);
        setConfirmDeleteVisible(true);
    }, []);

    const executeDelete = useCallback(async () => {
        setConfirmDeleteVisible(false);

        try {
            const response = await fetch(`${API_BASE_URL}/posts/${selectedPostId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentLoggedInId }),
            });

            if (response.ok) {
                setUserPosts(prevPosts => prevPosts.filter(p => p.id !== selectedPostId));
                Alert.alert("Éxito", "Publicación eliminada correctamente.");
            } else {
                const data = await response.json().catch(() => ({}));
                Alert.alert("Error", data.error || "No se pudo eliminar la publicación.");
            }
        } catch (error) {
            console.error("Error de red al eliminar post:", error);
            Alert.alert("Error", "Error de conexión al eliminar la publicación.");
        }
    }, [selectedPostId, currentLoggedInId]);

    const reportPost = useCallback((postId) => {
        setModalVisible(false);
        setSelectedPostId(postId);
        setConfirmReportVisible(true);
    }, []);

    const executeReport = useCallback(async () => {
        setConfirmReportVisible(false);

        try {
            const response = await fetch(`${API_BASE_URL}/posts/${selectedPostId}/report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reporterId: currentLoggedInId }),
            });

            if (response.ok) {
                Alert.alert("Reporte Enviado", "Gracias. Revisaremos la publicación pronto.");
            } else {
                const data = await response.json().catch(() => ({}));
                Alert.alert("Error", data.error || "No se pudo enviar el reporte.");
            }
        } catch (error) {
            console.error("Error de red al reportar post:", error);
            Alert.alert("Error", "Error de conexión al reportar la publicación.");
        }
    }, [selectedPostId, currentLoggedInId]);

    const handlePostOptions = useCallback((postId, isAuthor) => {
        if (!currentLoggedInId) {
            Alert.alert("Advertencia", "Debes iniciar sesión para usar estas opciones.");
            return;
        }

        setSelectedPostId(postId);
        setIsModalPostOwner(isAuthor);
        setModalVisible(true);
    }, [currentLoggedInId]);

    const handleShare = (postId, sharedPostId) => {
        if (!currentLoggedInId) {
            Alert.alert("Advertencia", "Debes iniciar sesión para compartir publicaciones.");
            return;
        }

        const originalPostId = sharedPostId || postId;
    
        Alert.alert(
            "Compartir Publicación",
            "¿Deseas compartir esta publicación en tu perfil?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Compartir",
                    onPress: async () => {
                        try {
                            const response = await fetch(`${API_BASE_URL}/posts/${originalPostId}/share`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: currentLoggedInId }),
                            });

                            if (response.ok) {
                                Alert.alert("Éxito", "¡Publicación compartida exitosamente!");
                                fetchProfile(); 
                            } else {
                                const data = await response.json().catch(() => ({}));
                                Alert.alert("Error", data.error || "No se pudo compartir la publicación.");
                            }
                        } catch (error) {
                            console.error("Error al compartir:", error);
                            Alert.alert("Error", "Error de conexión al compartir.");
                        }
                    }
                }
            ]
        );
    };

    const handleLikeToggle = useCallback(async (postId, newIsLiked) => {
        if (!currentLoggedInId) { Alert.alert("Error", "Debes iniciar sesión para dar 'Me gusta'."); return false; }
        try {
            const response = await fetch(`${API_BASE_URL}/posts/${postId}/like`, {
                method: newIsLiked ? "POST" : "DELETE", headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: currentLoggedInId }),
            });
            if (response.ok) return true;
            const errorData = await response.json().catch(() => ({}));
            console.error("Error del API al dar like:", errorData);
            return false;
        } catch (error) { console.error("Error de red al dar like:", error); return false; }
    }, [currentLoggedInId]);
    
    const handleFollowToggle = async () => {
        if (!currentLoggedInId || !currentViewingId) return;
        if (isToggleLoading) return;
        setIsToggleLoading(true);
        const endpoint = isFollowing ? `/unfollow/${currentViewingId}` : `/follow/${currentViewingId}`;
        const method = isFollowing ? "DELETE" : "POST";
        
        const newIsFollowing = !isFollowing;
        setIsFollowing(newIsFollowing);
        setFollowMetrics(prev => ({ ...prev, followersCount: prev.followersCount + (newIsFollowing ? 1 : -1) }));

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ followerId: currentLoggedInId }),
            });
            if (!response.ok) {
                setIsFollowing(!newIsFollowing);
                setFollowMetrics(prev => ({ ...prev, followersCount: prev.followersCount + (newIsFollowing ? -1 : 1) }));
                const data = await response.json().catch(() => ({}));
                Alert.alert("Error", data.error || `No se pudo ${isFollowing ? 'dejar de seguir' : 'seguir'}.`);
            }
        } catch (error) { 
            console.error("Error de red en el seguimiento:", error); 
            setIsFollowing(!newIsFollowing);
            setFollowMetrics(prev => ({ ...prev, followersCount: prev.followersCount + (newIsFollowing ? -1 : 1) }));
            Alert.alert("Error", "Error de conexión al intentar seguir.");
        } finally { setIsToggleLoading(false); }
    };
    
    const checkFollowStatus = async (viewerId, profileId) => {
        if (!viewerId || !profileId) return;
        try {
            const response = await fetch(`${API_BASE_URL}/isFollowing/${profileId}?followerId=${viewerId}`);
            if (response.ok) {
                const data = await response.json();
                setIsFollowing(data.isFollowing);
            }
        } catch (error) { console.error("Error al verificar seguimiento:", error); setIsFollowing(false); }
    };
    
    const fetchProfile = async () => {
        setLoading(true);
        const loggedId = await AsyncStorage.getItem("userId");
        setCurrentLoggedInId(loggedId);
        const finalUserId = routeUserId || loggedId;
        setCurrentViewingId(finalUserId);
        if (!finalUserId) { setLoading(false); Alert.alert("Error", "ID de usuario inválido. Por favor, inicia sesión de nuevo."); return; }
        let success = false;
        try {
            const profileResponse = await fetch(`${API_BASE_URL}/profile/${finalUserId}`);
            if (profileResponse.ok) {
                const data = await profileResponse.json();
                const profileData = { ...data.user, id_usuario: String(data.user.id_usuario), descripcion: data.user.descripcion || '' };
                setUserProfile(profileData);
                
                setIsAdmin(data.user.rol_id === 2);
                
                success = true;
                setFollowMetrics({ followersCount: data.followersCount || 0, followingCount: data.followingCount || 0, });
            } else {
                const data = await profileResponse.json().catch(() => ({}));
                Alert.alert("Error", data.error || "No se pudo cargar el perfil.");
            }
            if (success) {
                await fetchUserPosts(finalUserId, loggedId);
                if (loggedId && loggedId !== finalUserId) { await checkFollowStatus(loggedId, finalUserId); } else { setIsFollowing(false); }
            }
        } catch (error) { console.error("Error de conexión:", error); Alert.alert("Error", "Error al conectar con el servidor. Revisa tu IP y que el backend esté corriendo."); } finally { setLoading(false); }
    };
    
    useFocusEffect(
        useCallback(() => {
            fetchProfile();
        }, [routeUserId]) 
    );
    
    // Función para abrir el modal de ajustes
    const handleSettings = () => {
        if (!isOwnProfile) return;
        setSettingsModalVisible(true);
    };

    // Función para confirmar eliminación de cuenta
    const handleDeleteAccount = () => {
        setSettingsModalVisible(false);
        setConfirmDeleteAccountVisible(true);
    };

    // Función para ejecutar la eliminación de cuenta
    const executeDeleteAccount = async () => {
        setConfirmDeleteAccountVisible(false);
        
        const idToDelete = await AsyncStorage.getItem("userId");
        if (!idToDelete) { 
            Alert.alert("Error", "No se encontró el ID de usuario para eliminar."); 
            return; 
        }

        try {
            const response = await fetch(`${API_BASE_URL}/delete-account/${idToDelete}`, { 
                method: "DELETE" 
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
    };

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

    // MODAL DE OPCIONES DE PUBLICACIÓN 
    const PostOptionsModal = () => (
        <Modal
            animationType="fade"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
        >
            <TouchableOpacity 
                style={modalStyles.centeredView} 
                activeOpacity={1}
                onPress={() => setModalVisible(false)}
            >
                <View style={modalStyles.modalView}>
                    
                    {isModalPostOwner && (
                        <TouchableOpacity
                            style={[modalStyles.button, modalStyles.deleteButton]}
                            onPress={() => deletePost(selectedPostId)}
                        >
                            <Ionicons name="trash-outline" size={24} color="#ff3333" />
                            <Text style={modalStyles.deleteText}>Eliminar Publicación</Text>
                        </TouchableOpacity>
                    )}

                    {!isModalPostOwner && (
                        <TouchableOpacity
                            style={[modalStyles.button, modalStyles.reportButton]}
                            onPress={() => reportPost(selectedPostId)}
                        >
                            <Ionicons name="flag-outline" size={24} color="#ffcc00" />
                            <Text style={modalStyles.reportText}>Reportar Publicación</Text>
                        </TouchableOpacity>
                    )}

                    <View style={modalStyles.separator} />

                    <TouchableOpacity
                        style={[modalStyles.button, modalStyles.cancelButton]}
                        onPress={() => setModalVisible(false)}
                    >
                        <Text style={modalStyles.cancelText}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    // MODAL DE CONFIRMACIÓN DE ELIMINACIÓN 
    const ConfirmDeleteModal = () => (
        <Modal
            animationType="fade"
            transparent={true}
            visible={confirmDeleteVisible}
            onRequestClose={() => setConfirmDeleteVisible(false)}
        >
            <TouchableOpacity 
                style={modalStyles.centeredView} 
                activeOpacity={1}
                onPress={() => setConfirmDeleteVisible(false)}
            >
                <View style={modalStyles.confirmModalView}>
                    <Ionicons name="warning-outline" size={50} color="#ff3333" style={{ marginBottom: 15 }} />
                    
                    <Text style={modalStyles.confirmTitle}>Confirmar Eliminación</Text>
                    <Text style={modalStyles.confirmMessage}>
                        ¿Estás seguro de que quieres eliminar esta publicación? Esta acción es permanente.
                    </Text>

                    <View style={modalStyles.confirmButtonsContainer}>
                        <TouchableOpacity
                            style={[modalStyles.confirmButton, modalStyles.cancelConfirmButton]}
                            onPress={() => setConfirmDeleteVisible(false)}
                        >
                            <Text style={modalStyles.cancelConfirmText}>Cancelar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[modalStyles.confirmButton, modalStyles.deleteConfirmButton]}
                            onPress={executeDelete}
                        >
                            <Text style={modalStyles.deleteConfirmText}>Eliminar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    // MODAL DE CONFIRMACIÓN DE REPORTE
    const ConfirmReportModal = () => (
        <Modal
            animationType="fade"
            transparent={true}
            visible={confirmReportVisible}
            onRequestClose={() => setConfirmReportVisible(false)}
        >
            <TouchableOpacity 
                style={modalStyles.centeredView} 
                activeOpacity={1}
                onPress={() => setConfirmReportVisible(false)}
            >
                <View style={modalStyles.confirmModalView}>
                    <Ionicons name="flag-outline" size={50} color="#ffcc00" style={{ marginBottom: 15 }} />
                    
                    <Text style={modalStyles.confirmTitle}>Reportar Publicación</Text>
                    <Text style={modalStyles.confirmMessage}>
                        ¿Estás seguro de que quieres reportar esta publicación? Los reportes son anónimos.
                    </Text>

                    <View style={modalStyles.confirmButtonsContainer}>
                        <TouchableOpacity
                            style={[modalStyles.confirmButton, modalStyles.cancelConfirmButton]}
                            onPress={() => setConfirmReportVisible(false)}
                        >
                            <Text style={modalStyles.cancelConfirmText}>Cancelar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[modalStyles.confirmButton, modalStyles.reportConfirmButton]}
                            onPress={executeReport}
                        >
                            <Text style={modalStyles.reportConfirmText}>Reportar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    // MODAL DE AJUSTES
    const SettingsModal = () => (
        <Modal
            animationType="fade"
            transparent={true}
            visible={settingsModalVisible}
            onRequestClose={() => setSettingsModalVisible(false)}
        >
            <TouchableOpacity 
                style={modalStyles.centeredView} 
                activeOpacity={1}
                onPress={() => setSettingsModalVisible(false)}
            >
                <View style={modalStyles.modalView}>
                    
                    {/* Editar Perfil */}
                    <TouchableOpacity
                        style={[modalStyles.button, modalStyles.editButton]}
                        onPress={() => {
                            setSettingsModalVisible(false);
                            navigation.navigate('EditProfileScreen', { 
                                userId: currentLoggedInId, 
                                userProfile 
                            });
                        }}
                    >
                        <Ionicons name="create-outline" size={24} color="#00aaff" />
                        <Text style={modalStyles.editText}>Editar Perfil</Text>
                    </TouchableOpacity>

                    {/* Panel de Administración (solo si es admin) */}
                    {isAdmin && (
                        <TouchableOpacity
                            style={[modalStyles.button, modalStyles.adminButton]}
                            onPress={() => {
                                setSettingsModalVisible(false);
                                navigation.navigate('AdminPanelScreen');
                            }}
                        >
                            <Ionicons name="shield-checkmark-outline" size={24} color="#FFD700" />
                            <Text style={modalStyles.adminText}>Panel de Administración</Text>
                        </TouchableOpacity>
                    )}

                    {/* Cerrar Sesión */}
                    <TouchableOpacity
                        style={[modalStyles.button, modalStyles.logoutButton]}
                        onPress={async () => {
                            setSettingsModalVisible(false);
                            await AsyncStorage.clear();
                            navigation.replace('LoginScreen');
                        }}
                    >
                        <Ionicons name="log-out-outline" size={24} color="#888" />
                        <Text style={modalStyles.logoutText}>Cerrar Sesión</Text>
                    </TouchableOpacity>

                    <View style={modalStyles.separator} />

                    {/* Eliminar Cuenta */}
                    <TouchableOpacity
                        style={[modalStyles.button, modalStyles.deleteAccountButton]}
                        onPress={handleDeleteAccount}
                    >
                        <Ionicons name="trash-outline" size={24} color="#ff3333" />
                        <Text style={modalStyles.deleteText}>Eliminar Cuenta</Text>
                    </TouchableOpacity>

                    <View style={modalStyles.separator} />

                    {/* Cancelar */}
                    <TouchableOpacity
                        style={[modalStyles.button, modalStyles.cancelButton]}
                        onPress={() => setSettingsModalVisible(false)}
                    >
                        <Text style={modalStyles.cancelText}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    // MODAL DE CONFIRMACIÓN DE ELIMINACIÓN DE CUENTA
    const ConfirmDeleteAccountModal = () => (
        <Modal
            animationType="fade"
            transparent={true}
            visible={confirmDeleteAccountVisible}
            onRequestClose={() => setConfirmDeleteAccountVisible(false)}
        >
            <TouchableOpacity 
                style={modalStyles.centeredView} 
                activeOpacity={1}
                onPress={() => setConfirmDeleteAccountVisible(false)}
            >
                <View style={modalStyles.confirmModalView}>
                    <Ionicons name="warning-outline" size={50} color="#ff3333" style={{ marginBottom: 15 }} />
                    
                    <Text style={modalStyles.confirmTitle}>Eliminar Cuenta</Text>
                    <Text style={modalStyles.confirmMessage}>
                        ¿Estás seguro de que quieres eliminar tu cuenta? Esta acción es irreversible y perderás todos tus datos.
                    </Text>

                    <View style={modalStyles.confirmButtonsContainer}>
                        <TouchableOpacity
                            style={[modalStyles.confirmButton, modalStyles.cancelConfirmButton]}
                            onPress={() => setConfirmDeleteAccountVisible(false)}
                        >
                            <Text style={modalStyles.cancelConfirmText}>Cancelar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[modalStyles.confirmButton, modalStyles.deleteConfirmButton]}
                            onPress={executeDeleteAccount}
                        >
                            <Text style={modalStyles.deleteConfirmText}>Eliminar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.safeAreaContainer}> 
             <StatusBar barStyle="light-content" backgroundColor="black" /> 
            <ImageBackground source={fondoLogin} style={styles.background}>
                <View style={styles.overlay}>
                    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                        
                        {/* Header y Botones de Acción */}
                        <View style={styles.profileHeader}>
                            <View style={styles.profileInfoGroup}> 
                                {!isOwnProfile && (
                                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                                        <Ionicons name="arrow-back" size={28} color="#fff" />
                                    </TouchableOpacity>
                                )}

                                <View style={styles.profileInfo}>
                                    <Image
                                        source={{ uri: userProfile.foto_perfil || 'https://i.imgur.com/k6KxI1x.png' }}
                                        style={styles.profileImage}
                                    />
                                    <View style={styles.userInfoText}>
                                        <Text style={styles.usernameText}>@{userProfile.nombre_usuario}</Text>
                                        <Text style={styles.userStatus}>{userProfile.descripcion || 'Sin descripción'}</Text>
                                        {isAdmin && isOwnProfile && (
                                            <View style={styles.adminBadge}>
                                                <Ionicons name="shield-checkmark" size={16} color="#FFD700" />
                                                <Text style={styles.adminText}>Administrador</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
                            
                            {isOwnProfile ? (
                                <TouchableOpacity onPress={handleSettings} style={{ marginLeft: 'auto' }}>
                                    <Ionicons name="settings-outline" size={28} color="#fff" />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity 
                                    onPress={handleFollowToggle}
                                    style={[
                                        styles.followButton, 
                                        { backgroundColor: isFollowing ? '#333' : '#00aaff' }
                                    ]}
                                    disabled={isToggleLoading}
                                >
                                    {isToggleLoading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.followButtonText}>
                                            {isFollowing ? 'Siguiendo' : 'Seguir'}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            )}
                            
                        </View>

                        {/* Bloque de Métricas Sociales */}
                        <View style={styles.compactMetricsContainer}>
                            <TouchableOpacity onPress={navigateToFollowers} style={styles.compactMetricItem}>
                                <Text style={styles.compactMetricNumber}>{followMetrics.followersCount}</Text>
                                <Text style={styles.compactMetricLabel}>Seguidores</Text>
                            </TouchableOpacity>
                            <View style={styles.compactMetricSeparator} />
                            <TouchableOpacity onPress={navigateToFollowing} style={styles.compactMetricItem}>
                                <Text style={styles.compactMetricNumber}>{followMetrics.followingCount}</Text>
                                <Text style={styles.compactMetricLabel}>Seguidos</Text>
                            </TouchableOpacity>
                            <View style={styles.compactMetricSeparator} />
                            <View style={styles.compactMetricItem}>
                                <Text style={styles.compactMetricNumber}>{userPosts.length}</Text>
                                <Text style={styles.compactMetricLabel}>Publicaciones</Text>
                            </View>
                        </View>
                        
                        {/* Detalles Adicionales */}
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
                        
                        {/* Lista de Publicaciones */}
                        <View style={styles.publicationsContainer}>
                            {userPosts.length > 0 ? (
                                <FlatList
                                    data={userPosts}
                                    keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                                    renderItem={({ item }) => {
                                        const postAuthorId = String(item.authorId || '');
                                        const isOwner = String(currentLoggedInId) === postAuthorId;
                                        
                                        return (
                                            <PostCard 
                                                post={item} 
                                                navigation={navigation} 
                                                onLikeToggle={handleLikeToggle}
                                                isPostOwner={isOwner}
                                                handleOptions={handlePostOptions}
                                                handleShare={handleShare}
                                            />
                                        );
                                    }}
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
            
            {/* Modales */}
            <PostOptionsModal />
            <ConfirmDeleteModal />
            <ConfirmReportModal />
            <SettingsModal />
            <ConfirmDeleteAccountModal />
        </SafeAreaView>
    );
}

// ESTILOS DEL MODAL PERSONALIZADO 
const modalStyles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    modalView: {
        width: '90%',
        margin: 20,
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        padding: 10,
        alignItems: 'center',
        shadowColor: '#00aaff',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        width: '100%',
        borderRadius: 15,
        marginVertical: 5,
    },
    editButton: {
        backgroundColor: '#333',
    },
    editText: {
        color: '#00aaff',
        fontWeight: 'bold',
        fontSize: 18,
        marginLeft: 10,
    },
    adminButton: {
        backgroundColor: '#333',
    },
    adminText: {
        color: '#FFD700',
        fontWeight: 'bold',
        fontSize: 18,
        marginLeft: 10,
    },
    logoutButton: {
        backgroundColor: '#333',
    },
    logoutText: {
        color: '#888',
        fontWeight: 'bold',
        fontSize: 18,
        marginLeft: 10,
    },
    deleteAccountButton: {
        backgroundColor: '#333',
    },
    reportButton: {
        backgroundColor: '#333', 
    },
    reportText: {
        color: '#ffcc00',
        fontWeight: 'bold',
        fontSize: 18,
        marginLeft: 10,
    },
    deleteButton: {
        backgroundColor: '#333',
    },
    deleteText: {
        color: '#ff3333',
        fontWeight: 'bold',
        fontSize: 18,
        marginLeft: 10,
    },
    separator: {
        height: 1,
        backgroundColor: '#444',
        width: '100%',
        marginVertical: 5,
    },
    cancelButton: {
        backgroundColor: '#00aaff',
    },
    cancelText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
        textAlign: 'center',
        width: '100%',
    },
    confirmModalView: {
        width: '85%',
        margin: 20,
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        padding: 25,
        alignItems: 'center',
        shadowColor: '#00aaff',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    confirmTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
        textAlign: 'center',
    },
    confirmMessage: {
        fontSize: 16,
        color: '#ccc',
        textAlign: 'center',
        marginBottom: 25,
        lineHeight: 22,
    },
    confirmButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: 10,
    },
    confirmButton: {
        flex: 1,
        padding: 15,
        borderRadius: 15,
        alignItems: 'center',
    },
    cancelConfirmButton: {
        backgroundColor: '#333',
    },
    cancelConfirmText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    deleteConfirmButton: {
        backgroundColor: '#ff3333',
    },
    deleteConfirmText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    reportConfirmButton: {
        backgroundColor: '#ffcc00',
    },
    reportConfirmText: {
        color: '#1a1a1a',
        fontWeight: 'bold',
        fontSize: 16,
    }
});

// --- ESTILOS PRINCIPALES ---
const styles = StyleSheet.create({
    safeAreaContainer: {
        flex: 1, 
        backgroundColor: "black", 
    },
    background: { 
        flex: 1, 
        justifyContent: "flex-start", 
        alignItems: "center" 
    },
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.85)",
        paddingHorizontal: 30, 
        width: "100%",
        paddingTop: 0, 
    },
    profileHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingTop: 20, 
        position: 'relative',
    },
    profileInfoGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
    },
    backButton: {
        marginRight: 10, 
        padding: 5,
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
    adminBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 5,
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    adminText: {
        color: '#FFD700',
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 4,
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
    },
    compactMetricsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)', 
        borderRadius: 10,
        paddingVertical: 10,
        marginBottom: 15,
    },
    compactMetricItem: {
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    compactMetricNumber: {
        fontSize: 18, fontWeight: 'bold', color: '#ff0000', 
    },
    compactMetricLabel: {
        fontSize: 13, color: '#ccc', marginTop: 2,
    },
    compactMetricSeparator: {
        width: 1, height: '70%', backgroundColor: '#444', 
    },
});