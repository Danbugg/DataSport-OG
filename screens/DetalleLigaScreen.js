import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

export default function DetalleLigaScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { itemId, itemData } = route.params; 

  const [liga, setLiga] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLigaDetalle();
  }, [itemId]);

  const fetchLigaDetalle = async () => {
    setLoading(true);
    try {
      
      const response = await fetch(`http://localhost:3000/liga/${itemId}`);
      const data = await response.json();

      if (response.ok) {
        setLiga(data);
      } else {
        Alert.alert("Error", data.error || "No se encontró la liga.");
        navigation.goBack();
      }
    } catch (error) {
      console.error("Error al cargar detalle de liga:", error);
      Alert.alert("Error de conexión", "No se pudo conectar con el servidor API.");
    } finally {
      setLoading(false);
    }
  };

  const handleEquipoPress = (equipo) => {
    navigation.navigate("DetalleEquipoScreen", {
      itemId: equipo.id_equipo,
      itemData: equipo,
    });
  };

  const renderEquipo = ({ item }) => (
    <TouchableOpacity
      style={styles.equipoItem}
      onPress={() => handleEquipoPress(item)}
    >
      <Text style={styles.equipoNombre}>{item.nombre}</Text>
      <Ionicons name="chevron-forward-outline" size={20} color="#0033ff" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0033ff" />
        <Text style={styles.loadingText}>Cargando datos de la Liga...</Text>
      </View>
    );
  }

  if (!liga) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Datos no disponibles.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{liga.nombre}</Text>
          <Text style={styles.headerSubtitle}>
            Detalles de la temporada actual...
          </Text>
        </View>

        
        <Text style={styles.sectionTitle}>Equipos de la Liga</Text>

        <FlatList
          data={liga.equipos}
          keyExtractor={(item) => item.id_equipo.toString()}
          renderItem={renderEquipo}
          scrollEnabled={false}
          ListEmptyComponent={() => (
            <Text style={styles.emptyText}>
              No se encontraron equipos en esta liga.
            </Text>
          )}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  loadingText: { color: "#fff", marginTop: 10 },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  errorText: { color: "red", fontSize: 16 },
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
  },
  header: {
    marginBottom: 30,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0033ff",
    textAlign: "center",
  },
  headerSubtitle: { fontSize: 14, color: "#aaa", marginTop: 5 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 15,
    marginTop: 10,
  },
  equipoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  equipoNombre: { color: "#fff", fontSize: 16, fontWeight: "500" },
  emptyText: { color: "#999", textAlign: "center", padding: 20 },
});
