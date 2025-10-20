import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    ActivityIndicator,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
} from "react-native";
import axios from "axios";

const API_KEY = "b9a9742ac0bbe81d1c226b95c758b058"; 

// Función auxiliar para obtener el ícono del evento
const getEventIcon = (type, detail) => {
    switch (type) {
        case 'Goal':
            return detail === 'Own Goal' ? '🥅 (Autogol)' : '⚽ (Gol)';
        case 'Card':
            return detail === 'Yellow Card' ? '🟨 (Amarilla)' : '🟥 (Roja)';
        case 'subst':
            return '🔁 (Sustitución)';
        default:
            return 'ⓘ';
    }
};

export default function PartidoScreen({ route, navigation }) {
    const { matchId } = route.params;
    const [match, setMatch] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMatch = async () => {
            if (!API_KEY) {
                console.error("Falta la clave de API-Sports.");
                setLoading(false);
                return;
            }
            try {
                // El endpoint /fixtures trae todos los datos: eventos, alineaciones, estadio, etc.
                const res = await axios.get(
                    `https://v3.football.api-sports.io/fixtures?id=${matchId}`,
                    {
                        headers: {
                            "x-apisports-key": API_KEY, 
                        },
                    }
                );
                setMatch(res.data.response[0] || null);
            } catch (error) {
                console.error("Error cargando el partido:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMatch();
    }, [matchId]);

    const getMatchTime = (fixture) => {
        const status = fixture.status;
        if (status.long === "Not Started") {
            const date = new Date(fixture.date);
            const dateStr = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
            const timeStr = date.toLocaleTimeString('es-ES', { hour: "2-digit", minute: "2-digit" });
            return `${dateStr} - ${timeStr}`;
        } else if (
            status.long === "1st Half" ||
            status.long === "2nd Half" ||
            status.long === "Halftime" ||
            status.long === "Extra Time" ||
            status.long === "Penalty Shootout"
        ) {
            return `${status.elapsed}' • ${status.short === 'HT' ? 'Descanso' : status.long}`;
        } else {
            return status.long;
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#ff0000" />
                <Text style={styles.loadingText}>Cargando datos del partido...</Text>

                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backText}>Volver</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!match) {
        return (
            <View style={styles.center}>
                <Text style={styles.emptyText}>No se encontró el partido.</Text>

                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backText}>Volver</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Datos
    const homeTeam = match.teams.home;
    const awayTeam = match.teams.away;
    const fixture = match.fixture;
    const goals = match.goals;
    const lineups = match.lineups || [];
    const events = match.events || []; // 🔥 Capturamos el array de eventos 🔥

    // Buscar alineaciones de local y visitante
    const homeLineup = lineups.find(l => l.team.id === homeTeam.id) || {};
    const awayLineup = lineups.find(l => l.team.id === awayTeam.id) || {};

    return (
        <View style={{ flex: 1, backgroundColor: "#000" }}>
            <ScrollView contentContainerStyle={styles.container}>
                
                {/* Botón Volver */}
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backText}>Volver</Text>
                </TouchableOpacity>

                {/* Info de la Liga/Fecha */}
                <View style={styles.header}>
                    <Text style={styles.league}>
                        {match.league.name}
                    </Text>
                    <Text style={styles.round}>
                        {match.league.country} | Jornada {match.league.round.split(' - ').pop()}
                    </Text>
                </View>

                {/* Bloque de Marcador Central */}
                <View style={styles.scoreBlock}>
                    {/* Equipo Local */}
                    <View style={styles.teamContainer}>
                        <Image source={{ uri: homeTeam.logo }} style={styles.teamLogo} />
                        <Text style={styles.teamName}>{homeTeam.name}</Text>
                    </View>

                    {/* Marcador y Tiempo */}
                    <View style={styles.scoreDetails}>
                        <Text style={styles.score}>
                            {goals.home ?? '-'} : {goals.away ?? '-'}
                        </Text>
                        <Text style={styles.timeStatus}>
                            {getMatchTime(fixture)}
                        </Text>
                    </View>

                    {/* Equipo Visitante */}
                    <View style={styles.teamContainer}>
                        <Image source={{ uri: awayTeam.logo }} style={styles.teamLogo} />
                        <Text style={styles.teamName}>{awayTeam.name}</Text>
                    </View>
                </View>

                {/* 🔥 NUEVA SECCIÓN DE EVENTOS 🔥 */}
                {events.length > 0 && (
                    <View style={styles.infoBox}>
                        <Text style={styles.infoTitle}>Eventos del Partido</Text>
                        {events.map((event, index) => (
                            <View key={index} style={styles.eventRow}>
                                <Text style={[
                                    styles.eventTime,
                                    { color: event.team.id === homeTeam.id ? '#ff0000' : '#00aaff' }
                                ]}>
                                    {event.time.elapsed}'
                                    {event.time.extra ? `+${event.time.extra}` : ''}
                                </Text>
                                <Text style={styles.eventText}>
                                    {getEventIcon(event.type, event.detail)} {event.player.name}
                                    {event.assist.name && event.type === 'Goal' ? ` (Asistencia: ${event.assist.name})` : ''}
                                </Text>
                                <Image source={{ uri: event.team.logo }} style={styles.eventTeamLogo} />
                            </View>
                        ))}
                    </View>
                )}
                
                {/* Información del Estadio y Ciudad */}
                <View style={styles.infoBox}>
                    <Text style={styles.infoTitle}>Detalles del Partido</Text>
                    <Text style={styles.infoText}>🏟️ **Estadio:** {fixture.venue.name || 'N/A'}</Text>
                    <Text style={styles.infoText}>📍 **Ciudad:** {fixture.venue.city || 'N/A'}</Text>
                </View>

                {/* Alineaciones y Formación */}
                {lineups.length > 0 && (
                    <View style={styles.infoBox}>
                        <Text style={styles.infoTitle}>Alineaciones y Formación</Text>
                        
                        <View style={styles.lineupRow}>
                            {/* Formación Local */}
                            <View style={styles.lineupColumn}>
                                <Text style={styles.lineupFormationText}>
                                    {homeLineup.formation || 'N/A'}
                                </Text>
                                <Text style={styles.lineupCoach}>
                                    DT: {homeLineup.coach?.name || 'N/A'}
                                </Text>
                            </View>

                            {/* Formación Visitante */}
                            <View style={styles.lineupColumn}>
                                <Text style={styles.lineupFormationText}>
                                    {awayLineup.formation || 'N/A'}
                                </Text>
                                <Text style={styles.lineupCoach}>
                                    DT: {awayLineup.coach?.name || 'N/A'}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        paddingTop: 50, 
        backgroundColor: "#000",
    },
    center: {
        flex: 1,
        backgroundColor: "#000",
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        color: "#fff",
        marginTop: 10,
    },
    emptyText: {
        color: "#999",
        fontSize: 18,
    },
    // Botón Volver
    backButton: {
        backgroundColor: "#222",
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 25,
        alignSelf: "flex-start",
        marginBottom: 20,
    },
    backText: {
        color: "#00aaff",
        fontWeight: "bold",
    },
    // Encabezado de la Liga
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    league: {
        color: "#ff0000", 
        fontSize: 22,
        fontWeight: "bold",
        marginBottom: 5,
    },
    round: {
        color: "#999",
        fontSize: 14,
    },
    // Bloque de Marcador
    scoreBlock: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 30,
        paddingHorizontal: 10,
    },
    teamContainer: {
        alignItems: 'center',
        flex: 1,
        maxWidth: '35%',
    },
    teamLogo: {
        width: 60, 
        height: 60,
        marginBottom: 8,
        resizeMode: 'contain',
    },
    teamName: {
        color: "#fff",
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: "center",
    },
    scoreDetails: {
        alignItems: 'center',
        flex: 1,
        maxWidth: '30%',
    },
    score: {
        color: "#00aaff", 
        fontSize: 36,
        fontWeight: "900", 
        marginBottom: 5,
    },
    timeStatus: {
        color: "#ff0000", 
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: "center",
    },
    // Box de Información Adicional (Estadio, Alineación, Eventos, etc.)
    infoBox: {
        backgroundColor: "#1a1a1a",
        padding: 15,
        borderRadius: 10,
        marginTop: 20,
    },
    infoTitle: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        paddingBottom: 5,
    },
    infoText: {
        color: "#ccc",
        fontSize: 15,
        marginBottom: 5,
    },
    // Estilos de la sección de Eventos
    eventRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    eventTime: {
        fontSize: 14,
        fontWeight: 'bold',
        width: 60, // Ancho fijo para el tiempo
    },
    eventText: {
        color: '#eee',
        fontSize: 14,
        flex: 1,
        paddingHorizontal: 10,
    },
    eventTeamLogo: {
        width: 25,
        height: 25,
        resizeMode: 'contain',
    },
    // Estilos de la sección de Alineación
    lineupRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    lineupColumn: {
        alignItems: 'center',
        flex: 1,
        paddingHorizontal: 10,
    },
    lineupFormationText: {
        color: '#ff0000', 
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 5,
        borderBottomWidth: 2,
        borderBottomColor: '#00aaff',
    },
    lineupCoach: {
        color: '#ccc',
        fontSize: 14,
        textAlign: 'center',
    }
});