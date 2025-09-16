import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import axios from "axios";

export default function PartidoScreen({ route, navigation }) {
  const { matchId } = route.params;
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatch = async () => {
      try {
        const res = await axios.get(
          `https://v3.football.api-sports.io/fixtures?id=${matchId}`,
          {
            headers: {
              "x-apisports-key": "",
            },
          }
        );
        setMatch(res.data.response[0] || null);
      } catch (error) {
        console.error("Error cargando el partido:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatch();
  }, [matchId]);

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
      return status.long; // Finished
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00ffcc" />
        <Text style={styles.loadingText}>Cargando partido...</Text>

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

  if (!match) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>❌ No se encontró el partido</Text>

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

      <ScrollView style={styles.container}>
        <Text style={styles.league}>
          {match.league.name} - {match.league.country}
        </Text>

        <View style={styles.row}>
          <Text style={styles.team}>{match.teams.home.name}</Text>
          <Text style={styles.score}>
            {match.goals.home ?? 0} - {match.goals.away ?? 0}
          </Text>
          <Text style={styles.team}>{match.teams.away.name}</Text>
        </View>

        <Text style={styles.time}>⏱ {getMatchTime(match.fixture)}</Text>

        {/* Aquí puedes agregar más estadísticas */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    padding: 15,
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
  },
  league: {
    color: "#0ff",
    fontSize: 16,
    marginBottom: 10,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  team: {
    color: "#fff",
    fontSize: 18,
    flex: 1,
    textAlign: "center",
  },
  score: {
    color: "#0ff",
    fontSize: 20,
    fontWeight: "bold",
    marginHorizontal: 8,
  },
  time: {
    color: "#aaa",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 15,
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
