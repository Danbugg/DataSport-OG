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
// ------------------------------------

export default function BuscadorScreen({ route }) {
    const navigation = useNavigation();
    const { userId } = route.params || {};

    const [termino, setTermino] = useState("");
    const [resultados, setResultados] = useState({
        ligas: [],
        equipos: [],
        jugadores: [],
        usuarios: [],
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (termino.length === 0) {
            setResultados({ ligas: [], equipos: [], jugadores: [], usuarios: [] });
            return;
        }

        const timeoutId = setTimeout(() => {
            buscar(termino);
        }, 800);

        return () => clearTimeout(timeoutId);
    }, [termino]);

    const buscar = async (q) => {
        setLoading(true);
        try {
            const response = await fetch(
                `${API_BASE_URL}/buscar?q=${encodeURIComponent(q)}`
            );
            const data = await response.json();
            setResultados(data);
        } catch (error) {
            console.error("Error en búsqueda:", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePress = (item, tipo) => {
        let screenName;
        let itemId;

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
            itemId = item.id_usuario;
        }

        if (screenName) {
            navigation.navigate(screenName, {
                itemId: itemId || item.elementId,
                itemData: item,
            });
        }
    };

    const renderItem = ({ item, tipo }) => (
        <TouchableOpacity
            style={styles.item}
            onPress={() => handlePress(item, tipo)}
        >
            <Text style={styles.itemText}>{item.nombre}</Text>
        </TouchableOpacity>
    );

    const renderJugador = ({ item }) => (
        <TouchableOpacity
            style={styles.itemJugador}
            onPress={() => handlePress(item, "jugador")}
        >
            {item.foto ? (
                <Image source={{ uri: item.foto }} style={styles.jugadorImagen} /> 
            ) : (
                <View style={styles.jugadorPlaceholder} />
            )}
            <Text style={styles.itemText}>{item.nombre}</Text>
        </TouchableOpacity>
    );

    const renderUsuario = ({ item }) => (
        <TouchableOpacity
            style={styles.itemJugador}
            onPress={() => handlePress(item, "usuario")}
        >
            {item.foto_perfil ? ( 
                <Image source={{ uri: item.foto_perfil }} style={styles.jugadorImagen} /> 
            ) : (
                <View style={styles.jugadorPlaceholder} />
            )}
            <Text style={styles.itemText}>
                {item.nombre} {item.apellido} (@{item.nombre_usuario})
            </Text> 
        </TouchableOpacity>
    );

    const hayResultados =
        resultados.ligas.length > 0 ||
        resultados.equipos.length > 0 ||
        resultados.jugadores.length > 0 ||
        resultados.usuarios.length > 0;

    return (
        <View style={styles.container}>
            <TextInput
                placeholder="Buscar ligas, equipos, jugadores o usuarios..."
                placeholderTextColor="#999"
                value={termino}
                onChangeText={setTermino}
                style={styles.input}
            />

            {loading && <ActivityIndicator size="large" color="#00aaff" />}

            {termino.length > 0 && !loading && !hayResultados && (
                <Text style={styles.noResultsText}>
                    No se encontraron resultados para "{termino}".
                </Text>
            )}

            <ScrollView contentContainerStyle={styles.scrollContent}>
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
        backgroundColor: '#1a1a1a', 
        fontSize: 16,
    },
    scrollContent: {
        paddingBottom: 20, 
    },
    section: { 
        marginBottom: 5 
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
        backgroundColor: '#1a1a1a', 
        marginBottom: 4,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#00aaff',
    },
    itemText: { 
        color: "#eee", 
        fontSize: 16,
        fontWeight: '500',
    },
    itemJugador: {
        flexDirection: "row",
        alignItems: "center",
        padding: 10,
        backgroundColor: '#1a1a1a', 
        marginBottom: 4,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#00aaff',
    },
    jugadorImagen: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        marginRight: 15,
        borderWidth: 1,
        borderColor: '#fff',
    },
    jugadorPlaceholder: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        marginRight: 15,
        backgroundColor: "#333",
    },
    noResultsText: {
        color: '#999',
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
    },
});
