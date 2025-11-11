import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Image,
    ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

const API_BASE_URL = "http://localhost:3000";

// COMPONENTE PRINCIPAL: BuscadorScreen

export default function BuscadorScreen({ route }) {
    const navigation = useNavigation();
    const { userId } = route.params || {};

    // ESTADOS DE BÚSQUEDA
    const [termino, setTermino] = useState("");
    const [resultados, setResultados] = useState({
        ligas: [],
        equipos: [],
        jugadores: [],
        usuarios: [],
    });
    const [loading, setLoading] = useState(false);

    // Optimización de Rendimiento
    useEffect(() => {
        // Limpiar resultados si el término está vacío
        if (termino.length === 0) {
            setResultados({ ligas: [], equipos: [], jugadores: [], usuarios: [] });
            return;
        }

        // Delay de 800ms para evitar múltiples peticiones rápidas 
        const timeoutId = setTimeout(() => {
            buscar(termino);
        }, 800);

        // Función de limpieza: cancela el timer si el usuario escribe de nuevo
        return () => clearTimeout(timeoutId);
    }, [termino]);

    // FUNCIÓN: Ejecutar Búsqueda en el Backend
    const buscar = async (q) => {
        setLoading(true);
        try {
            // Llama al endpoint de búsqueda unificada 
            const response = await fetch(
                `${API_BASE_URL}/buscar?q=${encodeURIComponent(q)}`
            );
            const data = await response.json();
            // Los resultados incluyen 4 categorías (ligas, equipos, jugadores, usuarios)
            setResultados(data); 
        } catch (error) {
            console.error("Error en búsqueda:", error);
        } finally {
            setLoading(false);
        }
    };

    // Navegación al Detalle
    const handlePress = (item, tipo) => {
        let screenName;
        let itemId;

        // Mapeo dinámico a la pantalla de detalle correcta
        if (tipo === "liga") {
            screenName = "DetalleLigaScreen";
            itemId = item.id_liga;
        } else if (tipo === "equipo") {
            screenName = "DetalleEquipoScreen";
            itemId = item.id_equipo;
        } else if (tipo === "jugador") {
            screenName = "DetalleJugadorScreen";
            itemId = item.id_jugador;
        } else if (tipo === "usuario") {
            screenName = "PerfilUsuarioScreen";
            // Usamos el ID de usuario del perfil para la navegación
            itemId = item.id_usuario; 
        }

        if (screenName) {
            navigation.navigate(screenName, {
                // Se asegura de enviar el ID correcto para la ruta
                itemId: itemId || item.elementId, 
                itemData: item,
            });
        }
    };

    // Busqueda de Ligas y Equipos
    const renderItem = ({ item, tipo }) => (
        <TouchableOpacity
            style={styles.item}
            onPress={() => handlePress(item, tipo)}
        >
            <Text style={styles.itemText}>{item.nombre}</Text>
        </TouchableOpacity>
    );

    // Busqueda de Jugador 
    const renderJugador = ({ item }) => (
        <TouchableOpacity
            style={styles.itemJugador}
            onPress={() => handlePress(item, "jugador")}
        >
            {item.foto ? (
                // Lógica para mostrar la imagen 
                <Image source={{ uri: item.foto }} style={styles.jugadorImagen} />
            ) : (
                // imágenes faltantes
                <View style={styles.jugadorPlaceholder} />
            )}
            <Text style={styles.itemText}>{item.nombre}</Text>
        </TouchableOpacity>
    );

    // Usuario Incluye Imagen de Perfil y username
    const renderUsuario = ({ item }) => (
        <TouchableOpacity
            style={styles.itemJugador}
            onPress={() => handlePress(item, "usuario")}
        >
            {item.foto_perfil ? (
                // Carga la foto de perfil (URL completa gestionada en el backend)
                <Image source={{ uri: item.foto_perfil }} style={styles.jugadorImagen} />
            ) : (
                // Placeholder si no tiene foto
                <View style={styles.jugadorPlaceholder} />
            )}
            <Text style={styles.itemText}>
                {item.nombre} {item.apellido} (@{item.nombre_usuario})
            </Text>
        </TouchableOpacity>
    );

    // Control para mostrar el mensaje de "No hay resultados"
    const hayResultados =
        resultados.ligas.length > 0 ||
        resultados.equipos.length > 0 ||
        resultados.jugadores.length > 0 ||
        resultados.usuarios.length > 0;

    // ESTRUCTURA VISUAL DE LA PANTALLA

    return (
        <View style={styles.container}>
            {/* Input de Búsqueda */}
            <TextInput
                placeholder="Buscar ligas, equipos, jugadores o usuarios..."
                placeholderTextColor="#999"
                value={termino}
                onChangeText={setTermino}
                style={styles.input}
            />

            {/* Indicador de Carga */}
            {loading && <ActivityIndicator size="large" color="#00aaff" />}

            {/* Mensaje de No Resultados */}
            {termino.length > 0 && !loading && !hayResultados && (
                <Text style={styles.noResultsText}>
                    No se encontraron resultados para "{termino}".
                </Text>
            )}

            {/* Contenedor Principal de Resultados */}
            <ScrollView contentContainerStyle={styles.scrollContent}>
                
                {/* Sección: Ligas */}
                {resultados.ligas.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.title}>Ligas</Text>
                        <FlatList
                            data={resultados.ligas}
                            keyExtractor={(item) => item.elementId}
                            renderItem={({ item }) => renderItem({ item, tipo: "liga" })}
                            scrollEnabled={false}
                        />
                    </View>
                )}

                {/* Sección: Equipos */}
                {resultados.equipos.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.title}>Equipos</Text>
                        <FlatList
                            data={resultados.equipos}
                            keyExtractor={(item) => item.elementId}
                            renderItem={({ item }) => renderItem({ item, tipo: "equipo" })}
                            scrollEnabled={false}
                        />
                    </View>
                )}

                {/* Sección: Jugadores */}
                {resultados.jugadores.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.title}>Jugadores</Text>
                        <FlatList
                            data={resultados.jugadores}
                            keyExtractor={(item) => item.elementId}
                            renderItem={renderJugador}
                            scrollEnabled={false}
                        />
                    </View>
                )}

                {/* Sección: Usuarios */}
                {resultados.usuarios.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.title}>Usuarios</Text>
                        <FlatList
                            data={resultados.usuarios}
                            keyExtractor={(item) => item.elementId}
                            renderItem={renderUsuario}
                            scrollEnabled={false}
                        />
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

