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
    SafeAreaView,
    Modal,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons"; 
import AsyncStorage from "@react-native-async-storage/async-storage"; 

const API_BASE_URL = "http://localhost:3000"; 

// --- Componente de Tarjeta de Publicación ---
const PostCard = ({ post, navigation, onLikeToggle, currentUserId, isPostOwner, handleOptions }) => {
    const [isLiked, setIsLiked] = useState(post.isLikedByCurrentUser || false);
    const [likeCount, setLikeCount] = useState(post.likeCount || 0);

    const navigateToAuthorProfile = () => {
        if (post.authorId) {
            navigation.navigate('Profile', { userId: post.authorId }); 
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
            Alert.alert("Error", "No se pudo registrar tu 'Me gusta'.");
        }
    };

    const navigateToComments = () => {
        navigation.navigate('Comments', { postId: post.id });
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
    
    return (
        <View style={postStyles.postCard}> 
            <View style={postStyles.postHeader}>
                <View style={postStyles.authorInfo}> 
                    <Image
                        source={{ uri: post.authorProfilePic || 'https://i.imgur.com/k6KxI1x.png' }}
                        style={postStyles.authorImage}
                    />
                    <TouchableOpacity onPress={navigateToAuthorProfile}>
                        <Text style={postStyles.authorUsername}>{post.authorUsername || 'Usuario Desconocido'}</Text>
                    </TouchableOpacity>
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
            
            <Text style={postStyles.postContent}>{post.content}</Text>
            
            {post.imageUrl && (
                <TouchableOpacity onPress={navigateToImgCompleta}>
                    <Image 
                        source={{ uri: post.imageUrl }} 
                        style={postStyles.postImage} 
                        onError={(e) => { 
                            console.log('❌ Error al cargar imagen:', post.imageUrl);
                        }}
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

// --- Estilos de la tarjeta ---
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
    optionsButton: {
        padding: 5,
        marginLeft: 10,
    }
});

// --- Componente Principal ---
export default function HomeScreen({ navigation }) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState(null); 

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState(null);
    const [isModalPostOwner, setIsModalPostOwner] = useState(false);

    const getUserId = async () => {
        const id = await AsyncStorage.getItem("userId");
        setCurrentUserId(id);
    };

    // Estados adicionales para modales de confirmación
    const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
    const [confirmReportVisible, setConfirmReportVisible] = useState(false);
    const [successModalVisible, setSuccessModalVisible] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorModalVisible, setErrorModalVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

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
                body: JSON.stringify({ userId: currentUserId }),
            });

            if (response.ok) {
                setPosts(prevPosts => prevPosts.filter(p => p.id !== selectedPostId));
                Alert.alert("Éxito", "Publicación eliminada correctamente.");
            } else {
                const data = await response.json().catch(() => ({}));
                Alert.alert("Error", data.error || "No se pudo eliminar la publicación.");
            }
        } catch (error) {
            console.error("Error al eliminar:", error);
            Alert.alert("Error", "Error de conexión.");
        }
    }, [selectedPostId, currentUserId]);

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
                body: JSON.stringify({ reporterId: currentUserId }),
            });

            if (response.ok) {
                Alert.alert("Reporte Enviado", "Gracias. Revisaremos la publicación pronto.");
            } else {
                const data = await response.json().catch(() => ({}));
                Alert.alert("Error", data.error || "No se pudo enviar el reporte.");
            }
        } catch (error) {
            console.error("Error al reportar:", error);
            Alert.alert("Error", "Error de conexión.");
        }
    }, [selectedPostId, currentUserId]);

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
            />
        );
    };

    // --- MODAL DE CONFIRMACIÓN DE ELIMINACIÓN ---
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

    // --- MODAL DE CONFIRMACIÓN DE REPORTE ---
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

    // --- MODAL DE ÉXITO ---
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

    // --- MODAL DE ERROR ---
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

            <PostOptionsModal />
            <ConfirmDeleteModal />
            <ConfirmReportModal />
            <SuccessModal />
            <ErrorModal />
        </SafeAreaView>
    );
}

// --- ESTILOS DEL MODAL ---
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
    // Estilos para modales de confirmación
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
    },
    // Estilos para modal de éxito
    successModalView: {
        width: '85%',
        margin: 20,
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        padding: 25,
        alignItems: 'center',
        shadowColor: '#00ff00',
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
        textAlign: 'center',
    },
    successMessage: {
        fontSize: 16,
        color: '#ccc',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 22,
    },
    successButton: {
        backgroundColor: '#00ff00',
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 15,
        width: '100%',
        alignItems: 'center',
    },
    successButtonText: {
        color: '#1a1a1a',
        fontWeight: 'bold',
        fontSize: 16,
    },
    // Estilos para modal de error
    errorModalView: {
        width: '85%',
        margin: 20,
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        padding: 25,
        alignItems: 'center',
        shadowColor: '#ff3333',
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
        textAlign: 'center',
    },
    errorMessage: {
        fontSize: 16,
        color: '#ccc',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 22,
    },
    errorButton: {
        backgroundColor: '#ff3333',
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 15,
        width: '100%',
        alignItems: 'center',
    },
    errorButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    }
});

// --- ESTILOS PRINCIPALES ---
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
        backgroundColor: '#000000',
        borderRadius: 12,
        marginTop: 20,
        borderWidth: 1,
        borderColor: '#00aaff55'
    }
});