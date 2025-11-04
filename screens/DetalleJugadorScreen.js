import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

export default function DetalleJugadorScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { itemId } = route.params;

  const [jugador, setJugador] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJugadorDetalle();
  }, [itemId]);

  const fetchJugadorDetalle = async () => {
    setLoading(true);
    try {
      // 🔹 Usa tu IP local si estás en un dispositivo físico o emulador
      const response = await fetch(`http://localhost:3000/jugador/${itemId}`);
      const data = await response.json();

      if (response.ok) {
        setJugador(data);
      } else {
        Alert.alert("Error", data.error || "No se encontró el jugador.");
        navigation.goBack();
      }
    } catch (error) {
      console.error("Error al cargar detalle de jugador:", error);
      Alert.alert("Error de Conexión", "No se pudo conectar con el servidor API.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0033ff" />
        <Text style={styles.loadingText}>Cargando datos del Jugador...</Text>
      </View>
    );
  }

  if (!jugador) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Datos no disponibles.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Foto y Nombre del Jugador */}
        <View style={styles.header}>
          {jugador.foto ? (
            <Image source={{ uri: jugador.foto }} style={styles.jugadorFoto} />
          ) : (
            <View style={styles.jugadorPlaceholder} />
          )}
          <Text style={styles.headerTitle}>
            {jugador.nombre} {jugador.apellido}
          </Text>
          <Text style={styles.headerSubtitle}>
            Posición: {jugador.posicion || "N/A"}
          </Text>
        </View>

        {/* Detalles Adicionales */}
        <View style={styles.detailCard}>
          <Text style={styles.detailRow}>
            <Text style={styles.detailLabel}>Nacionalidad: </Text>
            <Text style={styles.detailValue}>{jugador.nacionalidad || "N/A"}</Text>
          </Text>

          <Text style={styles.detailRow}>
            <Text style={styles.detailLabel}>Fecha de Nacimiento: </Text>
            <Text style={styles.detailValue}>
              {jugador.fecha_nacimiento
                ? new Date(jugador.fecha_nacimiento).toLocaleDateString()
                : "N/A"}
            </Text>
          </Text>

          <Text style={styles.detailRow}>
            <Text style={styles.detailLabel}>Altura: </Text>
            <Text style={styles.detailValue}>
              {jugador.altura ? `${jugador.altura} m` : "N/A"}
            </Text>
          </Text>

          <Text style={styles.detailRow}>
            <Text style={styles.detailLabel}>Peso: </Text>
            <Text style={styles.detailValue}>
              {jugador.peso ? `${jugador.peso} kg` : "N/A"}
            </Text>
          </Text>
        </View>
      </ScrollView>
    </View>
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
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  errorText: {
    color: "red",
    fontSize: 16,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 10,
    zIndex: 10,
    padding: 10,
  },
  scrollContent: {
    paddingTop: 100,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: "center",
  },
  header: {
    marginBottom: 30,
    alignItems: "center",
    paddingBottom: 15,
  },
  jugadorFoto: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: "#0033ff",
    marginBottom: 15,
  },
  jugadorPlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#444",
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#0033ff",
    marginTop: 5,
  },
  detailCard: {
    width: "100%",
    backgroundColor: "#111",
    borderRadius: 15,
    padding: 20,
    shadowColor: "#0033ff",
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 3,
  },
  detailRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  detailLabel: {
    fontWeight: "bold",
    color: "#aaa",
    fontSize: 16,
  },
  detailValue: {
    color: "#fff",
    fontSize: 16,
  },
});
