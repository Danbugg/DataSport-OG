import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    Image,
    FlatList,
    ActivityIndicator,
    StyleSheet,
    TouchableOpacity,
} from "react-native";

const API_BASE_URL = "http://localhost:3000";

export default function DetalleEquipoScreen({ route, navigation }) {
    const { itemId, itemData } = route.params; // itemId = id_equipo
    const [equipo, setEquipo] = useState(itemData || null);
    const [jugadores, setJugadores] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        obtenerJugadores();
    }, [itemId]); // Dependencia en itemId para recargar si cambia

    const obtenerJugadores = async () => {
        setLoading(true);
        try {
            const url = `${API_BASE_URL}/equipos/${itemId}/jugadores`;
            console.log(`[CLIENTE] Llamando a URL: ${url}`); // Log de la URL
            
            const response = await fetch(url);
            
            if (!response.ok) {
                // Si la respuesta no es 200, lanzamos un error que se captura abajo
                throw new Error(`Error en la API: ${response.status}`);
            }

            // Usamos response.json() directamente para obtener los datos
            const data = await response.json();
            console.log("Jugadores recibidos (JSON):", data);

            // La API debe devolver directamente el array de jugadores
            setJugadores(data || []); 

        } catch (error) {
            console.error("Error al obtener jugadores del equipo:", error);
            // Mostrar un error más amigable si el servidor está caído
            // o devuelve un formato inesperado
            setJugadores([]); 
        } finally {
            setLoading(false);
        }
    };

    const renderJugador = ({ item }) => (
        <TouchableOpacity
            style={styles.jugadorCard}
            onPress={() =>
                navigation.navigate("DetalleJugadorScreen", {
                    itemId: item.id_jugador,
                    itemData: item,
                })
            }
        >
            {item.foto ? (
                <Image source={{ uri: item.foto }} style={styles.jugadorImagen} />
            ) : (
                <View style={styles.jugadorPlaceholder} />
            )}
            <View>
                <Text style={styles.jugadorNombre}>{item.nombre}</Text>
                <Text style={styles.jugadorPosicion}>{item.posicion}</Text>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#00aaff" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {equipo && (
                <View style={styles.header}>
                    {equipo.logo ? (
                        <Image source={{ uri: equipo.logo }} style={styles.logo} />
                    ) : (
                        <View style={styles.logoPlaceholder} />
                    )}
                    <Text style={styles.nombre}>{equipo.nombre}</Text>
                </View>
            )}

            <Text style={styles.subtitulo}>Jugadores</Text>

            {jugadores.length === 0 ? (
                <Text style={styles.noJugadores}>No hay jugadores registrados.</Text>
            ) : (
                <FlatList
                    data={jugadores}
                    keyExtractor={(item) =>
                        item.id_jugador?.toString() || item.elementId?.toString() || Math.random().toString()
                    }
                    renderItem={renderJugador}
                    contentContainerStyle={styles.lista}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
        padding: 16,
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#000",
    },
    header: {
        alignItems: "center",
        marginBottom: 20,
    },
    logo: {
        width: 100,
        height: 100,
        resizeMode: "contain",
        marginBottom: 10,
    },
    logoPlaceholder: {
        width: 100,
        height: 100,
        backgroundColor: "#222",
        borderRadius: 50,
        marginBottom: 10,
    },
    nombre: {
        color: "#fff",
        fontSize: 24,
        fontWeight: "bold",
    },
    subtitulo: {
        color: "#ff0000",
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 10,
    },
    lista: {
        paddingBottom: 20,
    },
    jugadorCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#1a1a1a",
        padding: 10,
        borderRadius: 10,
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftColor: "#00aaff",
    },
    jugadorImagen: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 15,
        borderWidth: 1,
        borderColor: "#00aaff",
        resizeMode: "contain",
    },
    jugadorPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 15,
        backgroundColor: "#333",
        borderWidth: 1,
        borderColor: "#00aaff",
    },
    jugadorNombre: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    jugadorPosicion: {
        color: "#aaa",
        fontSize: 14,
    },
    noJugadores: {
        color: "#888",
        fontSize: 16,
        textAlign: "center",
        marginTop: 20,
    },
});