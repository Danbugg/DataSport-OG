const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const neo4j = require("neo4j-driver");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

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

// ----------------------------------------------------
// RUTAS DE RECUPERACIÓN DE CONTRASEÑA 🔑
// ----------------------------------------------------

// 1. Ruta para solicitar el token
app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ message: 'Correo no encontrado.' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hora
    await pool.query('UPDATE usuarios SET reset_password_token = $1, reset_password_expires = $2 WHERE id_usuario = $3', [resetToken, resetExpires, user.id_usuario]);
    
    // Para probar, enviamos el token en la respuesta.
    res.status(200).json({ message: 'Token de recuperación generado.', token: resetToken });
  } catch (error) {
    console.error('❌ Error en /forgot-password:', error);
    res.status(500).json({ error: 'Error en el servidor.' });
  }
});

// 2. Ruta para verificar el token
app.post('/verify-token', async (req, res) => {
  const { token } = req.body;
  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE reset_password_token = $1 AND reset_password_expires > NOW()', [token]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ message: 'Token inválido o expirado.' });
    }
    
    res.status(200).json({ message: 'Token verificado con éxito.' });
  } catch (error) {
    console.error('❌ Error en /verify-token:', error);
    res.status(500).json({ error: 'Error en el servidor.' });
  }
});

// 3. Ruta para restablecer la contraseña
app.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE reset_password_token = $1 AND reset_password_expires > NOW()', [token]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ message: 'Token inválido o expirado.' });
    }
    
    // Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await pool.query('UPDATE usuarios SET contrasena = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id_usuario = $2', [hashedPassword, user.id_usuario]);

    res.status(200).json({ message: 'Contraseña restablecida con éxito.' });
  } catch (error) {
    console.error('❌ Error en /reset-password:', error);
    res.status(500).json({ error: 'Error en el servidor.' });
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
// RUTA PARA ELIMINAR CUENTA 🗑️
// -----------------------
app.delete("/delete-account/:userId", async (req, res) => {
  const { userId } = req.params;

  if (!userId || isNaN(userId)) {
    return res.status(400).json({ error: "ID de usuario inválido" });
  }

  let neo4jSession;
  try {
    // 1. Eliminar de Neo4j
    neo4jSession = driver.session();
    await neo4jSession.run("MATCH (u:Usuario {id_usuario: $userId}) DETACH DELETE u", { userId: parseInt(userId) });
    await neo4jSession.close();

    // 2. Eliminar de PostgreSQL
    const result = await pool.query("DELETE FROM usuarios WHERE id_usuario = $1 RETURNING *", [userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.status(200).json({ message: "Usuario eliminado con éxito" });
  } catch (error) {
    console.error("❌ Error en DELETE /delete-account:", error);
    res.status(500).json({ error: "Error en el servidor al intentar eliminar el usuario" });
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