// screens/PartidoScreen.js
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Image,
} from "react-native";
import axios from "axios";
import { useRoute } from "@react-navigation/native";

export default function PartidoScreen() {
  const route = useRoute();
  const { matchId } = route.params || {};

  const [fixture, setFixture] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveTime, setLiveTime] = useState(null);

  // 🔹 Función para obtener datos
  const fetchData = useCallback(async () => {
    if (!matchId) return;
    try {
      const fixtureRes = await axios.get(
        `https://v3.football.api-sports.io/fixtures?id=${matchId}`,
        {
          headers: {
            "x-apisports-key": "adfca6c6036e18992bc72e8e9d5025d7",
          },
        }
      );
      const data = fixtureRes.data.response[0];
      setFixture(data);
      startLiveClock(data);

      const statsRes = await axios.get(
        `https://v3.football.api-sports.io/fixtures/statistics?fixture=${matchId}`,
        {
          headers: {
            "x-apisports-key": "adfca6c6036e18992bc72e8e9d5025d7",
          },
        }
      );
      setStats(statsRes.data.response || []);
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  // 🔹 Función para cronómetro en vivo
  const startLiveClock = (fixtureData) => {
    const status = fixtureData?.fixture?.status?.short;

    if (status === "1H" || status === "2H") {
      const elapsedMinutes = fixtureData.fixture.status.elapsed || 0;
      const startTime =
        new Date().getTime() - elapsedMinutes * 60 * 1000;

      if (global.liveClockInterval) {
        clearInterval(global.liveClockInterval);
      }

      global.liveClockInterval = setInterval(() => {
        const diffMs = Date.now() - startTime;
        const minutes = Math.floor(diffMs / 60000);
        const seconds = Math.floor((diffMs % 60000) / 1000);
        setLiveTime(`${minutes}:${seconds < 10 ? "0" + seconds : seconds}`);
      }, 1000);
    } else if (status === "HT") {
      if (global.liveClockInterval) clearInterval(global.liveClockInterval);
      setLiveTime("⏸ Descanso");
    } else {
      if (global.liveClockInterval) clearInterval(global.liveClockInterval);
      setLiveTime(null);
    }
  };

  // 🔹 Ejecutar al inicio y refrescar cada 30s
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => {
      clearInterval(interval);
      if (global.liveClockInterval) clearInterval(global.liveClockInterval);
    };
  }, [fetchData]);

  if (!matchId) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>⚠️ No se recibió el ID del partido</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00ffcc" />
        <Text style={styles.loadingText}>Cargando datos...</Text>
      </View>
    );
  }

  if (!fixture) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>📭 No hay información</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* 🔹 INFO DEL PARTIDO */}
      <View style={styles.card}>
        <View style={styles.teamsRow}>
          <View style={styles.teamBlock}>
            <Image
              source={{ uri: fixture.teams.home.logo }}
              style={styles.teamLogo}
            />
            <Text style={styles.teamName}>{fixture.teams.home.name}</Text>
          </View>

          <View style={styles.scoreBlock}>
            <Text style={styles.score}>
              {fixture.goals.home} - {fixture.goals.away}
            </Text>
            {liveTime && (
              <Text
                style={[
                  styles.liveTime,
                  liveTime.includes("Descanso") && { color: "#ffcc00" },
                ]}
              >
                {liveTime}
              </Text>
            )}
          </View>

          <View style={styles.teamBlock}>
            <Image
              source={{ uri: fixture.teams.away.logo }}
              style={styles.teamLogo}
            />
            <Text style={styles.teamName}>{fixture.teams.away.name}</Text>
          </View>
        </View>

        <Text style={styles.venue}>
          🏟️ {fixture.fixture.venue?.name || "Estadio desconocido"}
        </Text>
      </View>

      {/* 🔹 ESTADÍSTICAS */}
      {stats && stats.length > 0 ? (
        stats.map((teamStats, index) => (
          <View key={index} style={styles.card}>
            <Text style={styles.statsTitle}>{teamStats.team.name}</Text>
            {teamStats.statistics.map((stat, idx) => (
              <View key={idx} style={styles.statRow}>
                <Text style={styles.statType}>{stat.type}</Text>
                <Text style={styles.statValue}>{stat.value ?? "0"}</Text>
              </View>
            ))}
          </View>
        ))
      ) : (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            📭 No hay estadísticas disponibles todavía
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    padding: 16,
  },
  center: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  teamsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  teamBlock: {
    alignItems: "center",
    width: "30%",
  },
  scoreBlock: {
    alignItems: "center",
    width: "40%",
  },
  teamLogo: {
    width: 60,
    height: 60,
    marginBottom: 6,
  },
  teamName: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
  },
  score: {
    color: "#ff4444",
    textAlign: "center",
    fontSize: 26,
    fontWeight: "bold",
  },
  liveTime: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "bold",
    color: "#00ffcc",
  },
  venue: {
    color: "#fff",
    textAlign: "center",
    marginTop: 6,
    fontSize: 14,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#00ffcc",
    textAlign: "center",
    marginBottom: 10,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomColor: "#333",
    borderBottomWidth: 1,
    paddingVertical: 6,
  },
  statType: {
    color: "#fff",
  },
  statValue: {
    color: "#00ffcc",
  },
  errorText: {
    color: "#ff4444",
    fontSize: 16,
  },
  loadingText: {
    color: "#fff",
    marginTop: 10,
  },
  emptyText: {
    color: "#aaa",
    fontSize: 16,
  },
});
