import React, { useState, useCallback } from "react";
import { 
    View,               
    Text,                
    StyleSheet,       
    FlatList,           
    ActivityIndicator,   
    Image,              
    TouchableOpacity,  
    SafeAreaView,       
    Modal,              
    TextInput,          
    Alert,              
} from "react-native";

import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons"; 
import AsyncStorage from "@react-native-async-storage/async-storage"; 

const API_BASE_URL = "http://localhost:3000"; 

const PostCard = ({ 
    post,              
    navigation,        
    onLikeToggle, 
    currentUserId,     
    isPostOwner,       
    handleOptions,     
    handleShare        
}) => {
       
    const [isLiked, setIsLiked] = useState(post.isLikedByCurrentUser || false);
    const [likeCount, setLikeCount] = useState(post.likeCount || 0);
    const [shareCount, setShareCount] = useState(post.shareCount || 0);
    
    const navigateToAuthorProfile = () => {
        if (post.authorId) {
            navigation.navigate('Profile', { userId: post.authorId }); 
        }
    };

    const navigateToOriginalAuthorProfile = () => {
        if (post.originalAuthorId) {
            navigation.navigate('Profile', { userId: post.originalAuthorId }); 
        }
    };

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
        navigation.navigate('Comments', { postId: post.id });
    };

    const onSharePress = () => {
        handleShare(post.id, post.sharedPostId, (newCount) => {
            setShareCount(newCount);
        });
    };

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
    
    const isSharedPost = post.sharedPostId !== null;

    return (
        <View style={postStyles.postCard}> 
            
            {/* ENCABEZADO DE LA PUBLICACIÓN */}
            <View style={postStyles.postHeader}>
                <View style={postStyles.authorInfo}> 
                    <Image
                        source={{ uri: post.authorProfilePic || 'https://i.imgur.com/k6KxI1x.png' }}
                        style={postStyles.authorImage}
                    />
                    <TouchableOpacity onPress={navigateToAuthorProfile}>
                        <Text style={postStyles.authorUsername}>
                            {post.authorUsername || 'Usuario Desconocido'}
                        </Text>
                    </TouchableOpacity>
                    
                    {isSharedPost && (
                        <View style={postStyles.sharedBadge}>
                            <Ionicons name="repeat" size={14} color="#00ff88" />
                            <Text style={postStyles.sharedText}>compartió</Text>
                        </View>
                    )}
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={postStyles.postDate}>
                        {formatPostDate(post.createdAt)}
                    </Text>
                    
                    <TouchableOpacity 
                        style={postStyles.optionsButton} 
                        onPress={() => handleOptions(post.id, isPostOwner)}
                    >
                        <Ionicons 
                            name="ellipsis-vertical" 
                            size={20} 
                            color="#eee" 
                        />
                    </TouchableOpacity>
                </View>
            </View>
            
            {/* CONTENIDO PROPIO (solo en publicaciones compartidas) */}
            {isSharedPost && post.content && (
                <Text style={postStyles.postContent}>{post.content}</Text>
            )}
            
            {/* PUBLICACIÓN ORIGINAL EMBEBIDA (si es compartida) */}
            {isSharedPost ? (
                <View style={postStyles.originalPostContainer}>
                    <View style={postStyles.originalPostHeader}>
                        <Image
                            source={{ uri: post.originalAuthorProfilePic || 'https://i.imgur.com/k6KxI1x.png' }}
                            style={postStyles.originalAuthorImage}
                        />
                        <TouchableOpacity onPress={navigateToOriginalAuthorProfile}>
                            <Text style={postStyles.originalAuthorUsername}>
                                {post.originalAuthorUsername || 'Usuario Desconocido'}
                            </Text>
                        </TouchableOpacity>
                        <Text style={postStyles.originalPostDate}>
                            {formatPostDate(post.originalCreatedAt)}
                        </Text>
                    </View>
                    
                    <Text style={postStyles.originalPostContent}>{post.originalContent}</Text>
                    
                    {post.originalImageUrl && (
                        <TouchableOpacity onPress={() => navigation.navigate('ImgCompletaScreen', { imageUrl: post.originalImageUrl })}>
                            <Image 
                                source={{ uri: post.originalImageUrl }} 
                                style={postStyles.originalPostImage} 
                            />
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <>
                    <Text style={postStyles.postContent}>{post.content}</Text>
                    
                    {post.imageUrl && (
                        <TouchableOpacity onPress={navigateToImgCompleta}>
                            <Image 
                                source={{ uri: post.imageUrl }} 
                                style={postStyles.postImage} 
                            />
                        </TouchableOpacity>
                    )}
                </>
            )}

            {/* ACCIONES DE LA PUBLICACIÓN */}
            <View style={postStyles.postActions}>
                
                <TouchableOpacity onPress={handleLike} style={postStyles.actionButton}>
                    <View style={[
                        postStyles.iconContainer, 
                        isLiked && postStyles.iconContainerActive
                    ]}>
                        <Ionicons 
                            name={isLiked ? "heart" : "heart-outline"}
                            size={22} 
                            color={isLiked ? "#ff0000" : "#eee"}
                        />
                    </View>
                    <Text style={postStyles.actionText}>{likeCount}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={navigateToComments} style={postStyles.actionButton}>
                    <View style={postStyles.iconContainer}>
                        <Ionicons 
                            name="chatbubble-outline" 
                            size={22} 
                            color="#00aaff"
                        />
                    </View>
                    <Text style={postStyles.actionText}>{post.commentCount || 0}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={postStyles.actionButton} onPress={onSharePress}>
                    <View style={postStyles.iconContainer}>
                        <Ionicons 
                            name="repeat" 
                            size={22} 
                            color="#00ff88"
                        />
                    </View>
                    <Text style={postStyles.actionText}>{shareCount}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

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
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    
    authorInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
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
    
    sharedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
        backgroundColor: 'rgba(0, 255, 136, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    
    sharedText: {
        color: '#00ff88',
        fontSize: 12,
        marginLeft: 4,
        fontWeight: '600',
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
    
    originalPostContainer: {
        backgroundColor: '#252525',
        borderRadius: 10,
        padding: 12,
        marginTop: 8,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#333',
    },
    
    originalPostHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    
    originalAuthorImage: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#00aaff',
    },
    
    originalAuthorUsername: {
        color: '#00aaff',
        fontWeight: 'bold',
        fontSize: 14,
        flex: 1,
    },
    
    originalPostDate: {
        color: '#888',
        fontSize: 11,
        marginLeft: 8,
    },
    
    originalPostContent: {
        color: '#ddd',
        fontSize: 15,
        lineHeight: 20,
        marginBottom: 8,
    },
    
    originalPostImage: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        resizeMode: 'cover',
    },
    
    postDate: {
        color: '#888',
        fontSize: 12,
        marginLeft: 'auto',
    },
    
    postActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#333',
        marginTop: 5,
    },
    
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#252525',
        paddingHorizontal: 16,
        minWidth: 90,
        justifyContent: 'center',
    },
    
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#1a1a1aff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#333333ff',
    },
    
    iconContainerActive: {
        backgroundColor: '#ff000015',
        borderColor: '#ff0000',
    },
    
    actionText: {
        color: '#eee',
        fontSize: 14,
        fontWeight: '600',
    },
    
    optionsButton: {
        padding: 5,
        marginLeft: 10,
    }
});

