const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const neo4j = require("neo4j-driver");
const bcrypt = require("bcrypt");

const app = express();
const PORT = 3000;

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "DataSport",
  password: "admin",
  port: 5432,
});

const driver = neo4j.driver(
  "bolt://localhost:7687",
  neo4j.auth.basic("neo4j", "administrador")
);

app.use(cors());
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.json({ message: "Servidor funcionando 🚀" });
});

// -----------------------
// Registro y login
// -----------------------
app.post("/register", async (req, res) => {
  try {
    const { nombre, apellido, email, fecha_nacimiento, nombre_usuario, contrasena } = req.body;

    if (!nombre || !apellido || !email || !fecha_nacimiento || !nombre_usuario || !contrasena) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    const hashedPassword = await bcrypt.hash(contrasena, 10);

    const query = `
      INSERT INTO usuarios (nombre, apellido, email, fecha_nacimiento, nombre_usuario, contrasena, rol_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`;
    const values = [nombre, apellido, email, fecha_nacimiento, nombre_usuario, hashedPassword, 1];

    const result = await pool.query(query, values);
    const usuario = result.rows[0];

    // Insertar en Neo4j
    const session = driver.session();
    await session.run(
      "CREATE (u:Usuario {id_usuario: $id_usuario, email: $email, username: $username})",
      { id_usuario: usuario.id_usuario, email: usuario.email, username: usuario.nombre_usuario }
    );
    await session.close();

    res.status(201).json({ message: "Usuario registrado con éxito", usuario });
  } catch (error) {
    console.error("❌ Error en /register:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.post("/login", async (req, res) => {
  const { email, contrasena } = req.body;

  try {
    const result = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Usuario no encontrado" });
    }

    const usuario = result.rows[0];
    const validPassword = await bcrypt.compare(contrasena, usuario.contrasena);

    if (!validPassword) {
      return res.status(400).json({ error: "Credenciales inválidas" });
    }

    res.json({ message: "Login exitoso", usuario });
  } catch (error) {
    console.error("❌ Error en /login:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// -----------------------
// Perfil de usuario
// -----------------------
app.get("/profile/:userId", async (req, res) => {
  const { userId } = req.params;

  if (!userId || isNaN(userId)) {
    return res.status(400).json({ error: "ID de usuario inválido" });
  }

  try {
    const result = await pool.query("SELECT * FROM usuarios WHERE id_usuario = $1", [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const user = {
      ...result.rows[0],
      descripcion: result.rows[0].descripcion || "",
      foto_perfil: result.rows[0].foto_perfil || "",
    };

    res.json({ user });
  } catch (error) {
    console.error("❌ Error en GET /profile/:userId:", error);
    res.status(500).json({ error: "Error del servidor" });
  }
});

app.get("/profile", (req, res) => {
  res.status(400).json({ error: "Debes enviar un ID en /profile/:userId" });
});

app.put("/profile/:userId", async (req, res) => {
  const { userId } = req.params;
  const { descripcion, foto_perfil } = req.body;

  if (!userId || isNaN(userId)) {
    return res.status(400).json({ error: "ID de usuario inválido" });
  }

  try {
    const result = await pool.query(
      `UPDATE usuarios 
       SET descripcion = $1, foto_perfil = $2 
       WHERE id_usuario = $3 
       RETURNING *`,
      [descripcion || "", foto_perfil || "", userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const user = {
      ...result.rows[0],
      descripcion: result.rows[0].descripcion || "",
      foto_perfil: result.rows[0].foto_perfil || "",
    };

    res.json({ message: "Perfil actualizado con éxito", user });
  } catch (error) {
    console.error("❌ Error en PUT /profile/:userId:", error);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// -----------------------
// ENDPOINT DE BÚSQUEDA
// -----------------------

// Para probar solo ligas
app.get("/buscar-test", async (req, res) => {
  const termino = req.query.q || "";
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (l:Liga)
      WHERE toLower(l.nombre) CONTAINS toLower($termino)
      RETURN l
      `,
      { termino }
    );

    const records = result.records.map(r => r.get('l').properties);
    res.json(records);
  } catch (error) {
    console.error("❌ Error en /buscar-test:", error);
    res.status(500).json({ error: "Error en búsqueda de prueba" });
  } finally {
    await session.close();
  }
});

// Búsqueda completa ligas, equipos y jugadores
app.get("/buscar", async (req, res) => {
  const termino = req.query.q || "";
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (l:Liga)
      WHERE toLower(l.nombre) CONTAINS toLower($termino)
      WITH collect(l {.*, elementId: elementId(l)}) AS ligas

      OPTIONAL MATCH (e:Equipo)
      WHERE toLower(e.nombre) CONTAINS toLower($termino)
      WITH ligas, collect(e {.*, elementId: elementId(e)}) AS equipos

      OPTIONAL MATCH (j:Jugador)
      WHERE toLower(j.nombre) CONTAINS toLower($termino)
      RETURN ligas, equipos, collect(j {.*, elementId: elementId(j)}) AS jugadores
      `,
      { termino }
    );

    const records = result.records[0]?.toObject() || { ligas: [], equipos: [], jugadores: [] };
    res.json(records);
  } catch (error) {
    console.error("❌ Error en /buscar:", error);
    res.status(500).json({ error: "Error en la búsqueda" });
  } finally {
    await session.close();
  }
});

// -----------------------
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor corriendo en http://10.0.2.2:${PORT}`);
});  
