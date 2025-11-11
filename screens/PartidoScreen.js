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
    Dimensions,
} from "react-native";
import axios from "axios";

const API_KEY = "adfca6c6036e18992bc72e8e9d5025d7"; 
const { width } = Dimensions.get('window');

const getEventIcon = (type, detail) => {
    switch (type) {
        case 'Goal':
            return detail === 'Own Goal' ? '🥅' : '⚽';
        case 'Card':
            return detail === 'Yellow Card' ? '🟨' : '🟥';
        case 'subst':
            return '🔁';
        default:
            return 'ⓘ';
    }
};

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

// Componente de Campo de Fútbol con Camisetas
const FormationField = ({ players, formation, teamColor, isHome }) => {
    const positions = formation?.split('-').map(Number) || [];
    
    const getPositionStyle = (playerIndex, lineIndex) => {
        const totalLines = positions.length;
        const playersInLine = positions[lineIndex];
        const playerPosition = players.filter((_, idx) => {
            let count = 0;
            for (let i = 0; i < lineIndex; i++) {
                count += positions[i];
            }
            return idx >= count && idx < count + positions[lineIndex];
        }).indexOf(players[playerIndex]);

        const verticalPosition = ((lineIndex + 1) / (totalLines + 1)) * 100;
        const horizontalPosition = ((playerPosition + 1) / (playersInLine + 1)) * 100;

        return {
            position: 'absolute',
            top: `${isHome ? verticalPosition : 100 - verticalPosition}%`,
            left: `${horizontalPosition}%`,
            transform: [{ translateX: -25 }, { translateY: -30 }],
        };
    };

    let playerCount = 0;

    return (
        <View style={fieldStyles.container}>
            <View style={fieldStyles.field}>
                {/* Líneas del campo */}
                <View style={[fieldStyles.halfLine, { top: '50%' }]} />
                <View style={fieldStyles.centerCircle} />
                <View style={[fieldStyles.penaltyBox, { top: 0 }]} />
                <View style={[fieldStyles.penaltyBox, { bottom: 0 }]} />

                {/* Jugadores con camisetas */}
                {positions.map((playersInLine, lineIndex) => {
                    const linePlayers = [];
                    for (let i = 0; i < playersInLine; i++) {
                        if (playerCount < players.length) {
                            const player = players[playerCount];
                            const isCaptain = player.player.name.includes('(C)') || player.player.name.includes('(c)');
                            
                            linePlayers.push(
                                <View
                                    key={playerCount}
                                    style={[
                                        fieldStyles.jerseyContainer,
                                        getPositionStyle(playerCount, lineIndex),
                                    ]}
                                >
                                    {/* Camiseta SVG simulada */}
                                    <View style={[fieldStyles.jersey, { backgroundColor: teamColor }]}>
                                        <View style={fieldStyles.jerseyNeck} />
                                        <View style={[fieldStyles.jerseySleeve, fieldStyles.jerseySleeveLeft]} />
                                        <View style={[fieldStyles.jerseySleeve, fieldStyles.jerseySleeveRight]} />
                                        <Text style={fieldStyles.jerseyNumber}>
                                            {player.player.number}
                                        </Text>
                                    </View>
                                    {isCaptain && (
                                        <View style={fieldStyles.captainBadgeField}>
                                            <Text style={fieldStyles.captainCField}>C</Text>
                                        </View>
                                    )}
                                </View>
                            );
                            playerCount++;
                        }
                    }
                    return linePlayers;
                })}
            </View>
        </View>
    );
};

const LineupPlayerItem = ({ player }) => {
    const isCaptain = player.player.name.includes('(C)') || player.player.name.includes('(c)');
    const displayName = player.player.name.replace(/ \((C|c)\)/g, '').trim();

    return (
        <View style={lineupStyles.playerItem}>
            <View style={[
                lineupStyles.playerNumber,
                isCaptain && lineupStyles.captainNumber
            ]}>
                <Text style={[
                    lineupStyles.numberText,
                    isCaptain && lineupStyles.captainNumberText
                ]}>
                    {player.player.number}
                </Text>
                {isCaptain && <View style={lineupStyles.captainBadge}>
                    <Text style={lineupStyles.captainC}>C</Text>
                </View>}
            </View>
            <View style={lineupStyles.playerInfo}>
                <Text style={[
                    lineupStyles.playerName, 
                    isCaptain && lineupStyles.captainName
                ]}>
                    {displayName}
                </Text>
                <Text style={lineupStyles.playerPosition}>{player.player.pos}</Text>
            </View>
        </View>
    );
};

