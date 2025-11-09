import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
} from "react-native";

const API_BASE_URL = "http://localhost:3000";

export default function DetalleJugadorScreen({ route }) {
    const { itemId } = route.params;

    const [jugador, setJugador] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        cargarDetalleJugador();
    }, []);

    const cargarDetalleJugador = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/jugador/${itemId}`);
            const data = await response.json();
            
            if (data.error) {
                console.error("Error al cargar jugador:", data.error);
                return;
            }

            setJugador(data);
        } catch (error) {
            console.error("Error al cargar detalle de jugador:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#00aaff" />
                <Text style={styles.loadingText}>Cargando jugador...</Text>
            </View>
        );
    }

    if (!jugador) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>No se pudo cargar la información del jugador</Text>
            </View>
        );
    }

    // Función para obtener emoji de posición
    const getPosicionEmoji = (posicion) => {
        switch(posicion) {
            case 'Portero': return '🧤';
            case 'Defensa': return '🛡️';
            case 'Centrocampista': return '⚙️';
            case 'Delantero': return '⚡';
            default: return '⚽';
        }
    };

    return (
        <ScrollView style={styles.container}>
            {/* Header del Jugador */}
            <View style={styles.header}>
                <View style={styles.fotoPlaceholder}>
                    <Text style={styles.fotoText}>👤</Text>
                </View>
                <Text style={styles.nombreJugador}>{jugador.nombre}</Text>
                
                {jugador.posicion && (
                    <View style={styles.posicionBadge}>
                        <Text style={styles.posicionText}>
                            {getPosicionEmoji(jugador.posicion)} {jugador.posicion}
                        </Text>
                    </View>
                )}

                {jugador.equipo_nombre && (
                    <Text style={styles.equipoNombre}>
                        ⚽ {jugador.equipo_nombre}
                    </Text>
                )}
            </View>

            {/* Información Personal */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>📋 Información Personal</Text>

                {jugador.edad && (
                    <View style={styles.infoCard}>
                        <Text style={styles.infoLabel}>Edad</Text>
                        <Text style={styles.infoValue}>{jugador.edad} años</Text>
                    </View>
                )}

                {jugador.nacionalidad && (
                    <View style={styles.infoCard}>
                        <Text style={styles.infoLabel}>Nacionalidad</Text>
                        <Text style={styles.infoValue}>🌍 {jugador.nacionalidad}</Text>
                    </View>
                )}

                {jugador.liga_nombre && (
                    <View style={styles.infoCard}>
                        <Text style={styles.infoLabel}>Liga</Text>
                        <Text style={styles.infoValue}>{jugador.liga_nombre}</Text>
                    </View>
                )}

                {jugador.temporada && (
                    <View style={styles.infoCard}>
                        <Text style={styles.infoLabel}>Temporada</Text>
                        <Text style={styles.infoValue}>{jugador.temporada}</Text>
                    </View>
                )}
            </View>

            {/* Estadísticas Principales */}
            {(jugador.partidos_jugados > 0 || jugador.goles > 0 || jugador.asistencias > 0) && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📊 Estadísticas Principales</Text>

                    <View style={styles.statsContainer}>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{jugador.partidos_jugados || 0}</Text>
                            <Text style={styles.statLabel}>Partidos</Text>
                        </View>

                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{jugador.goles || 0}</Text>
                            <Text style={styles.statLabel}>⚽ Goles</Text>
                        </View>

                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{jugador.asistencias || 0}</Text>
                            <Text style={styles.statLabel}>🎯 Asistencias</Text>
                        </View>
                    </View>

                    {/* Estadísticas secundarias */}
                    {jugador.minutos_jugados > 0 && (
                        <View style={styles.statsGrid}>
                            <View style={styles.miniStatCard}>
                                <Text style={styles.miniStatLabel}>Minutos</Text>
                                <Text style={styles.miniStatValue}>{jugador.minutos_jugados}'</Text>
                            </View>
                            <View style={styles.miniStatCard}>
                                <Text style={styles.miniStatLabel}>Titular</Text>
                                <Text style={styles.miniStatValue}>{jugador.titularidades || 0}</Text>
                            </View>
                            <View style={styles.miniStatCard}>
                                <Text style={styles.miniStatLabel}>Suplente</Text>
                                <Text style={styles.miniStatValue}>{jugador.suplente || 0}</Text>
                            </View>
                        </View>
                    )}
                </View>
            )}

            {/* Disciplina */}
            {(jugador.tarjetas_amarillas > 0 || jugador.tarjetas_rojas > 0) && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>⚠️ Disciplina</Text>
                    <View style={styles.statsGrid}>
                        <View style={styles.cardStat}>
                            <View style={styles.yellowCard} />
                            <Text style={styles.cardNumber}>{jugador.tarjetas_amarillas || 0}</Text>
                            <Text style={styles.cardLabel}>Amarillas</Text>
                        </View>
                        <View style={styles.cardStat}>
                            <View style={styles.redCard} />
                            <Text style={styles.cardNumber}>{jugador.tarjetas_rojas || 0}</Text>
                            <Text style={styles.cardLabel}>Rojas</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Estadísticas de Ataque */}
            {(jugador.tiros_totales > 0 || jugador.goles_penalti > 0) && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>⚡ Ataque</Text>
                    <View style={styles.statsGrid}>
                        {jugador.tiros_totales > 0 && (
                            <View style={styles.miniStatCard}>
                                <Text style={styles.miniStatLabel}>Tiros Totales</Text>
                                <Text style={styles.miniStatValue}>{jugador.tiros_totales}</Text>
                            </View>
                        )}
                        {jugador.tiros_a_puerta > 0 && (
                            <View style={styles.miniStatCard}>
                                <Text style={styles.miniStatLabel}>A Puerta</Text>
                                <Text style={styles.miniStatValue}>{jugador.tiros_a_puerta}</Text>
                            </View>
                        )}
                        {jugador.goles_penalti > 0 && (
                            <View style={styles.miniStatCard}>
                                <Text style={styles.miniStatLabel}>Goles Penalti</Text>
                                <Text style={styles.miniStatValue}>{jugador.goles_penalti}</Text>
                            </View>
                        )}
                    </View>
                </View>
            )}

            {/* Estadísticas de Pase */}
            {(jugador.pases_totales > 0 || jugador.pases_clave > 0) && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🎯 Pases</Text>
                    <View style={styles.statsGrid}>
                        {jugador.pases_totales > 0 && (
                            <View style={styles.miniStatCard}>
                                <Text style={styles.miniStatLabel}>Totales</Text>
                                <Text style={styles.miniStatValue}>{jugador.pases_totales}</Text>
                            </View>
                        )}
                        {jugador.pases_completados > 0 && (
                            <View style={styles.miniStatCard}>
                                <Text style={styles.miniStatLabel}>Completados</Text>
                                <Text style={styles.miniStatValue}>{jugador.pases_completados}</Text>
                            </View>
                        )}
                        {jugador.pases_clave > 0 && (
                            <View style={styles.miniStatCard}>
                                <Text style={styles.miniStatLabel}>Pases Clave</Text>
                                <Text style={styles.miniStatValue}>{jugador.pases_clave}</Text>
                            </View>
                        )}
                    </View>
                </View>
            )}

            {/* Estadísticas de Portero */}
            {jugador.posicion === 'Portero' && (jugador.paradas > 0 || jugador.porterias_imbatidas > 0) && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🧤 Estadísticas de Portero</Text>
                    <View style={styles.statsGrid}>
                        {jugador.paradas > 0 && (
                            <View style={styles.miniStatCard}>
                                <Text style={styles.miniStatLabel}>Paradas</Text>
                                <Text style={styles.miniStatValue}>{jugador.paradas}</Text>
                            </View>
                        )}
                        {jugador.goles_encajados >= 0 && (
                            <View style={styles.miniStatCard}>
                                <Text style={styles.miniStatLabel}>Goles Encajados</Text>
                                <Text style={styles.miniStatValue}>{jugador.goles_encajados}</Text>
                            </View>
                        )}
                        {jugador.porterias_imbatidas > 0 && (
                            <View style={styles.miniStatCard}>
                                <Text style={styles.miniStatLabel}>Vallas Invictas</Text>
                                <Text style={styles.miniStatValue}>{jugador.porterias_imbatidas}</Text>
                            </View>
                        )}
                    </View>
                </View>
            )}

            {/* Estadísticas Defensivas */}
            {(jugador.entradas > 0 || jugador.intercepciones > 0 || jugador.despejes > 0) && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🛡️ Defensa</Text>
                    <View style={styles.statsGrid}>
                        {jugador.entradas > 0 && (
                            <View style={styles.miniStatCard}>
                                <Text style={styles.miniStatLabel}>Entradas</Text>
                                <Text style={styles.miniStatValue}>{jugador.entradas}</Text>
                            </View>
                        )}
                        {jugador.intercepciones > 0 && (
                            <View style={styles.miniStatCard}>
                                <Text style={styles.miniStatLabel}>Intercepciones</Text>
                                <Text style={styles.miniStatValue}>{jugador.intercepciones}</Text>
                            </View>
                        )}
                        {jugador.despejes > 0 && (
                            <View style={styles.miniStatCard}>
                                <Text style={styles.miniStatLabel}>Despejes</Text>
                                <Text style={styles.miniStatValue}>{jugador.despejes}</Text>
                            </View>
                        )}
                    </View>
                </View>
            )}
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
    fotoPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: "#333",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 15,
        borderWidth: 4,
        borderColor: "#00aaff",
    },
    fotoText: {
        fontSize: 60,
    },
    nombreJugador: {
        fontSize: 26,
        fontWeight: "bold",
        color: "#fff",
        textAlign: "center",
        marginBottom: 10,
        paddingHorizontal: 20,
    },
    posicionBadge: {
        backgroundColor: "#00aaff",
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 8,
    },
    posicionText: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#000",
    },
    equipoNombre: {
        fontSize: 16,
        color: "#aaa",
        marginTop: 5,
    },
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#ff0000",
        marginBottom: 15,
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
    statsContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        backgroundColor: "#1a1a1a",
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#00aaff",
        marginBottom: 15,
    },
    statBox: {
        alignItems: "center",
    },
    statValue: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#00aaff",
        marginBottom: 5,
    },
    statLabel: {
        fontSize: 14,
        color: "#aaa",
    },
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: 10,
    },
    miniStatCard: {
        backgroundColor: "#1a1a1a",
        padding: 12,
        borderRadius: 10,
        width: "48%",
        borderLeftWidth: 3,
        borderLeftColor: "#00aaff",
    },
    miniStatLabel: {
        fontSize: 12,
        color: "#aaa",
        marginBottom: 5,
    },
    miniStatValue: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#fff",
    },
    cardStat: {
        alignItems: "center",
        backgroundColor: "#1a1a1a",
        padding: 20,
        borderRadius: 12,
        width: "48%",
    },
    yellowCard: {
        width: 40,
        height: 60,
        backgroundColor: "#FFD700",
        borderRadius: 5,
        marginBottom: 10,
    },
    redCard: {
        width: 40,
        height: 60,
        backgroundColor: "#FF0000",
        borderRadius: 5,
        marginBottom: 10,
    },
    cardNumber: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#fff",
        marginBottom: 5,
    },
    cardLabel: {
        fontSize: 14,
        color: "#aaa",
    },
});