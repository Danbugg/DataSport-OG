import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from "react-native";
import axios from "axios";

export default function EstadisticaScreen({ navigation }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await axios.get(
          "https://v3.football.api-sports.io/fixtures?live=all",
          {
            headers: {
              "x-apisports-key": "",
            },
          }
        );

        setMatches(res.data.response || []);
      } catch (error) {
        console.error("Error cargando partidos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, []);

  const getMatchTime = (fixture) => {
    const status = fixture.status;
    if (status.long === "Not Started") {
      return `Empieza a las ${new Date(fixture.date).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } else if (
      status.long === "1st Half" ||
      status.long === "2nd Half" ||
      status.long === "Halftime"
    ) {
      return `${status.elapsed}' • ${status.long}`;
    } else {
      return status.long; // Ej: Finished
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00ffcc" />
        <Text style={styles.loadingText}>Cargando partidos...</Text>

        {/* Botón volver */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate("HomeScreen")}
        >
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>📭 No hay partidos en vivo</Text>

        {/* Botón volver */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate("HomeScreen")}
        >
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Botón volver */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.navigate("HomeScreen")}
      >
        <Text style={styles.backText}>Volver</Text>
      </TouchableOpacity>

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
            <Text style={styles.time}>⏱ {getMatchTime(item.fixture)}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
  },
  list: {
    padding: 10,
    backgroundColor: "#000",
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
    color: "#aaa",
    fontSize: 13,
    textAlign: "center",
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 15,
    backgroundColor: "#800000", // vinotinto
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    zIndex: 10,
  },
  backText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
