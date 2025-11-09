import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    Image,
    TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

const API_BASE_URL = "http://localhost:3000";

export default function DetalleLigaScreen({ route }) {
    const navigation = useNavigation();
    const { itemId } = route.params;

    const [liga, setLiga] = useState(null);
    const [equipos, setEquipos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        cargarDetalleLiga();
    }, []);

    const cargarDetalleLiga = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/liga/${itemId}`);
            const data = await response.json();
            
            if (data.error) {
                console.error("Error al cargar liga:", data.error);
                return;
            }

            setLiga(data);
            setEquipos(data.equipos || []);
        } catch (error) {
            console.error("Error al cargar detalle de liga:", error);
        } finally {
            setLoading(false);
        }
    };

    const navegarAEquipo = (equipo) => {
        navigation.navigate("DetalleEquipoScreen", {
            itemId: equipo.id_equipo || equipo.id,
            itemData: equipo,
        });
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#00aaff" />
                <Text style={styles.loadingText}>Cargando liga...</Text>
            </View>
        );
    }

    if (!liga) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>No se pudo cargar la información de la liga</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            {/* Header de la Liga */}
            <View style={styles.header}>
                <View style={styles.logoPlaceholder}>
                    <Text style={styles.logoText}>🏆</Text>
                </View>
                <Text style={styles.nombreLiga}>{liga.nombre}</Text>
                {liga.pais && (
                    <Text style={styles.pais}>📍 {liga.pais}</Text>
                )}
                {liga.nivel && (
                    <View style={styles.nivelBadge}>
                        <Text style={styles.nivelText}>División {liga.nivel}</Text>
                    </View>
                )}
            </View>

            {/* Información adicional */}
            <View style={styles.infoContainer}>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{equipos.length}</Text>
                    <Text style={styles.statLabel}>Equipos</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{liga.pais}</Text>
                    <Text style={styles.statLabel}>País</Text>
                </View>
            </View>

            {/* Lista de Equipos */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                    Equipos ({equipos.length})
                </Text>

                {equipos.length === 0 ? (
                    <Text style={styles.noDataText}>
                        No hay equipos registrados en esta liga
                    </Text>
                ) : (
                    equipos.map((equipo, index) => (
                        <TouchableOpacity
                            key={equipo.id_equipo || equipo.id || index}
                            style={styles.equipoCard}
                            onPress={() => navegarAEquipo(equipo)}
                        >
                            <View style={styles.equipoLogoPlaceholder}>
                                <Text style={styles.equipoLogoText}>⚽</Text>
                            </View>
                            <View style={styles.equipoInfo}>
                                <Text style={styles.equipoNombre}>{equipo.nombre}</Text>
                                {equipo.ciudad && (
                                    <Text style={styles.equipoCiudad}>
                                        📍 {equipo.ciudad}
                                    </Text>
                                )}
                                {equipo.estadio && (
                                    <Text style={styles.equipoEstadio}>
                                        🏟️ {equipo.estadio}
                                    </Text>
                                )}
                            </View>
                            <Text style={styles.arrow}>›</Text>
                        </TouchableOpacity>
                    ))
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
    nombreLiga: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#fff",
        textAlign: "center",
        marginBottom: 5,
        paddingHorizontal: 20,
    },
    pais: {
        fontSize: 16,
        color: "#aaa",
        marginTop: 5,
    },
    nivelBadge: {
        backgroundColor: "#00aaff",
        paddingHorizontal: 15,
        paddingVertical: 5,
        borderRadius: 15,
        marginTop: 10,
    },
    nivelText: {
        color: "#000",
        fontWeight: "bold",
        fontSize: 14,
    },
    infoContainer: {
        flexDirection: "row",
        padding: 16,
        justifyContent: "space-around",
    },
    statCard: {
        backgroundColor: "#1a1a1a",
        padding: 20,
        borderRadius: 12,
        alignItems: "center",
        flex: 1,
        marginHorizontal: 5,
        borderWidth: 1,
        borderColor: "#00aaff",
    },
    statNumber: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#00aaff",
        marginBottom: 5,
    },
    statLabel: {
        fontSize: 14,
        color: "#aaa",
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
    equipoCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#1a1a1a",
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        borderLeftWidth: 3,
        borderLeftColor: "#00aaff",
    },
    equipoLogoPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 8,
        backgroundColor: "#333",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 15,
        borderWidth: 1,
        borderColor: "#00aaff",
    },
    equipoLogoText: {
        fontSize: 24,
    },
    equipoInfo: {
        flex: 1,
    },
    equipoNombre: {
        fontSize: 18,
        fontWeight: "600",
        color: "#fff",
        marginBottom: 3,
    },
    equipoCiudad: {
        fontSize: 14,
        color: "#aaa",
        marginBottom: 2,
    },
    equipoEstadio: {
        fontSize: 13,
        color: "#666",
    },
    arrow: {
        fontSize: 30,
        color: "#00aaff",
        fontWeight: "300",
    },
});