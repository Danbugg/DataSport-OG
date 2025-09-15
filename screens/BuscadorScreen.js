import React, { useState, useEffect } from "react";
import { View, Text, TextInput, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";

export default function BuscadorScreen({ navigation, route }) {
  const { userId } = route.params || {};
  const [termino, setTermino] = useState("");
  const [resultados, setResultados] = useState({ ligas: [], equipos: [], jugadores: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (termino.length === 0) {
      setResultados({ ligas: [], equipos: [], jugadores: [] });
      return;
    }

    const timeoutId = setTimeout(() => {
      buscar(termino);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [termino]);

  const buscar = async (q) => {
    setLoading(true);
    try {
      const response = await fetch(`http://10.0.2.2:3000/buscar?q=${encodeURIComponent(q)}`);
      const data = await response.json();
      setResultados(data);
    } catch (error) {
      console.error("Error en búsqueda:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <Text style={styles.itemText}>{item.nombre}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Botón de retroceso */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.navigate("HomeScreen", { userId })}
      >
        <Text style={styles.backText}>←</Text>
      </TouchableOpacity>

      <TextInput
        placeholder="Buscar ligas, equipos o jugadores..."
        placeholderTextColor="#ccc"
        value={termino}
        onChangeText={setTermino}
        style={styles.input}
      />

      {loading && <ActivityIndicator size="large" color="#fff" />}

      {resultados.ligas.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.title}>Ligas</Text>
          <FlatList
            data={resultados.ligas}
            keyExtractor={(item) => item.elementId}
            renderItem={renderItem}
          />
        </View>
      )}

      {resultados.equipos.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.title}>Equipos</Text>
          <FlatList
            data={resultados.equipos}
            keyExtractor={(item) => item.elementId}
            renderItem={renderItem}
          />
        </View>
      )}

      {resultados.jugadores.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.title}>Jugadores</Text>
          <FlatList
            data={resultados.jugadores}
            keyExtractor={(item) => item.elementId}
            renderItem={renderItem}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#000" }, // fondo negro
  backButton: {
    position: "absolute",
    top: 40,
    left: 16,
    zIndex: 10,
    padding: 4,
    backgroundColor: "#800020", // vinotinto
    borderRadius: 6,
  },
  backText: {
    fontSize: 24,
    color: "#fff", // flecha blanca
    fontWeight: "bold",
  },
  input: {
    height: 50,
    borderColor: "#fff", // borde blanco
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 16,
    marginTop: 70,
    color: "#fff", // texto blanco
  },
  section: { marginBottom: 20 },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 8, color: "#fff" }, // título blanco
  item: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#555" }, // borde más tenue
  itemText: { color: "#fff" }, // texto de cada item blanco
});
