import React, { useState, useEffect, useCallback } from "react";
import { 
    View, 
    Text, 
    StyleSheet, 
    ActivityIndicator, 
    Alert, 
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "http://localhost:3000"; 

// --- Componente para mostrar un solo comentario ---
const CommentItem = ({ comment }) => {
    return (
        <View style={commentStyles.commentContainer}>
            <Text style={commentStyles.authorUsername}>
                {comment.authorUsername || 'Usuario Anónimo'}
            </Text>
            <Text style={commentStyles.commentContent}>
                {comment.content}
            </Text>
            <Text style={commentStyles.commentDate}>
                {new Date(comment.createdAt).toLocaleDateString()}
            </Text>
        </View>
    );
};

// --- Componente Principal ---
export default function CommentsScreen({ route, navigation }) {
    const { postId } = route.params;

    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);

    useEffect(() => {
        const loadInitialData = async () => {
            const userId = await AsyncStorage.getItem("userId");
            setCurrentUserId(userId);
            fetchComments();
        };
        loadInitialData();
    }, []);

    const fetchComments = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`);

            if (response.ok) {
                const data = await response.json();
                setComments(data.comments || []); 
            } else {
                Alert.alert("Error", "No se pudieron cargar los comentarios.");
                setComments([]);
            }
        } catch (error) {
            console.error("Error de conexión al obtener comentarios:", error);
            Alert.alert("Error", "Problema de conexión con el servidor.");
        } finally {
            setLoading(false);
        }
    }, [postId]);

    const handleSendComment = async () => {
        if (!currentUserId) {
            Alert.alert("Error", "Debes iniciar sesión para comentar.");
            return;
        }
        if (newComment.trim().length === 0) {
            Alert.alert("Atención", "El comentario no puede estar vacío.");
            return;
        }

        setIsSending(true);
        
        try {
            const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: currentUserId,
                    content: newComment.trim(),
                }),
            });

            if (response.ok) {
                const data = await response.json();
                Alert.alert("Éxito", "Comentario publicado.");
                setNewComment('');
                
                // Añadir el comentario al final del array (aparecerá abajo)
                setComments(prevComments => [...prevComments, data.newComment]); 

            } else {
                Alert.alert("Error", "Error al enviar el comentario.");
            }
        } catch (error) {
            console.error("Error al enviar el comentario:", error);
            Alert.alert("Error de Conexión", "No se pudo contactar al servidor.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header fuera del KeyboardAvoidingView */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>Comentarios</Text>
            </View>

            {/* KeyboardAvoidingView solo para el contenido y el input */}
            <KeyboardAvoidingView 
                style={styles.content}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
            >
                {loading ? (
                    <ActivityIndicator size="large" color="#00aaff" style={styles.loading} />
                ) : (
                    <FlatList
                        data={comments}
                        keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                        renderItem={({ item }) => <CommentItem comment={item} />}
                        contentContainerStyle={[
                            styles.listContent,
                            comments.length === 0 && styles.listContentEmpty
                        ]}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>
                                    ¡Sé el primero en comentar!
                                </Text>
                            </View>
                        )}
                    />
                )}

                {/* Área de Input para Comentar */}
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.commentInput}
                        placeholder="Escribe tu comentario..."
                        placeholderTextColor="#999"
                        value={newComment}
                        onChangeText={setNewComment}
                        editable={!isSending && !loading}
                        multiline={true}
                    />
                    <TouchableOpacity 
                        style={[
                            styles.sendButton, 
                            (newComment.trim().length === 0 || isSending) && styles.sendButtonDisabled
                        ]}
                        onPress={handleSendComment}
                        disabled={newComment.trim().length === 0 || isSending}
                    >
                        {isSending ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Ionicons name="send" size={24} color="#fff" />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

// --- Estilos de la pantalla de comentarios ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        paddingTop: 50,
        paddingBottom: 15,
        paddingHorizontal: 20,
        backgroundColor: '#111',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    backButton: {
        position: 'absolute',
        left: 20,
        top: 50,
        zIndex: 10,
    },
    content: {
        flex: 1,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
    },
    listContent: {
        paddingHorizontal: 15,
        paddingTop: 10,
        paddingBottom: 10,
    },
    listContentEmpty: {
        flexGrow: 1,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
    },
    emptyText: {
        color: '#eee',
        fontSize: 16,
        textAlign: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#1a1a1a',
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    commentInput: {
        flex: 1,
        minHeight: 40,
        maxHeight: 100,
        backgroundColor: '#222',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingTop: Platform.OS === 'ios' ? 10 : 8,
        paddingBottom: Platform.OS === 'ios' ? 10 : 8,
        color: '#fff',
        marginRight: 10,
        fontSize: 16,
    },
    sendButton: {
        backgroundColor: '#00aaff',
        borderRadius: 25,
        width: 45,
        height: 45,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#555',
    },
});

// --- Estilos del Comentario Individual ---
const commentStyles = StyleSheet.create({
    commentContainer: {
        backgroundColor: '#1a1a1a',
        padding: 10,
        borderRadius: 8,
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#ff0000',
    },
    authorUsername: {
        color: '#ff0000',
        fontWeight: 'bold',
        fontSize: 14,
        marginBottom: 4,
    },
    commentContent: {
        color: '#eee',
        fontSize: 16,
    },
    commentDate: {
        color: '#888',
        fontSize: 11,
        marginTop: 5,
        textAlign: 'right',
    },
});