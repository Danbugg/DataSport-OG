import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

const API_BASE_URL = "http://localhost:3000";

export default function DetalleEquipoScreen({ route }) {
    const navigation = useNavigation();
    const { itemId } = route.params;

    const [equipo, setEquipo] = useState(null);
    const [jugadores, setJugadores] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        cargarDetalleEquipo();
    }, []);

    const cargarDetalleEquipo = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/equipo/${itemId}`);
            const data = await response.json();
            
            if (data.error) {
                console.error("Error al cargar equipo:", data.error);
                return;
            }

            setEquipo(data);
            setJugadores(data.jugadores || []);
        } catch (error) {
            console.error("Error al cargar detalle de equipo:", error);
        } finally {
            setLoading(false);
        }
    };

    const navegarAJugador = (jugador) => {
        navigation.navigate("DetalleJugadorScreen", {
            itemId: jugador.id_jugador || jugador.id,
            itemData: jugador,
        });
    };

    // Agrupar jugadores por posición
    const jugadoresPorPosicion = {
        Portero: jugadores.filter(j => j.posicion === 'Portero'),
        Defensa: jugadores.filter(j => j.posicion === 'Defensa'),
        Centrocampista: jugadores.filter(j => j.posicion === 'Centrocampista'),
        Delantero: jugadores.filter(j => j.posicion === 'Delantero'),
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#00aaff" />
                <Text style={styles.loadingText}>Cargando equipo...</Text>
            </View>
        );
    }

    if (!equipo) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>No se pudo cargar la información del equipo</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            {/* Header del Equipo */}
            <View style={styles.header}>
                <View style={styles.logoPlaceholder}>
                    <Text style={styles.logoText}>⚽</Text>
                </View>
                <Text style={styles.nombreEquipo}>{equipo.nombre}</Text>
                {equipo.ciudad && (
                    <Text style={styles.ciudad}>📍 {equipo.ciudad}</Text>
                )}
                {equipo.liga_nombre && (
                    <View style={styles.ligaBadge}>
                        <Text style={styles.ligaText}>{equipo.liga_nombre}</Text>
                    </View>
                )}
            </View>

            {/* Información del equipo */}
            <View style={styles.infoContainer}>
                {equipo.estadio && (
                    <View style={styles.infoCard}>
                        <Text style={styles.infoLabel}>Estadio</Text>
                        <Text style={styles.infoValue}>{equipo.estadio}</Text>
                    </View>
                )}
                
                <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>Plantilla</Text>
                    <Text style={styles.infoValue}>{jugadores.length} jugadores</Text>
                </View>

                {equipo.liga_pais && (
                    <View style={styles.infoCard}>
                        <Text style={styles.infoLabel}>País</Text>
                        <Text style={styles.infoValue}>{equipo.liga_pais}</Text>
                    </View>
                )}
            </View>

            {/* Plantilla por posiciones */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                    Plantilla ({jugadores.length})
                </Text>

                {jugadores.length === 0 ? (
                    <Text style={styles.noDataText}>
                        No hay jugadores registrados en este equipo
                    </Text>
                ) : (
                    Object.entries(jugadoresPorPosicion).map(([posicion, jugadoresPosicion]) => {
                        if (jugadoresPosicion.length === 0) return null;
                        
                        return (
                            <View key={posicion} style={styles.posicionGroup}>
                                <Text style={styles.posicionTitle}>
                                    {posicion === 'Portero' && '🧤 '}
                                    {posicion === 'Defensa' && '🛡️ '}
                                    {posicion === 'Centrocampista' && '⚙️ '}
                                    {posicion === 'Delantero' && '⚡ '}
                                    {posicion} ({jugadoresPosicion.length})
                                </Text>
                                
                                {jugadoresPosicion.map((jugador, index) => (
                                    <TouchableOpacity
                                        key={jugador.id_jugador || jugador.id || index}
                                        style={styles.jugadorCard}
                                        onPress={() => navegarAJugador(jugador)}
                                    >
                                        <View style={styles.jugadorFotoPlaceholder}>
                                            <Text style={styles.jugadorFotoText}>👤</Text>
                                        </View>
                                        <View style={styles.jugadorInfo}>
                                            <Text style={styles.jugadorNombre}>{jugador.nombre}</Text>
                                            {jugador.nacionalidad && (
                                                <Text style={styles.jugadorNacionalidad}>
                                                    🌍 {jugador.nacionalidad}
                                                </Text>
                                            )}
                                            <View style={styles.jugadorStats}>
                                                {jugador.edad && (
                                                    <Text style={styles.jugadorStat}>
                                                        {jugador.edad} años
                                                    </Text>
                                                )}
                                                {jugador.goles > 0 && (
                                                    <Text style={styles.jugadorStat}>
                                                        ⚽ {jugador.goles}
                                                    </Text>
                                                )}
                                                {jugador.asistencias > 0 && (
                                                    <Text style={styles.jugadorStat}>
                                                        🎯 {jugador.asistencias}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>
                                        <Text style={styles.arrow}>›</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        );
                    })
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#000",
    },
    loadingText: {
        color: "#fff",
        marginTop: 10,
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#000",
        padding: 20,
    },
    errorText: {
        color: "#ff4444",
        fontSize: 16,
        textAlign: "center",
    },
    header: {
        alignItems: "center",
        paddingVertical: 30,
        backgroundColor: "#1a1a1a",
        borderBottomWidth: 2,
        borderBottomColor: "#00aaff",
    },
    logoPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: "#333",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 15,
        borderWidth: 3,
        borderColor: "#00aaff",
    },
    logoText: {
        fontSize: 50,
    },
    nombreEquipo: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#fff",
        textAlign: "center",
        marginBottom: 5,
        paddingHorizontal: 20,
    },
    ciudad: {
        fontSize: 16,
        color: "#aaa",
        marginTop: 5,
    },
    ligaBadge: {
        backgroundColor: "#ff0000",
        paddingHorizontal: 15,
        paddingVertical: 5,
        borderRadius: 15,
        marginTop: 10,
    },
    ligaText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 14,
    },
    infoContainer: {
        padding: 16,
    },
    infoCard: {
        backgroundColor: "#1a1a1a",
        padding: 16,
        borderRadius: 12,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: "#00aaff",
    },
    infoLabel: {
        fontSize: 14,
        color: "#aaa",
        marginBottom: 5,
    },
    infoValue: {
        fontSize: 18,
        color: "#fff",
        fontWeight: "600",
    },
    section: {
        padding: 16,
        paddingTop: 0,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#ff0000",
        marginBottom: 15,
    },
    noDataText: {
        color: "#999",
        fontSize: 16,
        textAlign: "center",
        marginTop: 20,
    },
    posicionGroup: {
        marginBottom: 20,
    },
    posicionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#00aaff",
        marginBottom: 10,
        paddingLeft: 5,
    },
    jugadorCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#1a1a1a",
        padding: 12,
        borderRadius: 10,
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftColor: "#333",
    },
    jugadorFotoPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "#333",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
        borderWidth: 1,
        borderColor: "#00aaff",
    },
    jugadorFotoText: {
        fontSize: 24,
    },
    jugadorInfo: {
        flex: 1,
    },
    jugadorNombre: {
        fontSize: 16,
        fontWeight: "600",
        color: "#fff",
        marginBottom: 3,
    },
    jugadorNacionalidad: {
        fontSize: 13,
        color: "#aaa",
        marginBottom: 3,
    },
    jugadorStats: {
        flexDirection: "row",
        gap: 10,
    },
    jugadorStat: {
        fontSize: 12,
        color: "#00aaff",
    },
    arrow: {
        fontSize: 24,
        color: "#00aaff",
        fontWeight: "300",
    },
});