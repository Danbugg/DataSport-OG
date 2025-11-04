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
  Image
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

export default function DetalleEquipoScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { itemId, itemData } = route.params; 

  const [equipo, setEquipo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEquipoDetalle();
  }, [itemId]);

  const fetchEquipoDetalle = async () => {
    setLoading(true);
    try {
      
      const response = await fetch(`http://localhost:3000/equipo/${itemId}`);
      const data = await response.json();

      if (response.ok) {
        setEquipo(data);
      } else {
        Alert.alert("Error", data.error || "No se encontró el equipo.");
        navigation.goBack();
      }
    } catch (error) {
      console.error("Error al cargar detalle de equipo:", error);
      Alert.alert("Error de Conexión", "No se pudo conectar con el servidor API.");
    } finally {
      setLoading(false);
    }
  };

  const handleJugadorPress = (jugador) => {
    
    navigation.navigate("DetalleJugadorScreen", { 
        itemId: jugador.id_jugador, 
        itemData: jugador 
    });
  };

  const renderJugador = ({ item }) => (
    <TouchableOpacity 
        style={styles.jugadorItem} 
        onPress={() => handleJugadorPress(item)}
    >
        {item.foto ? (
            <Image source={{ uri: item.foto }} style={styles.jugadorImagen} />
        ) : (
            <View style={styles.jugadorPlaceholder} />
        )}
      <Text style={styles.jugadorNombre}>{item.nombre}</Text>
      <Ionicons name="chevron-forward-outline" size={20} color="#0033ff" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0033ff" />
        <Text style={styles.loadingText}>Cargando datos del Equipo...</Text>
      </View>
    );
  }

  if (!equipo) {
    return <View style={styles.errorContainer}><Text style={styles.errorText}>Datos no disponibles.</Text></View>;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        
        <View style={styles.header}>
            <Text style={styles.headerTitle}>{equipo.nombre}</Text>
            
            <Text style={styles.headerSubtitle}>Fundación: {equipo.fecha_fundacion || 'N/A'}</Text>
        </View>

        
        <Text style={styles.sectionTitle}>Plantilla de Jugadores</Text>
        
        <FlatList
          data={equipo.jugadores}
          keyExtractor={(item) => item.id_jugador.toString()}
          renderItem={renderJugador}
          scrollEnabled={false}
          ListEmptyComponent={() => (
            <Text style={styles.emptyText}>No se encontraron jugadores en este equipo.</Text>
          )}
        />
        
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
    position: 'absolute',
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
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0033ff',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    marginTop: 10,
  },
  jugadorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  jugadorNombre: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
  },
  jugadorImagen: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  jugadorPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#444',
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    padding: 20,
  }
});
