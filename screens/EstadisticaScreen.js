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

// ✅ Nueva API Key
const API_KEY = "39148556504f43abcba1a1b613f70c05"; 
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
        // Recargar cada 15 segundos para datos en vivo
        const intervalId = setInterval(fetchMatches, 15000); 
        return () => clearInterval(intervalId);
    }, []);

    const getMatchTime = (fixture) => {
        const status = fixture.status;
        const shortStatus = status.short;

        // Estados Finales o Definitivos
        if (['FT', 'AET', 'PEN', 'CANC', 'PST', 'ABD', 'SUSP'].includes(shortStatus)) {
            return status.long; 
        }

        // Estados de Partido en Curso/Juego
        if (['1H', 'HT', '2H', 'ET', 'BT', 'P', 'INT', 'LIVE'].includes(shortStatus)) {
            if (shortStatus === 'HT') {
                return 'Descanso';
            }
            if (status.elapsed) {
                 return `${status.elapsed}'`;
            }
            return status.long;
        } 
        
        // Partido No Empezado (NS)
        if (shortStatus === "NS") {
            const matchTime = new Date(fixture.date).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
            });
            return `Empieza a las ${matchTime}`;
        }
        
        return status.long;
    };


    if (loading) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator size="large" color="#00ffcc" />
                <Text style={styles.loadingText}>Cargando partidos...</Text>
                
                {/* Botón Volver Centrado (Para pantallas de Loading/Error) */}
                <TouchableOpacity
                    style={styles.backButtonCenter}
                    onPress={() => navigation.navigate("HomeTab")} 
                >
                    <Text style={styles.backText}>← Volver</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    if (errorMsg || !matches || matches.length === 0) {
        return (
            <SafeAreaView style={styles.center}>
                <Text style={[styles.emptyText, errorMsg && styles.errorText]}>
                    {errorMsg || "📭 No hay partidos en vivo en este momento"}
                </Text>

                {/* Botón Volver Centrado (Para pantallas de Loading/Error) */}
                <TouchableOpacity
                    style={styles.backButtonCenter}
                    onPress={() => navigation.navigate("HomeTab")}
                >
                    <Text style={styles.backText}>← Volver</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            
            {/* ⬅️ BOTÓN VOLVER EN LA PARTE SUPERIOR (Nuevo lugar) ⬅️ */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButtonTop}
                    onPress={() => navigation.navigate("HomeTab")}
                >
                    <Text style={styles.backText}>← Volver</Text>
                </TouchableOpacity>
            </View>

            {/* Lista de partidos */}
            <FlatList
                data={matches}
                keyExtractor={(item) => item.fixture.id.toString()}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() =>
                            navigation.navigate("PartidoScreen", { matchId: item.fixture.id })
                        }
                    >
                        <Text style={styles.league}>
                            {item.league.name} - {item.league.country}
                        </Text>
                        <View style={styles.row}>
                            <Text style={styles.team}>{item.teams.home.name}</Text>
                            <Text style={styles.score}>
                                {item.goals.home ?? 0} - {item.goals.away ?? 0}
                            </Text>
                            <Text style={styles.team}>{item.teams.away.name}</Text>
                        </View>
                        <Text style={styles.time}>⏱️ {getMatchTime(item.fixture)}</Text>
                    </TouchableOpacity>
                )}
            />
            

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
    },
    // Estilo para el encabezado que contiene el botón de volver
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
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
        color: "#aaa",
        fontSize: 16,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    errorText: {
        color: "#ff3333", 
        fontWeight: 'bold',
        fontSize: 18,
        marginBottom: 20,
    },
    list: {
        flexGrow: 1,
        padding: 10,
        backgroundColor: "#000",
        paddingTop: 0, // Quitamos el padding de arriba para que el header lo maneje
    },
    card: {
        backgroundColor: "#111",
        borderRadius: 10,
        padding: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#222",
    },
    league: {
        color: "#0ff",
        fontSize: 14,
        marginBottom: 8,
        textAlign: "center",
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },
    team: {
        color: "#fff",
        fontSize: 16,
        flex: 1,
        textAlign: "center",
    },
    score: {
        color: "#0ff",
        fontSize: 18,
        fontWeight: "bold",
        marginHorizontal: 8,
    },
    time: {
        color: "#ff0000", 
        fontSize: 13,
        textAlign: "center",
        fontWeight: 'bold',
    },
    
    // --- ESTILOS DEL BOTÓN DE VOLVER (UNIFICADOS) ---
    
    // Estilo para el botón de Volver en la parte superior
    backButtonTop: {
        paddingVertical: 10,
        paddingHorizontal: 30,
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: '#00aaff', 
        borderRadius: 20,
        alignSelf: "flex-start", // Alinea a la izquierda en el header
        marginBottom: 20,
    },
    // Estilo para el botón de Volver cuando está centrado (Loading/Empty)
    backButtonCenter: {
        marginTop: 30,
        paddingVertical: 10,
        paddingHorizontal: 30,
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: '#00aaff', 
        borderRadius: 20,
    },
    backText: {
        color: "#00aaff", 
        fontWeight: "bold",
        fontSize: 16,
    },
});