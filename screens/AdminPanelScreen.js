import React, { useState, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    View,
    Text,
    StyleSheet,
    ImageBackground,
    ActivityIndicator,
    TouchableOpacity,
    ScrollView,
    FlatList,
    StatusBar,
    RefreshControl,
    Image,
    Modal,
    TextInput,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "http://localhost:3000";

// COMPONENTE PRINCIPAL: AdminPanelScreen
export default function AdminPanelScreen() {
    const navigation = useNavigation();
    const fondoLogin = require("../assets/fondoLogin.jpg");

    // 1. ESTADOS DE INTERFAZ Y DATOS
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('reportedPosts');
    
    // Data del Panel
    const [reportedPosts, setReportedPosts] = useState([]);
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalPosts: 0,
        totalReports: 0,
        activeUsers: 0,
    });

    // 2. ESTADOS DE MODALES Y ACCIÓN
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [dismissModalVisible, setDismissModalVisible] = useState(false);
    const [suspendModalVisible, setSuspendModalVisible] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState(null);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [selectedUserStatus, setSelectedUserStatus] = useState(null);
    const [deleteReason, setDeleteReason] = useState(''); // Estado para la razón de eliminación
    
    // Modales de feedback
    const [successModalVisible, setSuccessModalVisible] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorModalVisible, setErrorModalVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // 🛡️ LÓGICA DE SEGURIDAD Y CARGA DE DATOS

    // Verificar Permisos de Administrador 
    const checkAdminStatus = async () => {
        try {
            const userId = await AsyncStorage.getItem("userId");
            if (!userId) {
                setErrorMessage("Debes iniciar sesión.");
                setErrorModalVisible(true);
                setTimeout(() => navigation.goBack(), 2000);
                return false;
            }

            const response = await fetch(`${API_BASE_URL}/profile/${userId}`);
            if (response.ok) {
                const data = await response.json();
                if (data.user.rol_id !== 2) {
                    setErrorMessage("No tienes permisos de administrador.");
                    setErrorModalVisible(true);
                    setTimeout(() => navigation.goBack(), 2000);
                    return false;
                }
                return true;
            }
        } catch (error) {
            console.error("Error al verificar admin:", error);
            setErrorMessage("No se pudo verificar permisos.");
            setErrorModalVisible(true);
            return false;
        }
    };

    // Cargar Publicaciones Reportadas
    const fetchReportedPosts = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/reported-posts`);
            if (response.ok) {
                const data = await response.json();
                setReportedPosts(data.posts || []);
            }
        } catch (error) {
            console.error("Error al cargar posts reportados:", error);
        }
    };

    // Cargar Lista de Usuarios
    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/users`);
            if (response.ok) {
                const data = await response.json();
                setUsers(data.users || []);
            }
        } catch (error) {
            console.error("Error al cargar usuarios:", error);
        }
    };

    // Cargar Estadísticas Globales
    const fetchStats = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/stats`);
            if (response.ok) {
                const data = await response.json();
                setStats(data || {
                    totalUsers: 0,
                    totalPosts: 0,
                    totalReports: 0,
                    activeUsers: 0,
                });
            }
        } catch (error) {
            console.error("Error al cargar estadísticas:", error);
        }
    };

    // Carga Inicial de Datos 
    const loadData = async () => {
        const isAdmin = await checkAdminStatus();
        if (!isAdmin) return;

        setLoading(true);
        await Promise.all([
            fetchReportedPosts(),
            fetchUsers(),
            fetchStats(),
        ]);
        setLoading(false);
    };

    // Refrescar Datos
    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    // Cargar datos al enfocar la pantalla
    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    // LÓGICA DE ACCIONES (MANEJO DE REPORTES)

    // Iniciar Modal de Eliminación (Recoge el ID y prepara la razón)
    const handleDeletePost = (postId) => {
        setSelectedPostId(postId);
        setDeleteReason('');
        setDeleteModalVisible(true);
    };

    // Ejecutar Eliminación de Publicación 
    const executeDeletePost = async () => {
        if (!deleteReason.trim()) {
            setErrorMessage("Debes ingresar una razón para eliminar la publicación.");
            setErrorModalVisible(true);
            return;
        }

        setDeleteModalVisible(false);

        try {
            const userId = await AsyncStorage.getItem("userId");
            const response = await fetch(`${API_BASE_URL}/admin/posts/${selectedPostId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    adminId: userId,
                    reason: deleteReason 
                }), // Envía adminId y la razón
            });

            if (response.ok) {
                setSuccessMessage("Publicación eliminada correctamente.");
                setSuccessModalVisible(true);
                fetchReportedPosts(); // Refresca lista de reportes
                fetchStats(); // Refresca el contador de reportes
            } else {
                const data = await response.json().catch(() => ({}));
                setErrorMessage(data.error || "No se pudo eliminar la publicación.");
                setErrorModalVisible(true);
            }
        } catch (error) {
            console.error("Error al eliminar post:", error);
            setErrorMessage("Error de conexión.");
            setErrorModalVisible(true);
        }
    };

    // Iniciar Modal de Descarte de Reporte
    const handleDismissReport = (postId) => {
        setSelectedPostId(postId);
        setDismissModalVisible(true);
    };

    // Ejecutar Descarte de Reporte
    const executeDismissReport = async () => {
        setDismissModalVisible(false);

        try {
            const userId = await AsyncStorage.getItem("userId");
            const response = await fetch(`${API_BASE_URL}/admin/reports/${selectedPostId}/dismiss`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminId: userId }),
            });

            if (response.ok) {
                setSuccessMessage("Reporte descartado correctamente.");
                setSuccessModalVisible(true);
                fetchReportedPosts(); // Refresca lista de reportes
            } else {
                const data = await response.json().catch(() => ({}));
                setErrorMessage(data.error || "No se pudo descartar el reporte.");
                setErrorModalVisible(true);
            }
        } catch (error) {
            console.error("Error al descartar reporte:", error);
            setErrorMessage("Error de conexión.");
            setErrorModalVisible(true);
        }
    };

    // LÓGICA DE ACCIONES (GESTOR DE USUARIOS)

    // Iniciar Modal de Suspensión o Activación
    const handleToggleUserStatus = (userId, currentStatus) => {
        setSelectedUserId(userId);
        setSelectedUserStatus(currentStatus);
        setSuspendModalVisible(true);
    };

    // Ejecutar Cambio de Estado de Usuario
    const executeToggleUserStatus = async () => {
        setSuspendModalVisible(false);

        try {
            const adminId = await AsyncStorage.getItem("userId");
            const response = await fetch(`${API_BASE_URL}/admin/users/${selectedUserId}/toggle-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminId }),
            });

            if (response.ok) {
                const action = selectedUserStatus === 'active' ? 'suspendido' : 'activado';
                setSuccessMessage(`Usuario ${action} correctamente.`);
                setSuccessModalVisible(true);
                fetchUsers(); // Refresca la lista de usuarios
            } else {
                const data = await response.json().catch(() => ({}));
                setErrorMessage(data.error || "No se pudo cambiar el estado del usuario.");
                setErrorModalVisible(true);
            }
        } catch (error) {
            console.error("Error al cambiar estado de usuario:", error);
            setErrorMessage("Error de conexión.");
            setErrorModalVisible(true);
        }
    };

    // RENDERIZADO DE ELEMENTOS DE LISTA

    // Tarjeta de Publicación Reportada
    const renderReportedPost = ({ item }) => (
        <View style={styles.reportCard}>
            <View style={styles.reportHeader}>
                <Image
                    source={{ uri: item.authorProfilePic || 'https://i.imgur.com/k6KxI1x.png' }}
                    style={styles.reportAuthorImage}
                />
                <View style={styles.reportAuthorInfo}>
                    <Text style={styles.reportAuthorName}>@{item.authorUsername}</Text>
                    <Text style={styles.reportCount}>
                        <Ionicons name="flag" size={14} color="#ff3333" /> {item.reportCount} reporte(s)
                    </Text>
                </View>
            </View>

            <Text style={styles.reportContent} numberOfLines={3}>{item.content}</Text>
            
            {item.imageUrl && (
                <Image source={{ uri: item.imageUrl }} style={styles.reportImage} />
            )}

            <View style={styles.reportActions}>
                <TouchableOpacity
                    style={[styles.reportActionButton, styles.dismissButton]}
                    onPress={() => handleDismissReport(item.id)}
                >
                    <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
                    <Text style={styles.dismissButtonText}>Descartar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.reportActionButton, styles.deleteButton]}
                    onPress={() => handleDeletePost(item.id)}
                >
                    <Ionicons name="trash-outline" size={20} color="#ff3333" />
                    <Text style={styles.deleteButtonText}>Eliminar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // Tarjeta de Usuario (con botón de Suspensión)
    const renderUser = ({ item }) => (
        <View style={styles.userCard}>
            <Image
                source={{ uri: item.foto_perfil || 'https://i.imgur.com/k6KxI1x.png' }}
                style={styles.userImage}
            />
            <View style={styles.userInfo}>
                <Text style={styles.userName}>@{item.nombre_usuario}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
                <Text style={styles.userRole}>
                    {item.rol_id === 2 ? 'Administrador' : 'Usuario'}
                </Text>
            </View>
            
            {/* Botón de acción solo para usuarios normales */}
            {item.rol_id !== 2 && (
                <TouchableOpacity
                    style={[
                        styles.statusButton,
                        item.estado === 'suspended' ? styles.activateButton : styles.suspendButton
                    ]}
                    onPress={() => handleToggleUserStatus(item.id_usuario, item.estado || 'active')}
                >
                    <Ionicons 
                        name={item.estado === 'suspended' ? "checkmark-circle" : "ban"} 
                        size={20} 
                        color="#fff" 
                    />
                    <Text style={styles.statusButtonText}>
                        {item.estado === 'suspended' ? 'Activar' : 'Suspender'}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );

    // Grid de Estadísticas
    const renderStats = () => (
        <View style={styles.statsContainer}>
            <View style={styles.statCard}>
                <Ionicons name="people" size={40} color="#00aaff" />
                <Text style={styles.statNumber}>{stats.totalUsers}</Text>
                <Text style={styles.statLabel}>Total Usuarios</Text>
            </View>

            <View style={styles.statCard}>
                <Ionicons name="document-text" size={40} color="#4CAF50" />
                <Text style={styles.statNumber}>{stats.totalPosts}</Text>
                <Text style={styles.statLabel}>Total Publicaciones</Text>
            </View>

            <View style={styles.statCard}>
                <Ionicons name="flag" size={40} color="#ff3333" />
                <Text style={styles.statNumber}>{stats.totalReports}</Text>
                <Text style={styles.statLabel}>Reportes Activos</Text>
            </View>

            <View style={styles.statCard}>
                <Ionicons name="pulse" size={40} color="#FFD700" />
                <Text style={styles.statNumber}>{stats.activeUsers}</Text>
                <Text style={styles.statLabel}>Usuarios Activos</Text>
            </View>
        </View>
    );

    // 💡 MODALES DE CONFIRMACIÓN Y FEEDBACK

    // Modal: Confirmación de Eliminación con Campo de Razón
    const DeletePostModal = () => (
        <Modal
            animationType="fade"
            transparent={true}
            visible={deleteModalVisible}
            onRequestClose={() => {
                setDeleteModalVisible(false);
                setDeleteReason('');
            }}
        >
            <TouchableOpacity 
                style={modalStyles.centeredView} 
                activeOpacity={1}
                onPress={() => {
                    setDeleteModalVisible(false);
                    setDeleteReason('');
                }}
            >
                <TouchableOpacity 
                    activeOpacity={1}
                    onPress={(e) => e.stopPropagation()} // Previene el cierre al tocar el modal
                    style={modalStyles.confirmModalView}
                >
                    <Ionicons name="trash-outline" size={50} color="#ff3333" style={{ marginBottom: 15 }} />
                    
                    <Text style={modalStyles.confirmTitle}>Eliminar Publicación</Text>
                    <Text style={modalStyles.confirmMessage}>
                        Explica por qué se eliminará esta publicación. El usuario recibirá una notificación.
                    </Text>

                    <TextInput
                        style={modalStyles.reasonInput}
                        placeholder="Ej: Contenido inapropiado, spam, violación de normas..."
                        placeholderTextColor="#666"
                        value={deleteReason}
                        onChangeText={setDeleteReason}
                        multiline
                        numberOfLines={4}
                        maxLength={200}
                    />
                    <Text style={modalStyles.charCount}>{deleteReason.length}/200</Text>

                    <View style={modalStyles.confirmButtonsContainer}>
                        <TouchableOpacity
                            style={[modalStyles.confirmButton, modalStyles.cancelConfirmButton]}
                            onPress={() => {
                                setDeleteModalVisible(false);
                                setDeleteReason('');
                            }}
                        >
                            <Text style={modalStyles.cancelConfirmText}>Cancelar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[modalStyles.confirmButton, modalStyles.deleteConfirmButton]}
                            onPress={executeDeletePost}
                        >
                            <Text style={modalStyles.deleteConfirmText}>Eliminar</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );

    // Modal: Confirmación de Descarte de Reporte
    const DismissReportModal = () => (
        <Modal
            animationType="fade"
            transparent={true}
            visible={dismissModalVisible}
            onRequestClose={() => setDismissModalVisible(false)}
        >
            <TouchableOpacity 
                style={modalStyles.centeredView} 
                activeOpacity={1}
                onPress={() => setDismissModalVisible(false)}
            >
                <TouchableOpacity 
                    activeOpacity={1}
                    onPress={(e) => e.stopPropagation()}
                    style={modalStyles.confirmModalView}
                >
                    <Ionicons name="checkmark-circle-outline" size={50} color="#4CAF50" style={{ marginBottom: 15 }} />
                    
                    <Text style={modalStyles.confirmTitle}>Descartar Reporte</Text>
                    <Text style={modalStyles.confirmMessage}>
                        ¿Estás seguro de que quieres descartar este reporte? La publicación se mantendrá activa.
                    </Text>

                    <View style={modalStyles.confirmButtonsContainer}>
                        <TouchableOpacity
                            style={[modalStyles.confirmButton, modalStyles.cancelConfirmButton]}
                            onPress={() => setDismissModalVisible(false)}
                        >
                            <Text style={modalStyles.cancelConfirmText}>Cancelar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[modalStyles.confirmButton, modalStyles.successConfirmButton]}
                            onPress={executeDismissReport}
                        >
                            <Text style={modalStyles.successConfirmText}>Descartar</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );

    // Modal: Confirmación de Suspensión o Activación de Usuario
    const SuspendUserModal = () => (
        <Modal
            animationType="fade"
            transparent={true}
            visible={suspendModalVisible}
            onRequestClose={() => setSuspendModalVisible(false)}
        >
            <TouchableOpacity 
                style={modalStyles.centeredView} 
                activeOpacity={1}
                onPress={() => setSuspendModalVisible(false)}
            >
                <TouchableOpacity 
                    activeOpacity={1}
                    onPress={(e) => e.stopPropagation()}
                    style={modalStyles.confirmModalView}
                >
                    <Ionicons 
                        name={selectedUserStatus === 'active' ? "ban" : "checkmark-circle"} 
                        size={50} 
                        color={selectedUserStatus === 'active' ? "#ff3333" : "#4CAF50"} 
                        style={{ marginBottom: 15 }} 
                    />
                    
                    <Text style={modalStyles.confirmTitle}>
                        {selectedUserStatus === 'active' ? 'Suspender Usuario' : 'Activar Usuario'}
                    </Text>
                    <Text style={modalStyles.confirmMessage}>
                        {selectedUserStatus === 'active' 
                            ? '¿Estás seguro de que quieres suspender este usuario? No podrá acceder a la plataforma.'
                            : '¿Estás seguro de que quieres activar este usuario? Podrá volver a acceder a la plataforma.'
                        }
                    </Text>

                    <View style={modalStyles.confirmButtonsContainer}>
                        <TouchableOpacity
                            style={[modalStyles.confirmButton, modalStyles.cancelConfirmButton]}
                            onPress={() => setSuspendModalVisible(false)}
                        >
                            <Text style={modalStyles.cancelConfirmText}>Cancelar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                modalStyles.confirmButton, 
                                selectedUserStatus === 'active' ? modalStyles.deleteConfirmButton : modalStyles.successConfirmButton
                            ]}
                            onPress={executeToggleUserStatus}
                        >
                            <Text style={selectedUserStatus === 'active' ? modalStyles.deleteConfirmText : modalStyles.successConfirmText}>
                                {selectedUserStatus === 'active' ? 'Suspender' : 'Activar'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );

    // Modal: Feedback de Éxito
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
                    <Ionicons name="checkmark-circle" size={60} color="#1600a4ff" style={{ marginBottom: 15 }} />
                    
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

    // Modal: Feedback de Error
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

    // Pantalla de Carga Inicial
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#00aaff" />
                <Text style={styles.loadingText}>Cargando panel...</Text>
            </View>
        );
    }

    // ESTRUCTURA PRINCIPAL DEL PANEL

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="black" />
            <ImageBackground source={fondoLogin} style={styles.background}>
                <View style={styles.overlay}>
                    {/* Encabezado y Navegación */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={28} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Panel de Administración</Text>
                        <View style={styles.adminBadge}>
                            <Ionicons name="shield-checkmark" size={20} color="#FFD700" />
                        </View>
                    </View>

                    {/* Controles de Pestañas (Tabs) */}
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
                            onPress={() => setActiveTab('stats')}
                        >
                            <Ionicons 
                                name="stats-chart" 
                                size={20} 
                                color={activeTab === 'stats' ? '#00aaff' : '#888'} 
                            />
                            <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>
                                Estadísticas
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'reportedPosts' && styles.activeTab]}
                            onPress={() => setActiveTab('reportedPosts')}
                        >
                            <Ionicons 
                                name="flag" 
                                size={20} 
                                color={activeTab === 'reportedPosts' ? '#00aaff' : '#888'} 
                            />
                            <Text style={[styles.tabText, activeTab === 'reportedPosts' && styles.activeTabText]}>
                                Reportes
                            </Text>
                            {/* Insignia de conteo de reportes pendientes */}
                            {reportedPosts.length > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{reportedPosts.length}</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'users' && styles.activeTab]}
                            onPress={() => setActiveTab('users')}
                        >
                            <Ionicons 
                                name="people" 
                                size={20} 
                                color={activeTab === 'users' ? '#00aaff' : '#888'} 
                            />
                            <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
                                Usuarios
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Contenido de la Pestaña Activa */}
                    <ScrollView
                        style={styles.content}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor="#00aaff"
                                colors={["#00aaff"]}
                            />
                        }
                    >
                        {activeTab === 'stats' && renderStats()}

                        {activeTab === 'reportedPosts' && (
                            <View>
                                {reportedPosts.length > 0 ? (
                                    <FlatList
                                        data={reportedPosts}
                                        keyExtractor={(item) => item.id.toString()}
                                        renderItem={renderReportedPost}
                                        scrollEnabled={false}
                                    />
                                ) : (
                                    <View style={styles.emptyState}>
                                        <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
                                        <Text style={styles.emptyText}>No hay reportes pendientes</Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {activeTab === 'users' && (
                            <View>
                                {users.length > 0 ? (
                                    <FlatList
                                        data={users}
                                        keyExtractor={(item) => item.id_usuario.toString()}
                                        renderItem={renderUser}
                                        scrollEnabled={false}
                                    />
                                ) : (
                                    <View style={styles.emptyState}>
                                        <Ionicons name="people" size={60} color="#888" />
                                        <Text style={styles.emptyText}>No hay usuarios</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </ScrollView>
                </View>
            </ImageBackground>

            {/* Invocación de Modales */}
            <DeletePostModal />
            <DismissReportModal />
            <SuspendUserModal />
            <SuccessModal />
            <ErrorModal />
        </SafeAreaView>
    );
}

// ESTILOS DEL COMPONENTE Y MODALES

const modalStyles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
        marginBottom: 20,
        lineHeight: 22,
    },
    reasonInput: {
        width: '100%',
        backgroundColor: '#2a2a2a',
        borderRadius: 10,
        padding: 15,
        color: '#fff',
        fontSize: 16,
        minHeight: 100,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: '#444',
        marginBottom: 5,
    },
    charCount: {
        alignSelf: 'flex-end',
        color: '#888',
        fontSize: 12,
        marginBottom: 20,
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
    successConfirmButton: {
        backgroundColor: '#4CAF50',
    },
    successConfirmText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    background: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.85)',
    },
    loadingText: {
        color: '#fff',
        marginTop: 10,
        fontSize: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        paddingTop: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        flex: 1,
        textAlign: 'center',
    },
    adminBadge: {
        backgroundColor: 'rgba(255, 215, 0, 0.2)',
        padding: 8,
        borderRadius: 20,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 5,
        margin: 15,
        borderRadius: 15,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        position: 'relative',
    },
    activeTab: {
        backgroundColor: 'rgba(0, 170, 255, 0.2)',
    },
    tabText: {
        color: '#888',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 5,
    },
    activeTabText: {
        color: '#00aaff',
    },
    badge: {
        position: 'absolute',
        top: 5,
        right: 10,
        backgroundColor: '#ff3333',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        minWidth: 20,
        alignItems: 'center',
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        padding: 15,
    },
    statsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    statCard: {
        width: '48%',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 15,
        padding: 20,
        alignItems: 'center',
        marginBottom: 15,
    },
    statNumber: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 10,
    },
    statLabel: {
        fontSize: 14,
        color: '#ccc',
        marginTop: 5,
        textAlign: 'center',
    },
    reportCard: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        borderLeftWidth: 4,
        borderLeftColor: '#ff3333',
    },
    reportHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    reportAuthorImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
    },
    reportAuthorInfo: {
        flex: 1,
    },
    reportAuthorName: {
        color: '#00aaff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    reportCount: {
        color: '#ff3333',
        fontSize: 14,
        marginTop: 2,
    },
    reportContent: {
        color: '#eee',
        fontSize: 15,
        lineHeight: 20,
        marginBottom: 10,
    },
    reportImage: {
        width: '100%',
        height: 150,
        borderRadius: 10,
        marginBottom: 10,
    },
    reportActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    reportActionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 10,
        gap: 5,
    },
    dismissButton: {
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    dismissButtonText: {
        color: '#4CAF50',
        fontWeight: 'bold',
        fontSize: 14,
    },
    deleteButton: {
        backgroundColor: 'rgba(255, 51, 51, 0.2)',
        borderWidth: 1,
        borderColor: '#ff3333',
    },
    deleteButtonText: {
        color: '#ff3333',
        fontWeight: 'bold',
        fontSize: 14,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 15,
        padding: 15,
        marginBottom: 10,
    },
    userImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        color: '#00aaff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    userEmail: {
        color: '#ccc',
        fontSize: 14,
        marginTop: 2,
    },
    userRole: {
        color: '#FFD700',
        fontSize: 12,
        marginTop: 3,
    },
    statusButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        gap: 5,
    },
    suspendButton: {
        backgroundColor: '#ff3333',
    },
    activateButton: {
        backgroundColor: '#4CAF50',
    },
    statusButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 13,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        color: '#888',
        fontSize: 16,
        marginTop: 15,
    },
});