const STATS_MAP = [
    { key: 'Ball Possession', name: 'Posesión', unit: '%' },
    { key: 'Shots on Goal', name: 'Tiros a Puerta', unit: '' },
    { key: 'Shots off Goal', name: 'Tiros Fuera', unit: '' },
    { key: 'Total Shots', name: 'Tiros Totales', unit: '' },
    { key: 'Blocked Shots', name: 'Tiros Bloqueados', unit: '' },
    { key: 'Fouls', name: 'Faltas', unit: '' },
    { key: 'Corner Kicks', name: 'Córners', unit: '' },
    { key: 'Offsides', name: 'Fueras de Juego', unit: '' },
    { key: 'Goalkeeper Saves', name: 'Paradas', unit: '' },
    { key: 'Total passes', name: 'Pases Totales', unit: '' },
    { key: 'Passes accurate', name: 'Pases Precisos', unit: '' },
    { key: 'Passes %', name: 'Precisión', unit: '%' },
];

const formatStatValue = (value) => {
    if (typeof value === 'string' && value.includes('%')) {
        return value.replace('%', '');
    }
    return value ?? 0;
};

const StatisticsView = ({ statsData, homeTeam, awayTeam }) => {
    if (!statsData || statsData.length < 2) {
        return (
            <View style={statStyles.emptyContainer}>
                <Text style={statStyles.emptyIcon}>📊</Text>
                <Text style={statStyles.emptyText}>Estadísticas no disponibles</Text>
            </View>
        );
    }

    const homeStatsRaw = statsData.find(s => s.team.id === homeTeam.id)?.statistics || [];
    const awayStatsRaw = statsData.find(s => s.team.id === awayTeam.id)?.statistics || [];

    const homeStats = new Map(homeStatsRaw.map(stat => [stat.type, formatStatValue(stat.value)]));
    const awayStats = new Map(awayStatsRaw.map(stat => [stat.type, formatStatValue(stat.value)]));

    return (
        <View style={statStyles.container}>
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
                
                const showBar = homePercent > 0 || awayPercent > 0;
                
                return (
                    <View key={key} style={statStyles.statRow}>
                        <Text style={statStyles.valueHome}>
                            {homeValue}{unit}
                        </Text>
                        
                        <View style={statStyles.statCenter}>
                            <Text style={statStyles.statName}>{name}</Text>
                            
                            {showBar && (
                                <View style={statStyles.barContainer}>
                                    <View 
                                        style={[
                                            statStyles.barHome, 
                                            { width: `${homePercent}%` }
                                        ]} 
                                    />
                                    <View 
                                        style={[
                                            statStyles.barAway, 
                                            { width: `${awayPercent}%` }
                                        ]} 
                                    />
                                </View>
                            )}
                        </View>
                        
                        <Text style={statStyles.valueAway}>
                            {awayValue}{unit}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
};

export default function PartidoScreen({ route, navigation }) {
    const { matchId } = route.params;
    const [match, setMatch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [statistics, setStatistics] = useState(null); 
    const [tab, setTab] = useState('detalles');

    useEffect(() => {
        const fetchMatchAndStatistics = async () => {
            if (!API_KEY) {
                console.error("Falta la clave de API-Sports.");
                setLoading(false);
                return;
            }
            
            try {
                const resMatch = await axios.get(
                    `https://v3.football.api-sports.io/fixtures?id=${matchId}`,
                    { headers: { "x-apisports-key": API_KEY } }
                );
                const matchData = resMatch.data.response[0];
                setMatch(matchData);
                
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
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#8b5cf6" />
                        <Text style={styles.loadingText}>Cargando partido...</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.backButtonCenter} 
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.backText}>← Volver</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    if (!match) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>⚽</Text>
                        <Text style={styles.emptyText}>Partido no encontrado</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.backButtonCenter} 
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.backText}>← Volver</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

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
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* Header con botón de volver */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButtonTop} 
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.backText}>←</Text>
                    </TouchableOpacity>
                    
                    <View style={styles.headerInfo}>
                        <Text style={styles.leagueName}>{match.league.name}</Text>
                        <Text style={styles.round}>
                            {match.league.country} • Jornada {match.league.round.split(' - ').pop()}
                        </Text>
                    </View>
                </View>

                {/* Marcador Principal */}
                <View style={styles.scoreBlock}>
                    {/* Equipo Local */}
                    <View style={styles.teamContainer}>
                        <View style={styles.logoContainer}>
                            <Image source={{ uri: homeTeam.logo }} style={styles.teamLogo} />
                        </View>
                        <Text style={styles.teamName} numberOfLines={2}>{homeTeam.name}</Text>
                    </View>

                    {/* Marcador Central */}
                    <View style={styles.scoreCenter}>
                        <View style={styles.scoreRow}>
                            <View style={styles.goalBox}>
                                <Text style={styles.goalNumber}>{goals.home ?? '-'}</Text>
                            </View>
                            <Text style={styles.scoreDivider}>:</Text>
                            <View style={styles.goalBox}>
                                <Text style={styles.goalNumber}>{goals.away ?? '-'}</Text>
                            </View>
                        </View>
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>
                                {getMatchTime(fixture)}
                            </Text>
                        </View>
                    </View>

                    {/* Equipo Visitante */}
                    <View style={styles.teamContainer}>
                        <View style={styles.logoContainer}>
                            <Image source={{ uri: awayTeam.logo }} style={styles.teamLogo} />
                        </View>
                        <Text style={styles.teamName} numberOfLines={2}>{awayTeam.name}</Text>
                    </View>
                </View>

                {/* Tabs */}
                <View style={tabStyles.container}>
                    <TouchableOpacity 
                        style={[tabStyles.tab, tab === 'detalles' && tabStyles.activeTab]}
                        onPress={() => setTab('detalles')}
                    >
                        <Text style={[tabStyles.tabText, tab === 'detalles' && tabStyles.activeText]}>
                            Detalles
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[tabStyles.tab, tab === 'estadisticas' && tabStyles.activeTab]}
                        onPress={() => setTab('estadisticas')}
                    >
                        <Text style={[tabStyles.tabText, tab === 'estadisticas' && tabStyles.activeText]}>
                            Estadísticas
                        </Text>
                    </TouchableOpacity>
                </View>
                
                {/* Contenido de Detalles */}
                {tab === 'detalles' && (
                    <>
                        {/* Eventos del Partido */}
                        {events.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Eventos del Partido</Text>
                                <View style={styles.card}>
                                    {events.map((event, index) => (
                                        <View key={index} style={styles.eventRow}>
                                            <View style={styles.eventLeft}>
                                                <View style={styles.eventTime}>
                                                    <Text style={styles.eventMinute}>{event.time.elapsed}'</Text>
                                                </View>
                                                <Text style={styles.eventIcon}>
                                                    {getEventIcon(event.type, event.detail)}
                                                </Text>
                                            </View>
                                            
                                            <View style={styles.eventCenter}>
                                                <Text style={styles.eventPlayer}>{event.player.name}</Text>
                                                {event.assist.name && event.type === 'Goal' && (
                                                    <Text style={styles.eventAssist}>
                                                        Asist: {event.assist.name}
                                                    </Text>
                                                )}
                                            </View>
                                            
                                            <Image 
                                                source={{ uri: event.team.logo }} 
                                                style={styles.eventLogo} 
                                            />
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Alineaciones con Campo Visual */}
                        {homeStarters.length > 0 && awayStarters.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Alineaciones</Text>
                                <View style={styles.card}>
                                    {/* Formaciones y DTs */}
                                    <View style={lineupStyles.formationRow}>
                                        <View style={lineupStyles.formationSide}>
                                            <Image source={{ uri: homeTeam.logo }} style={lineupStyles.teamLogoSmall} />
                                            <Text style={lineupStyles.formation}>
                                                {homeLineup.formation || 'N/A'}
                                            </Text>
                                            <Text style={lineupStyles.coach}>
                                                DT: {homeLineup.coach?.name || 'N/A'}
                                            </Text>
                                        </View>
                                        <View style={lineupStyles.formationSide}>
                                            <Image source={{ uri: awayTeam.logo }} style={lineupStyles.teamLogoSmall} />
                                            <Text style={lineupStyles.formation}>
                                                {awayLineup.formation || 'N/A'}
                                            </Text>
                                            <Text style={lineupStyles.coach}>
                                                DT: {awayLineup.coach?.name || 'N/A'}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Campo Visual */}
                                    <View style={lineupStyles.fieldSection}>
                                        <Text style={lineupStyles.fieldTitle}>🏟️ Posiciones en el Campo</Text>
                                        
                                        <View style={lineupStyles.fieldsContainer}>
                                            <View style={lineupStyles.fieldWrapper}>
                                                <Text style={lineupStyles.teamFieldLabel}>{homeTeam.name}</Text>
                                                <FormationField 
                                                    players={homeStarters} 
                                                    formation={homeLineup.formation}
                                                    teamColor="#8b5cf6"
                                                    isHome={true}
                                                />
                                            </View>
                                            
                                            <View style={lineupStyles.fieldWrapper}>
                                                <Text style={lineupStyles.teamFieldLabel}>{awayTeam.name}</Text>
                                                <FormationField 
                                                    players={awayStarters} 
                                                    formation={awayLineup.formation}
                                                    teamColor="#10b981"
                                                    isHome={false}
                                                />
                                            </View>
                                        </View>
                                    </View>
                                    
                                    {/* Titulares */}
                                    <Text style={lineupStyles.categoryTitle}>Titulares</Text>
                                    <View style={lineupStyles.playersRow}>
                                        <View style={lineupStyles.playersColumn}>
                                            {homeStarters.map((player, index) => (
                                                <LineupPlayerItem key={index} player={player} />
                                            ))}
                                        </View>
                                        <View style={lineupStyles.playersColumn}>
                                            {awayStarters.map((player, index) => (
                                                <LineupPlayerItem key={index} player={player} />
                                            ))}
                                        </View>
                                    </View>

                                    {/* Suplentes */}
                                    <Text style={lineupStyles.categoryTitle}>Suplentes</Text>
                                    <View style={lineupStyles.playersRow}>
                                        <View style={lineupStyles.playersColumn}>
                                            {homeSubs.map((player, index) => (
                                                <LineupPlayerItem key={index} player={player} />
                                            ))}
                                        </View>
                                        <View style={lineupStyles.playersColumn}>
                                            {awaySubs.map((player, index) => (
                                                <LineupPlayerItem key={index} player={player} />
                                            ))}
                                        </View>
                                    </View>
                                </View>
                            </View>
                        )}
                        
                        {/* Detalles del Estadio */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Información del Partido</Text>
                            <View style={styles.card}>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>🏟️ Estadio</Text>
                                    <Text style={styles.infoValue}>
                                        {fixture.venue.name || 'No disponible'}
                                    </Text>
                                </View>
                                <View style={styles.infoDivider} />
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>📍 Ciudad</Text>
                                    <Text style={styles.infoValue}>
                                        {fixture.venue.city || 'No disponible'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </>
                )}
                
                {/* Contenido de Estadísticas */}
                {tab === 'estadisticas' && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Estadísticas</Text>
                        <View style={styles.card}>
                            <StatisticsView 
                                statsData={statistics} 
                                homeTeam={homeTeam} 
                                awayTeam={awayTeam} 
                            />
                        </View>
                    </View>
                )}

            </ScrollView>
        </SafeAreaView>
    );
}

// Estilos de Campo de Fútbol con Camisetas
const fieldStyles = StyleSheet.create({
    container: {
        marginVertical: 15,
    },
    field: {
        width: '100%',
        height: 300,
        backgroundColor: '#1a4d2e',
        borderRadius: 12,
        position: 'relative',
        borderWidth: 2,
        borderColor: '#ffffff',
    },
    halfLine: {
        position: 'absolute',
        width: '100%',
        height: 2,
        backgroundColor: '#ffffff',
        opacity: 0.5,
    },
    centerCircle: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: '#ffffff',
        opacity: 0.5,
        top: '50%',
        left: '50%',
        transform: [{ translateX: -30 }, { translateY: -30 }],
    },
    penaltyBox: {
        position: 'absolute',
        width: '60%',
        height: 60,
        borderWidth: 2,
        borderColor: '#ffffff',
        opacity: 0.5,
        left: '20%',
    },
    jerseyContainer: {
        width: 50,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    jersey: {
        width: 46,
        height: 52,
        borderRadius: 8,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        borderWidth: 2,
        borderColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 5,
    },
    jerseyNeck: {
        position: 'absolute',
        top: 0,
        width: 16,
        height: 8,
        backgroundColor: '#ffffff',
        borderBottomLeftRadius: 4,
        borderBottomRightRadius: 4,
        opacity: 0.3,
    },
    jerseySleeve: {
        position: 'absolute',
        width: 12,
        height: 20,
        backgroundColor: 'rgba(0,0,0,0.2)',
        top: 8,
        borderRadius: 6,
    },
    jerseySleeveLeft: {
        left: -6,
        borderTopLeftRadius: 8,
    },
    jerseySleeveRight: {
        right: -6,
        borderTopRightRadius: 8,
    },
    jerseyNumber: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '900',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    captainBadgeField: {
        position: 'absolute',
        top: -5,
        right: 0,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#fbbf24',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#ffffff',
    },
    captainCField: {
        color: '#000000',
        fontSize: 12,
        fontWeight: '900',
    },
});

// Estilos de Alineación
const lineupStyles = StyleSheet.create({
    formationRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#262626',
        marginBottom: 20,
    },
    formationSide: {
        flex: 1,
        alignItems: 'center',
    },
    teamLogoSmall: {
        width: 40,
        height: 40,
        resizeMode: 'contain',
        marginBottom: 8,
    },
    formation: {
        color: '#8b5cf6',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 6,
    },
    coach: {
        color: '#737373',
        fontSize: 13,
        fontWeight: '500',
    },
    fieldSection: {
        marginVertical: 20,
    },
    fieldTitle: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 15,
    },
    fieldsContainer: {
        gap: 20,
    },
    fieldWrapper: {
        marginBottom: 15,
    },
    teamFieldLabel: {
        color: '#a3a3a3',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 10,
    },
    categoryTitle: {
        color: '#8b5cf6',
        fontSize: 15,
        fontWeight: '700',
        marginTop: 15,
        marginBottom: 12,
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    playersRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    playersColumn: {
        flex: 1,
        paddingHorizontal: 8,
    },
    playerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a1a',
    },
    playerNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#262626',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        position: 'relative',
    },
    captainNumber: {
        backgroundColor: '#8b5cf6',
        borderWidth: 2,
        borderColor: '#fbbf24',
    },
    numberText: {
        color: '#8b5cf6',
        fontSize: 13,
        fontWeight: '700',
    },
    captainNumberText: {
        color: '#ffffff',
    },
    playerInfo: {
        flex: 1,
    },
    playerName: {
        color: '#e5e5e5',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 2,
    },
    playerPosition: {
        color: '#737373',
        fontSize: 12,
        fontWeight: '500',
    },
    captainName: {
        color: '#ffffff',
        fontWeight: '600',
    },
    captainBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#fbbf24',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ffffff',
    },
    captainC: {
        color: '#000000',
        fontSize: 10,
        fontWeight: '900',
    },
});

