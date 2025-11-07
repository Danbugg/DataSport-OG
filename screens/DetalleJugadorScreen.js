import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
} from "react-native";

const API_BASE_URL = "http://localhost:3000";

export default function DetalleJugadorScreen({ route }) {
  const { itemId, itemData } = route.params || {};
  const [jugador, setJugador] = useState(itemData || null);
  const [loading, setLoading] = useState(!itemData);

  useEffect(() => {
    if (!itemData && itemId) {
      cargarJugador();
    }
  }, [itemId]);

  const cargarJugador = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/jugadores/${itemId}`);
      const data = await res.json();

      if (data.dorsal && typeof data.dorsal === "object") {
        data.dorsal = data.dorsal.low;
      }

      setJugador(data);
    } catch (error) {
      console.error("Error al cargar jugador:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#00aaff" />
        <Text style={{ color: "#fff", marginTop: 10 }}>Cargando jugador...</Text>
      </View>
    );
  }

  if (!jugador) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No se pudo cargar la información del jugador.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {jugador.foto && (
          <View style={styles.fotoContainer}>
            <Image source={{ uri: jugador.foto }} style={styles.fotoJugador} />
          </View>
        )}

        <Text style={styles.nombre}>{jugador.nombre}</Text>

        <View style={styles.infoBox}>
          <Text style={styles.label}>Nacionalidad:</Text>
          <Text style={styles.valor}>{jugador.nacionalidad || "Desconocida"}</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.label}>Posición:</Text>
          <Text style={styles.valor}>{jugador.posicion || "Sin posición"}</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.label}>Dorsal:</Text>
          <Text style={styles.valor}>
            {jugador.dorsal
              ? typeof jugador.dorsal === "object"
                ? jugador.dorsal.low
                : jugador.dorsal
              : "N/A"}
          </Text>
        </View>

        {jugador.equipo && (
          <View style={styles.infoBox}>
            <Text style={styles.label}>Equipo actual:</Text>
            <Text style={styles.valor}>{jugador.equipo}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#000",
  },
  container: {
    padding: 20,
    alignItems: "center",
    backgroundColor: "#000",
    flexGrow: 1,
    paddingTop: 70, // espacio superior
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  fotoContainer: {
    borderWidth: 2,
    borderColor: "#00aaff",
    padding: 5,
    borderRadius: 10, // 👈 borde cuadrado
    marginBottom: 20,
  },
  fotoJugador: {
    width: 160,
    height: 160,
    borderRadius: 10, // 👈 ahora cuadrada
    resizeMode: "contain", // evita que se corte el rostro
  },
  nombre: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
    textAlign: "center",
  },
  infoBox: {
    width: "100%",
    marginBottom: 10,
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#00aaff",
  },
  label: {
    color: "#ff0000",
    fontSize: 14,
    fontWeight: "bold",
  },
  valor: {
    color: "#fff",
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  errorText: {
    color: "#ff5555",
    fontSize: 18,
  },
});
