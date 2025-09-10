// screens/EstadisticaScreen.js
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
    let interval;

    const fetchMatches = async () => {
      try {
        // 👉 Solo partidos en vivo
        const res = await axios.get(
          `https://apiv3.apifootball.com/?action=get_events&match_live=1&APIkey=49b9840e048e6413f6adcb7ed9547d7b0052f1f4ace2fcd767bdfd6b443cc311`
        );

        console.log("📡 Respuesta AllSportsAPI:", res.data);

        setMatches(res.data || []);
      } catch (error) {
        console.error("❌ Error cargando partidos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
    interval = setInterval(fetchMatches, 30000); // refresca cada 30s

    return () => clearInterval(interval);
  }, []);

  const getMatchTime = (item) => {
    if (item.match_status === "") {
      return `Empieza a las ${item.match_time}`;
    }
    if (item.match_status === "Finished") {
      return "✅ Partido terminado";
    }
    return `⏱ ${item.match_status}'`;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00ffcc" />
        <Text style={styles.loadingText}>Cargando partidos...</Text>
      </View>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>📭 No hay partidos en vivo</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={matches}
      keyExtractor={(item) => item.match_id.toString()}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            navigation.navigate("PartidoScreen", { matchId: item.match_id })
          }
        >
          <Text style={styles.league}>
            {item.league_name} - {item.country_name}
          </Text>
          <View style={styles.row}>
            <Text style={styles.team}>{item.match_hometeam_name}</Text>
            <Text style={styles.score}>
              {item.match_hometeam_score} - {item.match_awayteam_score}
            </Text>
            <Text style={styles.team}>{item.match_awayteam_name}</Text>
          </View>
          <Text style={styles.time}>{getMatchTime(item)}</Text>
        </TouchableOpacity>
      )}
    />
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
});