// Estilos de Estadísticas
const statStyles = StyleSheet.create({
    container: {
        paddingVertical: 10,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    emptyText: {
        color: '#737373',
        fontSize: 15,
        fontWeight: '500',
    },
    statRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a1a',
    },
    valueHome: {
        flex: 1,
        color: '#8b5cf6',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
    valueAway: {
        flex: 1,
        color: '#10b981',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
    statCenter: {
        flex: 2,
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    statName: {
        color: '#a3a3a3',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    barContainer: {
        flexDirection: 'row',
        width: '100%',
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        backgroundColor: '#1a1a1a',
    },
    barHome: {
        backgroundColor: '#8b5cf6',
        height: '100%',
    },
    barAway: {
        backgroundColor: '#10b981',
        height: '100%',
    }
});

// Estilos de Tabs
const tabStyles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 4,
        marginHorizontal: 20,
        marginBottom: 20,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: '#8b5cf6',
    },
    tabText: {
        color: '#737373',
        fontSize: 15,
        fontWeight: '600',
    },
    activeText: {
        color: '#ffffff',
    }
});

// Estilos Generales
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0f0f0f",
    },
    scrollContent: {
        paddingBottom: 30,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    loadingContainer: {
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        padding: 40,
        borderRadius: 20,
        marginBottom: 30,
    },
    loadingText: {
        color: "#e5e5e5",
        marginTop: 15,
        fontSize: 16,
        fontWeight: '500',
    },
    emptyContainer: {
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        padding: 40,
        borderRadius: 20,
        marginBottom: 30,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 20,
    },
    emptyText: {
        color: "#e5e5e5",
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
    },
    backButtonTop: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#262626',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButtonCenter: {
        paddingVertical: 14,
        paddingHorizontal: 32,
        backgroundColor: '#262626',
        borderRadius: 25,
        borderWidth: 1,
        borderColor: '#404040',
    },
    backText: {
        color: "#8b5cf6",
        fontWeight: "700",
        fontSize: 18,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 20,
        backgroundColor: '#1a1a1a',
        borderBottomWidth: 1,
        borderBottomColor: '#262626',
    },
    headerInfo: {
        flex: 1,
        marginLeft: 15,
    },
    leagueName: {
        color: '#ffffff',
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 2,
    },
    round: {
        color: '#737373',
        fontSize: 13,
        fontWeight: '500',
    },
    scoreBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 30,
        backgroundColor: '#1a1a1a',
    },
    teamContainer: {
        flex: 1,
        alignItems: 'center',
    },
    logoContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#262626',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        borderWidth: 2,
        borderColor: '#404040',
    },
    teamLogo: {
        width: 50,
        height: 50,
        resizeMode: 'contain',
    },
    teamName: {
        color: '#e5e5e5',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
        paddingHorizontal: 5,
    },
    scoreCenter: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    goalBox: {
        backgroundColor: '#262626',
        width: 60,
        height: 60,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#404040',
    },
    goalNumber: {
        color: '#8b5cf6',
        fontSize: 32,
        fontWeight: '700',
    },
    scoreDivider: {
        color: '#404040',
        fontSize: 28,
        fontWeight: '300',
        marginHorizontal: 12,
    },
    statusBadge: {
        backgroundColor: '#10b981',
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    statusText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    sectionTitle: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
    },
    card: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#262626',
    },
    eventRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#262626',
    },
    eventLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 80,
    },
    eventTime: {
        backgroundColor: '#262626',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
        marginRight: 8,
    },
    eventMinute: {
        color: '#8b5cf6',
        fontSize: 13,
        fontWeight: '700',
    },
    eventIcon: {
        fontSize: 20,
    },
    eventCenter: {
        flex: 1,
        paddingHorizontal: 12,
    },
    eventPlayer: {
        color: '#e5e5e5',
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    eventAssist: {
        color: '#737373',
        fontSize: 13,
        fontWeight: '500',
    },
    eventLogo: {
        width: 28,
        height: 28,
        resizeMode: 'contain',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    infoLabel: {
        color: '#a3a3a3',
        fontSize: 15,
        fontWeight: '600',
    },
    infoValue: {
        color: '#e5e5e5',
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'right',
        flex: 1,
        marginLeft: 12,
    },
    infoDivider: {
        height: 1,
        backgroundColor: '#262626',
        marginVertical: 4,
    },
});