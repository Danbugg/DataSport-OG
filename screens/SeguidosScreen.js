import React, { useState, useEffect, useCallback } from 'react';

import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, Image, TouchableOpacity, ImageBackground } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { Ionicons } from '@expo/vector-icons';



const API_BASE_URL = "http://localhost:3000";

const fondoLogin = require("../assets/fondoLogin.jpg"); // Asegúrate de que esta ruta sea correcta



// --- Componente de Item de Usuario ---

// Se mantiene igual que en SeguidoresScreen.js

const UserListItem = ({ user, currentLoggedInId, navigation, onFollowToggle, isFollowingStatus, loadingToggle }) => {

    const isOwnProfile = String(user.id_usuario) === String(currentLoggedInId);



    // Función de navegación al perfil

    const navigateToProfile = () => {

        navigation.navigate('PerfilUsuarioScreen', { userId: String(user.id_usuario) });

    };



    return (

        <TouchableOpacity style={userListStyles.container} onPress={navigateToProfile}>

            <Image

                source={{ uri: user.foto_perfil || 'https://i.imgur.com/k6KxI1x.png' }}

                style={userListStyles.profileImage}

            />

            <View style={userListStyles.userInfo}>

                <Text style={userListStyles.username}>{user.nombre_usuario}</Text>

                <Text style={userListStyles.name}>{`${user.nombre} ${user.apellido}`}</Text>

            </View>



            {/* Botón de Seguir/Dejar de Seguir */}

            {!isOwnProfile && (

                <TouchableOpacity

                    onPress={() => onFollowToggle(user.id_usuario, isFollowingStatus)}

                    style={[

                        userListStyles.followButton,

                        isFollowingStatus ? userListStyles.unfollowButton : userListStyles.followButtonPrimary,

                    ]}

                    disabled={loadingToggle}

                >

                    {loadingToggle ? (

                        <ActivityIndicator color="#fff" size="small" />

                    ) : (

                        <Text style={userListStyles.followButtonText}>

                            {isFollowingStatus ? 'Dejar de Seguir' : 'Seguir'}

                        </Text>

                    )}

                </TouchableOpacity>

            )}

        </TouchableOpacity>

    );

};





// --- Pantalla Principal: SeguidosScreen ---

