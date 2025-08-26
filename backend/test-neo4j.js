const neo4j = require("neo4j-driver");

async function testConnection() {
  const driver = neo4j.driver(
    "bolt://localhost:7687",
    neo4j.auth.basic("neo4j", "administrador")
  );

  try {
    const session = driver.session();
    const result = await session.run("RETURN 'Conexión exitosa con Neo4j' AS msg");
    console.log(result.records[0].get("msg"));
    await session.close();
  } catch (error) {
    console.error("❌ Error conectando a Neo4j:", error.message);
  } finally {
    await driver.close();
  }
}

testConnection();