export default function HomeScreen({ navigation }) {

    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState(null);

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState(null);
    const [isModalPostOwner, setIsModalPostOwner] = useState(false);

    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [shareComment, setShareComment] = useState('');
    const [postToShare, setPostToShare] = useState(null);
    const [isSharing, setIsSharing] = useState(false);

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);

    const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
    const [confirmReportVisible, setConfirmReportVisible] = useState(false);
    const [deleteReason, setDeleteReason] = useState('');
    const [reportReason, setReportReason] = useState('');

    const [successModalVisible, setSuccessModalVisible] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorModalVisible, setErrorModalVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const getUserId = async () => {
        const id = await AsyncStorage.getItem("userId");
        setCurrentUserId(id);
    };

    const fetchNotifications = async () => {
        if (!currentUserId) return;
        
        try {
            const response = await fetch(`${API_BASE_URL}/notifications/${currentUserId}`);
            if (response.ok) {
                const data = await response.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (error) {
            console.error("Error al cargar notificaciones:", error);
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUserId }),
            });

            if (response.ok) {
                fetchNotifications();
            }
        } catch (error) {
            console.error("Error al marcar como leída:", error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/notifications/${currentUserId}/read-all`, {
                method: 'PUT',
            });

            if (response.ok) {
                fetchNotifications();
            }
        } catch (error) {
            console.error("Error al marcar todas como leídas:", error);
        }
    };

    const handleShare = (postId, sharedPostId, updateShareCount) => {
        if (!currentUserId) {
            setErrorMessage("Debes iniciar sesión para compartir publicaciones.");
            setErrorModalVisible(true);
            return;
        }

        const originalPostId = sharedPostId || postId;
        
        setPostToShare({ id: originalPostId, updateShareCount });
        setShareComment('');
        setShareModalVisible(true);
    };

    const executeShare = async () => {
        if (!postToShare) return;

        setIsSharing(true);

        try {
            const response = await fetch(`${API_BASE_URL}/posts/${postToShare.id}/share`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUserId,
                    comment: shareComment.trim()
                }),
            });

            if (response.ok) {
                const data = await response.json();
                
                setShareModalVisible(false);
                setShareComment('');
                
                setSuccessMessage("¡Publicación compartida exitosamente!");
                setSuccessModalVisible(true);
                
                if (postToShare.updateShareCount) {
                    setPosts(prevPosts => 
                        prevPosts.map(p => 
                            p.id === postToShare.id || p.sharedPostId === postToShare.id
                                ? { ...p, shareCount: (p.shareCount || 0) + 1 }
                                : p
                        )
                    );
                }
                
                setTimeout(() => {
                    fetchGlobalPosts();
                }, 1000);
            } else {
                const data = await response.json().catch(() => ({}));
                setErrorMessage(data.error || "No se pudo compartir la publicación.");
                setErrorModalVisible(true);
            }
        } catch (error) {
            console.error("Error al compartir:", error);
            setErrorMessage("Error de conexión al compartir.");
            setErrorModalVisible(true);
        } finally {
            setIsSharing(false);
        }
    };

    const deletePost = useCallback((postId) => {
        setModalVisible(false);
        setSelectedPostId(postId);
        setDeleteReason('');
        setConfirmDeleteVisible(true);
    }, []);

    const executeDelete = useCallback(async () => {
        if (!deleteReason.trim()) {
            setErrorMessage("Por favor, proporciona una razón para eliminar la publicación.");
            setErrorModalVisible(true);
            return;
        }

        setConfirmDeleteVisible(false);
        
        try {
            const response = await fetch(`${API_BASE_URL}/posts/${selectedPostId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: currentUserId,
                    reason: deleteReason
                }),
            });

            if (response.ok) {
                setPosts(prevPosts => prevPosts.filter(p => p.id !== selectedPostId));
                
                setSuccessMessage("Publicación eliminada correctamente.");
                setSuccessModalVisible(true);
                setDeleteReason('');
            } else {
                const data = await response.json().catch(() => ({}));
                setErrorMessage(data.error || "No se pudo eliminar la publicación.");
                setErrorModalVisible(true);
            }
        } catch (error) {
            console.error("Error al eliminar:", error);
            setErrorMessage("Error de conexión.");
            setErrorModalVisible(true);
        }
    }, [selectedPostId, currentUserId, deleteReason]);

    const reportPost = useCallback((postId) => {
        setModalVisible(false);
        setSelectedPostId(postId);
        setReportReason('');
        setConfirmReportVisible(true);
    }, []);

    const executeReport = useCallback(async () => {
        if (!reportReason.trim()) {
            setErrorMessage("Por favor, proporciona una razón para reportar la publicación.");
            setErrorModalVisible(true);
            return;
        }

        setConfirmReportVisible(false);
        
        try {
            const response = await fetch(`${API_BASE_URL}/posts/${selectedPostId}/report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    reporterId: currentUserId,
                    reason: reportReason
                }),
            });

            if (response.ok) {
                setSuccessMessage("Reporte enviado. Gracias por ayudarnos a mantener la comunidad segura.");
                setSuccessModalVisible(true);
                setReportReason('');
            } else {
                const data = await response.json().catch(() => ({}));
                setErrorMessage(data.error || "No se pudo enviar el reporte.");
                setErrorModalVisible(true);
            }
        } catch (error) {
            console.error("Error al reportar:", error);
            setErrorMessage("Error de conexión.");
            setErrorModalVisible(true);
        }
    }, [selectedPostId, currentUserId, reportReason]);

    const handlePostOptions = useCallback((postId, isAuthor) => {
        if (!currentUserId) {
            setErrorMessage("Debes iniciar sesión para usar estas opciones.");
            setErrorModalVisible(true);
            return;
        }

        setSelectedPostId(postId);
        setIsModalPostOwner(isAuthor);
        setModalVisible(true);

    }, [currentUserId]);

    const handleLikeToggle = useCallback(async (postId, newIsLiked) => {
        if (!currentUserId) {
            setErrorMessage("Debes iniciar sesión para dar 'Me gusta'.");
            setErrorModalVisible(true);
            return false;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/posts/${postId}/like`, {
                method: newIsLiked ? "POST" : "DELETE",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUserId }),
            });

            if (response.ok) return true;
            return false;
        } catch (error) {
            console.error("Error al dar like:", error);
            return false;
        }
    }, [currentUserId]); 

    const fetchGlobalPosts = async () => {
        setLoading(true);
        
        try {
            await getUserId();
            
            const response = await fetch(`${API_BASE_URL}/posts?userId=${currentUserId}`); 

            if (response.ok) {
                const data = await response.json();
                setPosts(data.posts || []);
            } else {
                setErrorMessage("No se pudo cargar el feed de publicaciones.");
                setErrorModalVisible(true);
                setPosts([]);
            }
        } catch (error) {
            console.error("Error de conexión:", error);
            setErrorMessage("No se pudo conectar con el servidor.");
            setErrorModalVisible(true);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            getUserId().then(() => {});
            fetchGlobalPosts();
            fetchNotifications();
        }, [currentUserId])
    );

    const renderItem = ({ item }) => {
        const postAuthorId = String(item.authorId || '');
        const isOwner = String(currentUserId) === postAuthorId;

        return (
            <PostCard 
                post={item} 
                navigation={navigation} 
                onLikeToggle={handleLikeToggle} 
                currentUserId={currentUserId}
                isPostOwner={isOwner}
                handleOptions={handlePostOptions}
                handleShare={handleShare}
            />
        );
    };

    const ShareModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={shareModalVisible}
            onRequestClose={() => {
                setShareModalVisible(false);
                setShareComment('');
            }}
        >
            <View style={shareModalStyles.centeredView}>
                <View style={shareModalStyles.modalView}>
                    <View style={shareModalStyles.header}>
                        <Text style={shareModalStyles.title}>Compartir Publicación</Text>
                        <TouchableOpacity onPress={() => {
                            setShareModalVisible(false);
                            setShareComment('');
                        }}>
                            <Ionicons name="close" size={28} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <Text style={shareModalStyles.description}>
                        Agrega un comentario (opcional)
                    </Text>

                    <TextInput
                        style={shareModalStyles.textInput}
                        placeholder="¿Qué piensas sobre esto?"
                        placeholderTextColor="#888"
                        value={shareComment}
                        onChangeText={setShareComment}
                        multiline
                        numberOfLines={4}
                        maxLength={280}
                    />

                    <Text style={shareModalStyles.characterCount}>
                        {shareComment.length}/280
                    </Text>

                    <TouchableOpacity
                        style={[
                            shareModalStyles.shareButton, 
                            isSharing && shareModalStyles.shareButtonDisabled
                        ]}
                        onPress={executeShare}
                        disabled={isSharing}
                    >
                        {isSharing ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="repeat" size={20} color="#fff" />
                                <Text style={shareModalStyles.shareButtonText}>Compartir</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    const NotificationsModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={notificationsModalVisible}
            onRequestClose={() => setNotificationsModalVisible(false)}
        >
            <View style={notificationStyles.modalContainer}>
                <View style={notificationStyles.modalContent}>
                    <View style={notificationStyles.modalHeader}>
                        <Text style={notificationStyles.modalTitle}>Notificaciones</Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            {unreadCount > 0 && (
                                <TouchableOpacity onPress={markAllAsRead}>
                                    <Text style={notificationStyles.markAllRead}>Marcar todas</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={() => setNotificationsModalVisible(false)}>
                                <Ionicons name="close" size={28} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {notifications.length > 0 ? (
                        <FlatList
                            data={notifications}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        notificationStyles.notificationItem,
                                        !item.isRead && notificationStyles.unreadNotification
                                    ]}
                                    onPress={() => {
                                        if (!item.isRead) markAsRead(item.id);
                                    }}
                                >
                                    <View style={notificationStyles.notificationIcon}>
                                        <Ionicons 
                                            name={
                                                item.type === 'post_deleted' ? 'trash' : 
                                                item.type === 'post_shared' ? 'repeat' : 
                                                'alert-circle'
                                            } 
                                            size={24} 
                                            color={
                                                item.type === 'post_deleted' ? '#ff3333' : 
                                                item.type === 'post_shared' ? '#00ff88' : 
                                                '#00aaff'
                                            } 
                                        />
                                    </View>
                                    
                                    <View style={notificationStyles.notificationContent}>
                                        <Text style={notificationStyles.notificationTitle}>
                                            {item.type === 'post_deleted' ? 'Publicación Eliminada' : 
                                             item.type === 'post_shared' ? 'Publicación Compartida' : 
                                             'Notificación'}
                                        </Text>
                                        <Text style={notificationStyles.notificationMessage}>
                                            {item.message}
                                        </Text>
                                        <Text style={notificationStyles.notificationDate}>
                                            {new Date(item.createdAt).toLocaleDateString('es-ES', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </Text>
                                    </View>
                                    
                                    {!item.isRead && (
                                        <View style={notificationStyles.unreadDot} />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    ) : (
                        <View style={notificationStyles.emptyState}>
                            <Ionicons name="notifications-off" size={60} color="#888" />
                            <Text style={notificationStyles.emptyText}>No tienes notificaciones</Text>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );

    const ConfirmDeleteModal = () => (
        <Modal
            animationType="fade"
            transparent={true}
            visible={confirmDeleteVisible}
            onRequestClose={() => {
                setConfirmDeleteVisible(false);
                setDeleteReason('');
            }}
        >
            <View style={modalStyles.centeredView}>
                <TouchableOpacity 
                    style={modalStyles.modalBackdrop}
                    activeOpacity={1}
                    onPress={() => {
                        setConfirmDeleteVisible(false);
                        setDeleteReason('');
                    }}
                />
                
                <View style={modalStyles.confirmModalView}>
                    <Ionicons name="warning-outline" size={50} color="#ff3333" style={{ marginBottom: 15 }} />
                    
                    <Text style={modalStyles.confirmTitle}>Confirmar Eliminación</Text>
                    <Text style={modalStyles.confirmMessage}>
                        ¿Por qué deseas eliminar esta publicación?
                    </Text>

                    <TextInput
                        style={modalStyles.textInput}
                        placeholder="Escribe la razón aquí..."
                        placeholderTextColor="#888"
                        value={deleteReason}
                        onChangeText={setDeleteReason}
                        multiline
                        numberOfLines={4}
                        maxLength={200}
                    />

                    <Text style={modalStyles.characterCount}>
                        {deleteReason.length}/200
                    </Text>

                    <View style={modalStyles.confirmButtonsContainer}>
                        <TouchableOpacity
                            style={[modalStyles.confirmButton, modalStyles.cancelConfirmButton]}
                            onPress={() => {
                                setConfirmDeleteVisible(false);
                                setDeleteReason('');
                            }}
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
            </View>
        </Modal>
    );

    const ConfirmReportModal = () => (
        <Modal
            animationType="fade"
            transparent={true}
            visible={confirmReportVisible}
            onRequestClose={() => {
                setConfirmReportVisible(false);
                setReportReason('');
            }}
        >
            <View style={modalStyles.centeredView}>
                <TouchableOpacity 
                    style={modalStyles.modalBackdrop}
                    activeOpacity={1}
                    onPress={() => {
                        setConfirmReportVisible(false);
                        setReportReason('');
                    }}
                />
                
                <View style={modalStyles.confirmModalView}>
                    <Ionicons name="flag-outline" size={50} color="#ffcc00" style={{ marginBottom: 15 }} />
                    
                    <Text style={modalStyles.confirmTitle}>Reportar Publicación</Text>
                    <Text style={modalStyles.confirmMessage}>
                        ¿Por qué deseas reportar esta publicación?
                    </Text>

                    <TextInput
                        style={modalStyles.textInput}
                        placeholder="Escribe la razón aquí..."
                        placeholderTextColor="#888"
                        value={reportReason}
                        onChangeText={setReportReason}
                        multiline
                        numberOfLines={4}
                        maxLength={200}
                    />

                    <Text style={modalStyles.characterCount}>
                        {reportReason.length}/200
                    </Text>

                    <View style={modalStyles.confirmButtonsContainer}>
                        <TouchableOpacity
                            style={[modalStyles.confirmButton, modalStyles.cancelConfirmButton]}
                            onPress={() => {
                                setConfirmReportVisible(false);
                                setReportReason('');
                            }}
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
            </View>
        </Modal>
    );

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
                    
                    {isModalPostOwner ? (
                        <TouchableOpacity
                            style={[modalStyles.button, modalStyles.deleteButton]}
                            onPress={() => deletePost(selectedPostId)}
                        >
                            <Ionicons name="trash-outline" size={24} color="#ff3333" />
                            <Text style={modalStyles.deleteText}>Eliminar Publicación</Text>
                        </TouchableOpacity>
                    ) : (
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

    const SuccessModal = () => (
        <Modal
            animationType="fade"
            transparent={true}
            visible={successModalVisible}
            onRequestClose={() => setSuccessModalVisible(false)}
        >
            <TouchableOpacity 
                style={modalStyles.centeredView} 
                activeOpacity={1}
                onPress={() => setSuccessModalVisible(false)}
            >
                <View style={modalStyles.successModalView}>
                    <Ionicons name="checkmark-circle" size={60} color="#00ff00" style={{ marginBottom: 15 }} />
                    
                    <Text style={modalStyles.successTitle}>Éxito</Text>
                    <Text style={modalStyles.successMessage}>{successMessage}</Text>

                    <TouchableOpacity
                        style={modalStyles.successButton}
                        onPress={() => setSuccessModalVisible(false)}
                    >
                        <Text style={modalStyles.successButtonText}>Aceptar</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    const ErrorModal = () => (
        <Modal
            animationType="fade"
            transparent={true}
            visible={errorModalVisible}
            onRequestClose={() => setErrorModalVisible(false)}
        >
            <TouchableOpacity 
                style={modalStyles.centeredView} 
                activeOpacity={1}
                onPress={() => setErrorModalVisible(false)}
            >
                <View style={modalStyles.errorModalView}>
                    <Ionicons name="close-circle" size={60} color="#ff3333" style={{ marginBottom: 15 }} />
                    
                    <Text style={modalStyles.errorTitle}>Error</Text>
                    <Text style={modalStyles.errorMessage}>{errorMessage}</Text>

                    <TouchableOpacity
                        style={modalStyles.errorButton}
                        onPress={() => setErrorModalVisible(false)}
                    >
                        <Text style={modalStyles.errorButtonText}>Aceptar</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    return ( 
        <SafeAreaView style={styles.container}>
            
            <View style={styles.header}>
                <Text style={styles.logo}>
                    Data<Text style={styles.sport}>Sport</Text>
                </Text>
                <Text style={styles.title}>Feed</Text>
                
                <TouchableOpacity 
                    style={styles.notificationButton}
                    onPress={() => setNotificationsModalVisible(true)}
                >
                    <Ionicons name="notifications" size={28} color="#fff" />
                    
                    {unreadCount > 0 && (
                        <View style={styles.notificationBadge}>
                            <Text style={styles.notificationBadgeText}>
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
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

            <ShareModal />              
            <NotificationsModal />      
            <PostOptionsModal />        
            <ConfirmDeleteModal />    
            <ConfirmReportModal />    
            <SuccessModal />          
            <ErrorModal />            
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1,
        backgroundColor: '#000000',
        paddingTop: 0,
    },
    
    header: {
        alignItems: "center",
        marginBottom: 20,
        paddingHorizontal: 20,
        paddingTop: 40,
        position: 'relative',
    },
    
    logo: { 
        fontSize: 32, 
        fontWeight: "bold", 
        color: "#ff0000"
    },
    
    sport: { 
        color: "#00aaff"
    },
    
    title: { 
        fontSize: 22, 
        fontWeight: "bold", 
        color: "#fff", 
        marginTop: 5 
    },
    
    notificationButton: {
        position: 'absolute',
        right: 20,
        top: 45,
        padding: 5,
    },
    
    notificationBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#ff0000',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#000',
    },
    
    notificationBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    
    subtitle: { 
        fontSize: 16, 
        color: "#eee", 
        marginBottom: 10, 
        textAlign: "center" 
    },
    
    subtitleSmall: { 
        fontSize: 14, 
        color: "#bbb", 
        textAlign: "center" 
    },
    
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
        backgroundColor: '#000000',
        borderRadius: 12,
        marginTop: 20,
        borderWidth: 1,
        borderColor: '#00aaff55'
    }
});

const shareModalStyles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    
    modalView: {
        backgroundColor: '#1a1a1a',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
    },
    
    description: {
        fontSize: 15,
        color: '#ccc',
        marginBottom: 15,
    },
    
    textInput: {
        backgroundColor: '#252525',
        borderRadius: 10,
        padding: 15,
        color: '#fff',
        fontSize: 16,
        minHeight: 120,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: '#333',
        marginBottom: 5,
    },
    
    characterCount: {
        alignSelf: 'flex-end',
        color: '#888',
        fontSize: 12,
        marginBottom: 20,
    },
    
    shareButton: {
        backgroundColor: '#00ff88',
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    
    shareButtonDisabled: {
        backgroundColor: '#888',
    },
    
    shareButtonText: {
        color: '#000',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

const notificationStyles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
    },
    
    modalContent: {
        flex: 1,
        backgroundColor: '#1a1a1a',
        marginTop: 60,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    
    markAllRead: {
        color: '#00aaff',
        fontSize: 14,
        fontWeight: '600',
    },
    
    notificationItem: {
        flexDirection: 'row',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        alignItems: 'center',
    },
    
    unreadNotification: {
        backgroundColor: '#252525',
    },
    
    notificationIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#2a2a2a',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    
    notificationContent: {
        flex: 1,
    },
    
    notificationTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 5,
    },
    
    notificationMessage: {
        fontSize: 14,
        color: '#ccc',
        lineHeight: 20,
        marginBottom: 5,
    },
    
    notificationDate: {
        fontSize: 12,
        color: '#888',
    },
    
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#00aaff',
        marginLeft: 10,
    },
    
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    
    emptyText: {
        color: '#888',
        fontSize: 16,
        marginTop: 15,
    },
});

const modalStyles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    
    modalBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    
    modalView: {
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        padding: 20,
        width: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 10,
        marginVertical: 5,
    },
    
    deleteButton: {
        backgroundColor: '#ff333320',
    },
    
    reportButton: {
        backgroundColor: '#ffcc0020',
    },
    
    cancelButton: {
        backgroundColor: '#33333350',
    },
    
    deleteText: {
        color: '#ff3333',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 10,
    },
    
    reportText: {
        color: '#ffcc00',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 10,
    },
    
    cancelText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        width: '100%',
    },
    
    separator: {
        height: 1,
        backgroundColor: '#333',
        marginVertical: 10,
    },
    
    confirmModalView: {
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        padding: 25,
        width: '85%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 1,
    },
    
    confirmTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 15,
        textAlign: 'center',
    },
    
    confirmMessage: {
        fontSize: 15,
        color: '#ccc',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 15,
    },
    
    textInput: {
        width: '100%',
        backgroundColor: '#252525',
        borderRadius: 10,
        padding: 15,
        color: '#fff',
        fontSize: 15,
        minHeight: 100,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: '#333',
        marginBottom: 5,
    },
    
    characterCount: {
        alignSelf: 'flex-end',
        color: '#888',
        fontSize: 12,
        marginBottom: 15,
    },
    
    confirmButtonsContainer: {
        flexDirection: 'row',
        gap: 10,
        width: '100%',
    },
    
    confirmButton: {
        flex: 1,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    
    cancelConfirmButton: {
        backgroundColor: '#33333380',
    },
    
    deleteConfirmButton: {
        backgroundColor: '#ff3333',
    },
    
    reportConfirmButton: {
        backgroundColor: '#ffcc00',
    },
    
    cancelConfirmText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    
    deleteConfirmText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    
    reportConfirmText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '600',
    },

    successModalView: {
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        padding: 30,
        width: '85%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    
    successTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#00ff00',
        marginBottom: 10,
    },
    
    successMessage: {
        fontSize: 15,
        color: '#ccc',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20,
    },
    
    successButton: {
        backgroundColor: '#00ff00',
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 10,
        marginTop: 10,
    },
    
    successButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
    
    errorModalView: {
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        padding: 30,
        width: '85%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    
    errorTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#ff3333',
        marginBottom: 10,
    },
    
    errorMessage: {
        fontSize: 15,
        color: '#ccc',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20,
    },
    
    errorButton: {
        backgroundColor: '#ff3333',
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 10,
        marginTop: 10,
    },
    
    errorButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});