import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    View,
    Text,
    ActivityIndicator,
    TouchableOpacity,
    FlatList,
    StyleSheet,
} from "react-native";
import axios from "axios";

const API_KEY = "adfca6c6036e18992bc72e8e9d5025d7"; 
const API_URL = "https://v3.football.api-sports.io/fixtures?live=all"; 

export default function EstadisticaScreen({ navigation }) {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null); 

    const fetchMatches = async () => {
        setErrorMsg(null); 
        try {
            const res = await axios.get(API_URL, {
                headers: {
                    "x-apisports-key": API_KEY,
                },
            });

            if (res.data && res.data.response) {
                setMatches(res.data.response);
            } else {
                setMatches([]);
            }

        } catch (error) {
            let message = "Error de conexión o clave API. Intenta de nuevo.";
            
            if (error.response) {
                if (error.response.status === 401 || error.response.status === 403) {
                    message = "⚠️ Clave API Inválida o Expirada. Por favor, revísala.";
                } else if (error.response.status === 429) {
                    message = "⚠️ Límite de solicitudes excedido.";
                }
            } else if (error.request) {
                 message = "⚠️ Error de red. Asegúrate de tener conexión a Internet.";
            }
            setErrorMsg(message);
            setMatches([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMatches();
        const intervalId = setInterval(fetchMatches, 15000); 
        return () => clearInterval(intervalId);
    }, []);

    const getMatchTime = (fixture) => {
        const status = fixture.status;
        const shortStatus = status.short;

        if (['FT', 'AET', 'PEN', 'CANC', 'PST', 'ABD', 'SUSP'].includes(shortStatus)) {
            return status.long; 
        }

        if (['1H', 'HT', '2H', 'ET', 'BT', 'P', 'INT', 'LIVE'].includes(shortStatus)) {
            if (shortStatus === 'HT') {
                return 'Descanso';
            }
            if (status.elapsed) {
                 return `${status.elapsed}'`;
            }
            return status.long;
        } 
        
        if (shortStatus === "NS") {
            const matchTime = new Date(fixture.date).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
            });
            return `${matchTime}`;
        }
        
        return status.long;
    };

    const getStatusColor = (fixture) => {
        const shortStatus = fixture.status.short;
        if (['1H', '2H', 'ET', 'LIVE'].includes(shortStatus)) {
            return '#10b981'; // Verde para en vivo
        }
        if (shortStatus === 'HT') {
            return '#f59e0b'; // Naranja para descanso
        }
        if (shortStatus === 'FT') {
            return '#6b7280'; // Gris para finalizado
        }
        return '#8b5cf6'; // Púrpura para programado
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#8b5cf6" />
                        <Text style={styles.loadingText}>Cargando partidos en vivo...</Text>
                    </View>
                    
                    <TouchableOpacity
                        style={styles.backButtonCenter}
                        onPress={() => navigation.navigate("HomeTab")} 
                    >
                        <Text style={styles.backText}>← Volver al Inicio</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    if (errorMsg || !matches || matches.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>⚽</Text>
                        <Text style={[styles.emptyText, errorMsg && styles.errorText]}>
                            {errorMsg || "No hay partidos en vivo"}
                        </Text>
                        <Text style={styles.emptySubtext}>
                            {errorMsg ? "Verifica tu conexión" : "Vuelve más tarde para ver partidos en directo"}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.backButtonCenter}
                        onPress={() => navigation.navigate("HomeTab")}
                    >
                        <Text style={styles.backText}>← Volver al Inicio</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header con gradiente */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButtonTop}
                    onPress={() => navigation.navigate("HomeTab")}
                >
                    <Text style={styles.backText}>←</Text>
                </TouchableOpacity>
                
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Partidos en Vivo</Text>
                    <View style={styles.liveIndicator}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>{matches.length} en directo</Text>
                    </View>
                </View>
            </View>

            {/* Lista de partidos */}
            <FlatList
                data={matches}
                keyExtractor={(item) => item.fixture.id.toString()}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                    const statusColor = getStatusColor(item.fixture);
                    
                    return (
                        <TouchableOpacity
                            style={styles.card}
                            onPress={() =>
                                navigation.navigate("PartidoScreen", { matchId: item.fixture.id })
                            }
                            activeOpacity={0.8}
                        >
                            {/* Badge de liga */}
                            <View style={styles.leagueContainer}>
                                <Text style={styles.leagueText} numberOfLines={1}>
                                    {item.league.name}
                                </Text>
                                <Text style={styles.countryText}>{item.league.country}</Text>
                            </View>

                            {/* Equipos y marcador */}
                            <View style={styles.matchContent}>
                                <View style={styles.teamRow}>
                                    <Text style={styles.teamName} numberOfLines={1}>
                                        {item.teams.home.name}
                                    </Text>
                                    <View style={styles.scoreContainer}>
                                        <Text style={styles.score}>{item.goals.home ?? 0}</Text>
                                    </View>
                                </View>

                                <View style={styles.teamRow}>
                                    <Text style={styles.teamName} numberOfLines={1}>
                                        {item.teams.away.name}
                                    </Text>
                                    <View style={styles.scoreContainer}>
                                        <Text style={styles.score}>{item.goals.away ?? 0}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Estado del partido */}
                            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                                <Text style={styles.statusText}>
                                    {getMatchTime(item.fixture)}
                                </Text>
                            </View>

                            {/* Indicador de acción */}
                            <View style={styles.arrowContainer}>
                                <Text style={styles.arrow}>›</Text>
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0f0f0f",
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
        maxWidth: 320,
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
        marginBottom: 10,
    },
    emptySubtext: {
        color: "#737373",
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    errorText: {
        color: "#ef4444", 
        fontWeight: '700',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#1a1a1a',
        borderBottomWidth: 1,
        borderBottomColor: '#262626',
    },
    backButtonTop: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#262626',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
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
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        color: '#ffffff',
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 4,
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10b981',
        marginRight: 6,
    },
    liveText: {
        color: '#10b981',
        fontSize: 13,
        fontWeight: '600',
    },
    list: {
        padding: 16,
        paddingBottom: 30,
    },
    card: {
        backgroundColor: "#1a1a1a",
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#262626',
        overflow: 'hidden',
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    leagueContainer: {
        backgroundColor: '#262626',
        paddingVertical: 8,
        paddingHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    leagueText: {
        color: "#8b5cf6",
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
        marginRight: 8,
    },
    countryText: {
        color: '#737373',
        fontSize: 12,
        fontWeight: '500',
    },
    matchContent: {
        padding: 16,
    },
    teamRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    teamName: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
        marginRight: 12,
    },
    scoreContainer: {
        backgroundColor: '#262626',
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#404040',
    },
    score: {
        color: "#8b5cf6",
        fontSize: 20,
        fontWeight: "700",
    },
    statusBadge: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    statusText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    arrowContainer: {
        position: 'absolute',
        right: 16,
        top: '50%',
        marginTop: -15,
    },
    arrow: {
        color: '#404040',
        fontSize: 30,
        fontWeight: '300',
    },
});