export default function SeguidosScreen({ route, navigation }) {

    // profileId es el ID del usuario CUYOS seguidos estamos viendo

    const { profileId, profileUsername } = route.params;



    const [users, setUsers] = useState([]);

    const [loading, setLoading] = useState(true);

    const [currentLoggedInId, setCurrentLoggedInId] = useState(null);

    const [followStatusMap, setFollowStatusMap] = useState({});

    const [loadingToggleId, setLoadingToggleId] = useState(null);

   

    // Función para obtener la lista de seguidos

    const fetchFollowing = useCallback(async (loggedInId) => {

        setLoading(true);

        try {

            // Llama al endpoint del servidor

            const response = await fetch(`${API_BASE_URL}/users/${profileId}/following?currentUserId=${loggedInId}`);

            if (!response.ok) {

                throw new Error('Error al cargar seguidos');

            }

            const data = await response.json();

           

            setUsers(data.following || []);



            // Inicializar el mapa de estados de seguimiento (asumiendo que el backend envía isFollowing)

            const initialMap = {};

            (data.following || []).forEach(user => {

                initialMap[user.id_usuario] = user.isFollowing || false;

            });

            setFollowStatusMap(initialMap);



        } catch (error) {

            console.error("❌ Error fetching following:", error.message);

            Alert.alert("Error", "No se pudo cargar la lista de seguidos.");

            setUsers([]);

        } finally {

            setLoading(false);

        }

    }, [profileId]);



    // Función para manejar el Seguir/Dejar de Seguir

    const handleFollowToggle = async (followedId, isCurrentlyFollowing) => {

        if (!currentLoggedInId) return;



        setLoadingToggleId(followedId);

        const endpoint = isCurrentlyFollowing ? `/unfollow/${followedId}` : `/follow/${followedId}`;

        const method = isCurrentlyFollowing ? "DELETE" : "POST";



        try {

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {

                method: method,

                headers: { 'Content-Type': 'application/json' },

                body: JSON.stringify({ followerId: currentLoggedInId }),

            });



            if (response.ok) {

                // ✅ CLAVE CORREGIDA: Actualizar el estado de seguimiento inmediatamente

                setFollowStatusMap(prevMap => ({

                    ...prevMap,

                    [followedId]: !isCurrentlyFollowing, // Cambiamos el estado

                }));

            } else {

                const data = await response.json().catch(() => ({}));

                Alert.alert("Error", data.error || `No se pudo realizar la acción.`);

            }

        } catch (error) {

            console.error("Error de red en el seguimiento:", error);

            Alert.alert("Error", "Error de conexión.");

        } finally {

            setLoadingToggleId(null);

        }

    };





    useEffect(() => {

        const loadData = async () => {

            const loggedId = await AsyncStorage.getItem("userId");

            setCurrentLoggedInId(loggedId);

            fetchFollowing(loggedId);

        };

        loadData();

    }, [fetchFollowing]);



    if (loading) {

        return (

            <ImageBackground source={fondoLogin} style={userListStyles.loadingContainer}>

                <ActivityIndicator size="large" color="#ff0000" />

            </ImageBackground>

        );

    }



    return (

        <ImageBackground source={fondoLogin} style={userListStyles.fullContainer}>

            <View style={userListStyles.overlay}>

                <View style={userListStyles.header}>

                    <TouchableOpacity onPress={() => navigation.goBack()} style={userListStyles.backButton}>

                        <Ionicons name="arrow-back" size={28} color="#fff" />

                    </TouchableOpacity>

                    <Text style={userListStyles.title}>Seguidos por {profileUsername}</Text>

                </View>

               

                <FlatList

                    data={users}

                    keyExtractor={(item) => item.id_usuario.toString()}

                    renderItem={({ item }) => (

                        <UserListItem

                            user={item}

                            currentLoggedInId={currentLoggedInId}

                            navigation={navigation}

                            onFollowToggle={handleFollowToggle}

                            // Usamos el estado del mapa

                            isFollowingStatus={followStatusMap[item.id_usuario]}

                            loadingToggle={loadingToggleId === item.id_usuario}

                        />

                    )}

                    ListEmptyComponent={() => (

                        <Text style={userListStyles.emptyText}>Este usuario no sigue a nadie aún.</Text>

                    )}

                />

            </View>

        </ImageBackground>

    );

}



// --- Estilos Específicos de la Lista de Usuarios ---

// Mismos estilos que SeguidoresScreen.js

const userListStyles = StyleSheet.create({

    fullContainer: { flex: 1, },

    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 10, paddingTop: 50 },

    header: {

        flexDirection: 'row',

        alignItems: 'center',

        marginBottom: 20,

    },

    backButton: {

        marginRight: 10,

    },

    title: {

        fontSize: 22,

        fontWeight: 'bold',

        color: '#fff',

        flex: 1,

    },

    container: {

        flexDirection: 'row',

        alignItems: 'center',

        paddingVertical: 10,

        borderBottomWidth: 1,

        borderBottomColor: '#222',

        backgroundColor: 'rgba(255, 255, 255, 0.05)',

        borderRadius: 8,

        marginBottom: 8,

        paddingHorizontal: 10,

    },

    profileImage: {

        width: 50,

        height: 50,

        borderRadius: 25,

        marginRight: 15,

        borderWidth: 2,

        borderColor: '#ff0000',

    },

    userInfo: {

        flex: 1,

    },

    username: {

        color: '#fff',

        fontWeight: 'bold',

        fontSize: 16,

    },

    name: {

        color: '#ccc',

        fontSize: 14,

    },

    followButton: {

        paddingVertical: 8,

        paddingHorizontal: 15,

        borderRadius: 20,

        width: 120,

        alignItems: 'center',

    },

    followButtonPrimary: {

        backgroundColor: '#00aaff', // Azul para 'Seguir'

    },

    unfollowButton: {

        backgroundColor: '#444', // Gris oscuro para 'Dejar de Seguir'

        borderWidth: 1,

        borderColor: '#00aaff',

    },

    followButtonText: {

        color: '#fff',

        fontWeight: 'bold',

        fontSize: 14,

    },

    emptyText: {

        color: '#aaa',

        textAlign: 'center',

        marginTop: 50,

        fontSize: 16,

    },

    loadingContainer: {

        flex: 1, justifyContent: 'center', alignItems: 'center',

    }

});