import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
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

// La clave API permanece aquí
const API_KEY = "39148556504f43abcba1a1b613f70c05"; 

const getEventIcon = (type, detail) => {
    switch (type) {
        case 'Goal':
            return detail === 'Own Goal' ? '🥅 (Autogol)' : '⚽ (Gol)';
        case 'Card':
            return detail === 'Yellow Card' ? '🟨' : '🟥';
        case 'subst':
            return '🔁';
        default:
            return 'ⓘ';
    }
};

// Función para obtener el tiempo de partido (Sin cambios)
const getMatchTime = (fixture) => {
    const status = fixture.status;
    const shortStatus = status.short;

    if (['1H', 'HT', '2H', 'ET', 'BT', 'P', 'INT'].includes(shortStatus)) {
        const elapsed = status.elapsed || 0;
        
        if (shortStatus === 'HT') {
            return 'Descanso';
        }

        if (['FT', 'AET', 'PEN', 'CANC', 'PST'].includes(shortStatus)) {
            return status.long;
        }

        return `${elapsed}'`;
    } 
    
    if (status.long === "Not Started") {
        const date = new Date(fixture.date);
        const dateStr = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        const timeStr = date.toLocaleTimeString('es-ES', { hour: "2-digit", minute: "2-digit" });
        return `${dateStr} - ${timeStr}`;
    }

    return status.long;
};

// --- Componente Auxiliar para Item de Jugador (Se mantiene) ---
const LineupPlayerItem = ({ player }) => {
    const isCaptain = player.player.name.includes('(C)') || player.player.name.includes('(c)');
    const displayName = player.player.name.replace(/ \((C|c)\)/g, '').trim();

    return (
        <View style={lineupStyles.playerItem}>
            <Text style={lineupStyles.playerNumber}>{player.player.number}</Text>
            <Text 
                style={[
                    lineupStyles.playerName, 
                    isCaptain && { fontWeight: 'bold', color: '#ff0000' }
                ]}
            >
                {displayName}
                {isCaptain && <Text style={lineupStyles.captainIndicator}> (C)</Text>}
            </Text>
        </View>
    );
};
// ---------------------------------------------------------

// --- COMPONENTE: Vista de Estadísticas (Se mantiene) ---
const STATS_MAP = [
    { key: 'Ball Possession', name: 'Posesión', unit: '%' },
    { key: 'Shots on Goal', name: 'Tiros a Puerta', unit: '' },
    { key: 'Shots off Goal', name: 'Tiros Fuera', unit: '' },
    { key: 'Total Shots', name: 'Tiros Totales', unit: '' },
    { key: 'Blocked Shots', name: 'Tiros Bloqueados', unit: '' },
    { key: 'Fouls', name: 'Faltas', unit: '' },
    { key: 'Corner Kicks', name: 'Córners', unit: '' },
    { key: 'Offsides', name: 'Fueras de Juego', unit: '' },
    { key: 'Goalkeeper Saves', name: 'Paradas Portero', unit: '' },
    { key: 'Total passes', name: 'Pases Totales', unit: '' },
    { key: 'Passes accurate', name: 'Pases Precisos', unit: '' },
    { key: 'Passes %', name: 'Precisión Pases', unit: '%' },
];

const formatStatValue = (value) => {
    if (typeof value === 'string' && value.includes('%')) {
        return value.replace('%', '');
    }
    return value ?? 0;
};

