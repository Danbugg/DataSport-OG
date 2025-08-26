
const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.PGUSER || "postgres",
  host: process.env.PGHOST || "localhost",
  database: process.env.PGDATABASE || "DataSport",
  password: process.env.PGPASSWORD || "admin",
  port: process.env.PGPORT || 5432,
});

pool.connect()
  .then((client) => {
    console.log("✅ Conexión exitosa a PostgreSQL");
    client.release();
  })
  .catch((err) => {
    console.error("❌ Error al conectar con PostgreSQL:", err.message);
  });

module.exports = pool;