// ESTILOS
const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 16,
        backgroundColor: "#000",
        paddingTop: 40,
    },
    input: {
        height: 45,
        borderColor: "#00aaff",
        borderWidth: 1,
        borderRadius: 25,
        paddingHorizontal: 15,
        marginBottom: 20,
        color: "#fff",
        backgroundColor: "#1a1a1a",
        fontSize: 15,
        paddingTop: 15
    },
    scrollContent: {
        paddingBottom: 20,
    },
    section: {
        marginBottom: 5,
    },
    title: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 5,
        color: "#ff0000",
        marginTop: 15,
        paddingLeft: 5,
    },
    item: {
        padding: 12,
        backgroundColor: "#1a1a1a",
        marginBottom: 4,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: "#00aaff",
    },
    itemText: {
        color: "#eee",
        fontSize: 16,
        fontWeight: "500",
    },
    itemJugador: {
        flexDirection: "row",
        alignItems: "center",
        padding: 10,
        backgroundColor: "#1a1a1a",
        marginBottom: 4,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: "#00aaff",
    },
    jugadorImagen: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 15,
        borderWidth: 1,
        borderColor: '#00aaff',
        resizeMode: 'contain',
        backgroundColor: '#111',
    },
    jugadorPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 15,
        backgroundColor: "#333",
        borderWidth: 1,
        borderColor: '#00aaff',
    },
    noResultsText: {
        color: "#999",
        textAlign: "center",
        marginTop: 20,
        fontSize: 16,
    },
});