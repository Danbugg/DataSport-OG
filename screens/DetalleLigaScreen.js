import React, { useEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";

const API_BASE_URL = "http://localhost:3000";

export default function DetalleLigaScreen({ route }) {
  const navigation = useNavigation();
  const { itemId, itemData } = route.params || {};
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarEquipos = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/ligas/${itemId}/equipos`);
        const data = await response.json();

        // 🔹 Convierte id_equipo.low → número normal
        const equiposNormalizados = data.equipos.map((e) => ({
          ...e,
          id_equipo: e.id_equipo?.low ?? e.id_equipo,
        }));

        setEquipos(equiposNormalizados);
      } catch (error) {
        console.error("Error cargando equipos:", error);
      } finally {
        setLoading(false);
      }
    };

    cargarEquipos();
  }, [itemId]);

  const handleEquipoPress = (equipo) => {
    navigation.navigate("DetalleEquipoScreen", {
      itemId: equipo.id_equipo,
      itemData: equipo,
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00aaff" />
      </View>
    );
  }

  if (equipos.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: "#fff" }}>No hay equipos registrados.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{itemData?.nombre || "Equipos"}</Text>
      <FlatList
        data={equipos}
        keyExtractor={(item) => item.elementId}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => handleEquipoPress(item)}
          >
            <Text style={styles.itemText}>{item.nombre}</Text>
            {item.ciudad && (
              <Text style={styles.subText}>Ciudad: {item.ciudad}</Text>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  title: {
    fontSize: 22,
    color: "#ff0000",
    fontWeight: "bold",
    marginBottom: 15,
  },
  item: {
    backgroundColor: "#1a1a1a",
    padding: 15,
    borderRadius: 8,
    borderLeftColor: "#00aaff",
    borderLeftWidth: 3,
    marginBottom: 10,
  },
  itemText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  subText: {
    color: "#aaa",
    fontSize: 14,
    marginTop: 4,
  },
});