const StatisticsView = ({ statsData, homeTeam, awayTeam }) => {
    if (!statsData || statsData.length < 2) {
        return <Text style={styles.emptyText}>Estadísticas no disponibles.</Text>;
    }

    const homeStatsRaw = statsData.find(s => s.team.id === homeTeam.id)?.statistics || [];
    const awayStatsRaw = statsData.find(s => s.team.id === awayTeam.id)?.statistics || [];

    const homeStats = new Map(homeStatsRaw.map(stat => [stat.type, formatStatValue(stat.value)]));
    const awayStats = new Map(awayStatsRaw.map(stat => [stat.type, formatStatValue(stat.value)]));

    return (
        <View style={statStyles.container}>
            {/* Encabezados de Equipos */}
            <View style={statStyles.teamHeaderRow}>
                <Text style={[statStyles.teamHeader, { color: '#ff0000' }]}>{homeTeam.name}</Text>
                <Text style={statStyles.statNameHeader}>Estadística</Text>
                <Text style={[statStyles.teamHeader, { color: '#00aaff' }]}>{awayTeam.name}</Text>
            </View>

            {/* Filas de Estadísticas */}
            {STATS_MAP.map(({ key, name, unit }) => {
                const homeValue = homeStats.get(key) || 0;
                const awayValue = awayStats.get(key) || 0;
                
                const isPercentageStat = unit === '%';
                let homePercent = 0;
                let awayPercent = 0;
                
                if (isPercentageStat) {
                    homePercent = Number(homeValue);
                    awayPercent = Number(awayValue);
                } else {
                    const total = Number(homeValue) + Number(awayValue);
                    if (total > 0) {
                        homePercent = (Number(homeValue) / total) * 100;
                        awayPercent = (Number(awayValue) / total) * 100;
                    }
                }
                
                const showBar = isPercentageStat || key === 'Total Shots';
                
                return (
                    <View key={key} style={statStyles.statRow}>
                        
                        {/* Valor Local */}
                        <Text style={[statStyles.valueText, { color: '#ff0000' }]}>
                            {homeValue}
                            {unit}
                        </Text>
                        
                        {/* Nombre de la Estadística y Barra */}
                        <View style={statStyles.statNameContainer}>
                            <Text style={statStyles.statNameText}>{name}</Text>
                            
                            {showBar && (
                                <View style={statStyles.barContainer}>
                                    <View style={[statStyles.barSegment, { width: `${homePercent}%`, backgroundColor: '#ff0000' }]} />
                                    <View style={[statStyles.barSegment, { width: `${awayPercent}%`, backgroundColor: '#00aaff' }]} />
                                </View>
                            )}
                        </View>
                        
                        {/* Valor Visitante */}
                        <Text style={[statStyles.valueText, { color: '#00aaff' }]}>
                            {awayValue}
                            {unit}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
};
// -----------------------------------------------------------------


export default function PartidoScreen({ route, navigation }) {
    const { matchId } = route.params;
    const [match, setMatch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [statistics, setStatistics] = useState(null); 
    const [tab, setTab] = useState('detalles'); // Estado para las pestañas

    // --- LÓGICA DE CARGA ---
    useEffect(() => {
        const fetchMatchAndStatistics = async () => {
            if (!API_KEY) {
                console.error("Falta la clave de API-Sports.");
                setLoading(false);
                return;
            }
            
            try {
                // 1. Cargar datos del partido (fixtures)
                const resMatch = await axios.get(
                    `https://v3.football.api-sports.io/fixtures?id=${matchId}`,
                    { headers: { "x-apisports-key": API_KEY } }
                );
                const matchData = resMatch.data.response[0];
                setMatch(matchData);
                
                // 2. Cargar Estadísticas (nuevo endpoint)
                if (matchData) {
                    const resStats = await axios.get(
                        `https://v3.football.api-sports.io/fixtures/statistics?fixture=${matchId}`,
                        { headers: { "x-apisports-key": API_KEY } }
                    );
                    setStatistics(resStats.data.response);
                }

            } catch (error) {
                console.error("Error cargando datos:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMatchAndStatistics();
    }, [matchId]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#ff0000" />
                <Text style={styles.loadingText}>Cargando datos del partido...</Text>
                {/* 1. Botón Volver en estado de carga (Corregido) */}
                <TouchableOpacity
                    style={styles.backButtonCenter} 
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backText}>← Volver</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!match) {
        return (
            <View style={styles.center}>
                <Text style={styles.emptyText}>No se encontró el partido.</Text>
                {/* 2. Botón Volver en estado de error/vacío (Corregido) */}
                <TouchableOpacity
                    style={styles.backButtonCenter} 
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backText}>← Volver</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Datos necesarios para el renderizado
    const homeTeam = match.teams.home;
    const awayTeam = match.teams.away;
    const fixture = match.fixture;
    const lineups = match.lineups || [];
    const goals = match.goals;
    const events = match.events || []; 

    const homeLineup = lineups.find(l => l.team.id === homeTeam.id) || {};
    const awayLineup = lineups.find(l => l.team.id === awayTeam.id) || {};

    const homeStarters = homeLineup.startXI || [];
    const homeSubs = homeLineup.substitutes || [];
    const awayStarters = awayLineup.startXI || [];
    const awaySubs = awayLineup.substitutes || [];


    return (
        <View style={{ flex: 1, backgroundColor: "#000" }}>
            <ScrollView contentContainerStyle={styles.container}>
                
                {/* 3. Botón Volver en ScrollView (Corregido) */}
                <TouchableOpacity
                    style={styles.backButtonTop} 
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backText}>← Volver</Text>
                </TouchableOpacity>

                {/* Info de la Liga/Fecha */}
                <View style={styles.header}>
                    <Text style={styles.round}>
                        {match.league.country} | Jornada {match.league.round.split(' - ').pop()}
                    </Text>
                    <Text style={styles.league}>
                        {match.league.name}
                    </Text>
                </View>

                {/* Bloque de Marcador Central */}
                <View style={styles.scoreBlock}>
                    <View style={styles.teamContainer}>
                        <Image source={{ uri: homeTeam.logo }} style={styles.teamLogo} />
                        <Text style={styles.teamName}>{homeTeam.name}</Text>
                    </View>
                    <View style={styles.scoreDetails}>
                        <Text style={styles.score}>
                            {goals.home ?? '-'} : {goals.away ?? '-'}
                        </Text>
                        <Text style={styles.timeStatus}>
                            {getMatchTime(fixture)}
                        </Text>
                    </View>
                    <View style={styles.teamContainer}>
                        <Image source={{ uri: awayTeam.logo }} style={styles.teamLogo} />
                        <Text style={styles.teamName}>{awayTeam.name}</Text>
                    </View>
                </View>

                {/* --- PESTAÑAS (TABS) --- */}
                <View style={tabStyles.tabContainer}>
                    {/* Detalles */}
                    <TouchableOpacity 
                        style={[tabStyles.tab, tab === 'detalles' && tabStyles.activeTab]}
                        onPress={() => setTab('detalles')}
                    >
                        <Text style={tabStyles.tabText}>Detalles</Text>
                    </TouchableOpacity>
                    
                    {/* Estadísticas */}
                    <TouchableOpacity 
                        style={[tabStyles.tab, tab === 'estadisticas' && tabStyles.activeTab]}
                        onPress={() => setTab('estadisticas')}
                    >
                        <Text style={tabStyles.tabText}>Estadísticas</Text>
                    </TouchableOpacity>
                </View>
                
                {/* --- CONTENIDO DE DETALLES --- */}
                {tab === 'detalles' && (
                    <>
                        {/* Bloque de Alineación Detallada (Tabla) */}
                        {homeStarters.length > 0 && awayStarters.length > 0 && (
                            <View style={styles.dataBox}>
                                <Text style={styles.boxTitle}>Alineación</Text>
                                
                                <View style={lineupStyles.formationRow}>
                                    <View style={lineupStyles.formationColumn}>
                                        <Text style={lineupStyles.formationText}>{homeLineup.formation || 'N/A'}</Text>
                                        <Text style={lineupStyles.coachText}>DT: {homeLineup.coach?.name || 'N/A'}</Text>
                                    </View>
                                    <View style={lineupStyles.formationColumn}>
                                        <Text style={lineupStyles.formationText}>{awayLineup.formation || 'N/A'}</Text>
                                        <Text style={lineupStyles.coachText}>DT: {awayLineup.coach?.name || 'N/A'}</Text>
                                    </View>
                                </View>
                                
                                <Text style={lineupStyles.sectionHeading}>Titulares</Text>
                                <View style={styles.playersRow}>
                                    <View style={styles.playersColumn}>
                                        {homeStarters.map((player, index) => (<LineupPlayerItem key={index} player={player} />))}
                                    </View>
                                    <View style={styles.playersColumn}>
                                        {awayStarters.map((player, index) => (<LineupPlayerItem key={index} player={player} />))}
                                    </View>
                                </View>

                                <Text style={lineupStyles.sectionHeading}>Suplentes</Text>
                                <View style={styles.playersRow}>
                                    <View style={styles.playersColumn}>
                                        {homeSubs.map((player, index) => (<LineupPlayerItem key={index} player={player} />))}
                                    </View>
                                    <View style={styles.playersColumn}>
                                        {awaySubs.map((player, index) => (<LineupPlayerItem key={index} player={player} />))}
                                    </View>
                                </View>

                            </View>
                        )}

                        {/* Bloque de Eventos */}
                        {events.length > 0 && (
                            <View style={styles.dataBox}>
                                <Text style={styles.boxTitle}>Eventos del Partido</Text>
                                {events.map((event, index) => (
                                    <View key={index} style={styles.eventRow}>
                                        <View style={styles.eventLeft}>
                                            <Text style={styles.eventIconText}>
                                                {getEventIcon(event.type, event.detail)}
                                            </Text>
                                            <Text style={styles.eventTime}>
                                                {event.time.elapsed}'
                                            </Text>
                                        </View>
                                        <Text style={styles.eventText}>
                                            {event.player.name}
                                            {event.assist.name && event.type === 'Goal' ? 
                                                ` (Asist.: ${event.assist.name})` : ''}
                                        </Text>
                                        <Image source={{ uri: event.team.logo }} style={styles.eventTeamLogo} />
                                    </View>
                                ))}
                            </View>
                        )}
                        
                        {/* Bloque de Detalles (Estadio) */}
                        <View style={styles.dataBox}>
                            <Text style={styles.boxTitle}>Detalles del Partido</Text>
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>🏟️ Estadio:</Text>
                                <Text style={styles.detailValue}>{fixture.venue.name || 'N/A'}</Text>
                            </View>
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>📍 Ciudad:</Text>
                                <Text style={styles.detailValue}>{fixture.venue.city || 'N/A'}</Text>
                            </View>
                        </View>
                    </>
                )}
                
                {/* --- CONTENIDO DE ESTADÍSTICAS (NUEVO) --- */}
                {tab === 'estadisticas' && (
                    <View style={styles.dataBox}>
                          <Text style={styles.boxTitle}>Estadísticas del Partido</Text>
                         <StatisticsView 
                            statsData={statistics} 
                            homeTeam={homeTeam} 
                            awayTeam={awayTeam} 
                         />
                    </View>
                )}


            </ScrollView>
        </View>
    );
}

// Estilos de la tabla de alineación (Se mantienen)
const lineupStyles = StyleSheet.create({
    formationRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    formationColumn: {
        alignItems: 'center',
        flex: 1,
    },
    formationText: {
        color: '#fff', 
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 3,
    },
    coachText: {
        color: '#999',
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 10,
    },
    sectionHeading: {
        color: '#ff0000',
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 15,
        marginBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        paddingBottom: 3,
        textAlign: 'center',
    },
    playerItem: {
        flexDirection: 'row',
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        alignItems: 'center',
    },
    playerNumber: {
        color: '#00aaff',
        fontSize: 14,
        fontWeight: 'bold',
        width: 30, 
        textAlign: 'right',
        marginRight: 10,
    },
    playerName: {
        color: '#eee',
        fontSize: 14,
        flex: 1,
    },
    captainIndicator: {
        color: '#ffcc00', 
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 5,
    }
});

// --- ESTILOS ESPECÍFICOS DE LAS ESTADÍSTICAS (NUEVOS) ---
const statStyles = StyleSheet.create({
    container: {
        marginTop: 10,
    },
    teamHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#555',
        marginBottom: 10,
    },
    teamHeader: {
        flex: 1,
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 14,
    },
    statNameHeader: {
        flex: 2,
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 14,
        color: '#fff',
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    valueText: {
        flex: 1,
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    statNameContainer: {
        flex: 2,
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    statNameText: {
        color: '#ccc',
        fontSize: 14,
        marginBottom: 5,
        fontWeight: '600',
        textAlign: 'center',
    },
    barContainer: {
        flexDirection: 'row',
        height: 8,
        width: '100%',
        borderRadius: 4,
        overflow: 'hidden',
        backgroundColor: '#333',
    },
    barSegment: {
        height: '100%',
    }
});
// -----------------------------------------------------------------

// --- ESTILOS GENERALES Y DE TABS (Actualizados) ---
const tabStyles = StyleSheet.create({
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    tab: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#ff0000',
    },
    tabText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    }
});

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
        textAlign: 'center',
    },
    // 1. Estilo para el botón de Volver en la parte superior (Scrollview)
    backButtonTop: {
        paddingVertical: 10,
        paddingHorizontal: 30,
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: '#00aaff', // Azul brillante
        borderRadius: 20,
        alignSelf: "flex-start", // Alinea a la izquierda en el ScrollView
        marginBottom: 20,
    },
    // 2. Estilo para el botón de Volver cuando está centrado (Loading/Empty)
    backButtonCenter: {
        marginTop: 30,
        paddingVertical: 10,
        paddingHorizontal: 30,
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: '#00aaff', // Azul brillante
        borderRadius: 20,
    },
    backText: {
        color: "#00aaff", // Color del texto igual al del borde
        fontWeight: "bold",
        fontSize: 16,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
        backgroundColor: '#1a1a1a', 
        padding: 15,
        borderRadius: 10,
    },
    league: {
        color: "#fff", 
        fontSize: 24,
        fontWeight: "bold",
        textAlign: 'center',
    },
    round: {
        color: "#ff0000", 
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 5,
    },
    scoreBlock: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 30,
        paddingHorizontal: 5,
    },
    teamContainer: {
        alignItems: 'center',
        flex: 1,
        maxWidth: '35%',
    },
    teamLogo: {
        width: 70, 
        height: 70,
        marginBottom: 10,
        resizeMode: 'contain',
    },
    teamName: {
        color: "#fff",
        fontSize: 16,
        fontWeight: '600',
        textAlign: "center",
        minHeight: 40, 
    },
    scoreDetails: {
        alignItems: 'center',
        flex: 1,
        maxWidth: '30%',
    },
    score: {
        color: "#00aaff", 
        fontSize: 40,
        fontWeight: "900", 
        marginBottom: 5,
    },
    timeStatus: {
        color: "#ff0000", 
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: "center",
    },
    dataBox: {
        backgroundColor: "#1a1a1a",
        padding: 15,
        borderRadius: 10,
        marginTop: 15,
        borderWidth: 1,
        borderColor: '#333',
    },
    boxTitle: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        paddingBottom: 5,
    },
    detailItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 5,
    },
    detailLabel: {
        color: '#ccc',
        fontSize: 15,
    },
    detailValue: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '500',
        textAlign: 'right',
    },
    eventRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    eventLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 80, 
    },
    eventIconText: {
        fontSize: 16,
        marginRight: 5,
    },
    eventTime: {
        color: '#999',
        fontSize: 14,
        fontWeight: 'bold',
    },
    eventText: {
        color: '#eee',
        fontSize: 15,
        flex: 1,
        paddingHorizontal: 10,
    },
    eventTeamLogo: {
        width: 28,
        height: 28,
        resizeMode: 'contain',
    },
    playersRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    playersColumn: {
        flex: 1,
        paddingHorizontal: 5,
    }
});