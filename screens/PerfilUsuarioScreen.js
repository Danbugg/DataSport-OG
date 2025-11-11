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
    SafeAreaView,
} from "react-native";
import { useFocusEffect, useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "http://localhost:3000"; 

const { width } = Dimensions.get('window');

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

const PostCard = ({ post, navigation, onLikeToggle }) => {
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
                <Text style={postStyles.postDate}>
                    {formatPostDate(post.createdAt)}
                </Text>
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
            </View>
        </View>
    );
};

export default function PerfilUsuarioScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    
    const viewingUserId = route.params?.itemId; 
    const [userProfile, setUserProfile] = useState(null);
    const [userPosts, setUserPosts] = useState([]);
    const [followMetrics, setFollowMetrics] = useState({ followersCount: 0, followingCount: 0 }); 
    const [currentLoggedInId, setCurrentLoggedInId] = useState(null); 
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const fondoLogin = require("../assets/fondoLogin.jpg"); 

    const navigateToFollowers = () => {
        if (!userProfile) return;
        navigation.navigate('SeguidoresScreen', { 
            profileId: viewingUserId, 
            profileUsername: userProfile.nombre_usuario,
        });
    };

    const navigateToFollowing = () => {
        if (!userProfile) return;
        navigation.navigate('SeguidosScreen', { 
            profileId: viewingUserId, 
            profileUsername: userProfile.nombre_usuario,
        });
    };

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
            const response = await fetch(`${API_BASE_URL}/profile/${id}/posts?currentUserId=${loggedInId}`);
            
            if (response.ok) {
                const data = await response.json();
                setUserPosts(data.posts || []); 
            } else {
                console.error(`[POSTS DEBUG] Error HTTP al cargar posts: ${response.status}`);
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

        if (String(followedId) === String(followerId)) {
             Alert.alert("Error", "No puedes seguirte a ti mismo.");
             return;
        }

        const endpoint = isFollowing ? `unfollow/${followedId}` : `follow/${followedId}`;
        const method = isFollowing ? 'DELETE' : 'POST';
        
        setIsFollowing(!isFollowing);

        setFollowMetrics(prev => ({
            ...prev,
            followersCount: prev.followersCount + (isFollowing ? -1 : 1)
        }));

        try {
            const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ followerId: Number(followerId) }), 
            });

            if (!response.ok) {
                setIsFollowing(prev => !prev); 
                setFollowMetrics(prev => ({
                    ...prev,
                    followersCount: prev.followersCount + (isFollowing ? 1 : -1)
                }));
                const errorData = await response.json().catch(() => ({}));
                Alert.alert("Error", errorData.error || `Error al ${isFollowing ? 'dejar de seguir' : 'seguir'}.`);
            }

        } catch (error) {
            console.error("Error de red en follow/unfollow:", error);
            setIsFollowing(prev => !prev); 
            setFollowMetrics(prev => ({
                ...prev,
                followersCount: prev.followersCount + (isFollowing ? 1 : -1)
            }));
            Alert.alert("Error de Conexión", "No se pudo conectar al servidor para realizar la acción de seguimiento.");
        }
    };

    const fetchProfile = async () => {
        setLoading(true);

        const loggedId = await AsyncStorage.getItem("userId");
        setCurrentLoggedInId(loggedId); 

        if (!viewingUserId) {
            setLoading(false);
            Alert.alert("Error", "ID de usuario a visualizar no encontrado.");
            return;
        }

        const apiUrl = `${API_BASE_URL}/profile/${viewingUserId}`;
        let success = false;

        try {
            const profileResponse = await fetch(apiUrl);
            
            if (!profileResponse.ok) {
                Alert.alert("Error", `Error HTTP ${profileResponse.status} al cargar perfil.`);
                return;
            }

            const data = await profileResponse.json();
            const profileData = { 
                ...data.user, 
                id_usuario: String(data.user.id_usuario), 
                descripcion: data.user.descripcion || '' 
            };
            setUserProfile(profileData);
            success = true;

            setFollowMetrics({
                followersCount: data.followersCount || 0,
                followingCount: data.followingCount || 0,
            });

            if (loggedId && String(viewingUserId) !== String(loggedId)) { 
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
                setIsFollowing(false); 
            }
            
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

    return (
        <SafeAreaView style={styles.safeAreaContainer}> 
            <StatusBar barStyle="light-content" backgroundColor="black" translucent={false} /> 
            <ImageBackground source={fondoLogin} style={styles.background}>
                <View style={styles.overlay}>
                    {/* HEADER FIJO - Fuera del ScrollView */}
                    <View style={styles.fixedHeader}>
                        <View style={styles.profileHeader}>
                            <View style={styles.profileInfoGroup}> 
                                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                                    <Ionicons name="arrow-back" size={28} color="#fff" />
                                </TouchableOpacity>

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
                    </View>

                    {/* CONTENIDO SCROLLABLE */}
                    <ScrollView 
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
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
        </SafeAreaView>
    );
}

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
        width: "100%",
    },
    fixedHeader: {
        backgroundColor: "rgba(0,0,0,0.95)",
        paddingHorizontal: 30,
        paddingTop: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    profileHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 25,
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
    scrollContent: {
        paddingHorizontal: 30,
        paddingTop: 20,
        paddingBottom: 30,
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
});