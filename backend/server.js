const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const {Pool} = require("pg");
const neo4j = require("neo4j-driver");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { Resend } = require('resend'); // ✅ IMPORTAR RESEND

const app = express();
const PORT = 3000;

// ✅ INICIALIZAR RESEND CON TU API KEY
const resend = new Resend('re_gFjMsn7f_2a2L1vmj9SQ3UFC4QHN7aaDa');

// --- IP DEL HOST PARA ACCESO REMOTO (IMÁGENES) ---
// ⚠️ IMPORTANTE: Mantener en 10.0.2.2 si usas el EMULADOR de Android.
const HOST_IP = "localhost";
// -------------------------------------------------

// Función auxiliar para parsear ID a entero de manera segura
const safeParseInt = (value) => {
    if (!value) return null;
    const num = parseInt(value, 10);
    return isNaN(num) ? null : num;
};

// 🆕 FUNCIÓN AUXILIAR: Obtener detalles de usuario de PostgreSQL y estado de seguimiento de Neo4j
const fetchUsersDetails = async (userIds, currentUserId) => {
    if (userIds.length === 0) return [];
   
    // Convertir IDs a enteros para la consulta de la base de datos
    const idsString = userIds.map(id => parseInt(id, 10)).join(',');

    try {
        const sqlQuery = `
            SELECT
                id_usuario,
                nombre,
                apellido,
                nombre_usuario,
                foto_perfil,
                descripcion
            FROM usuarios
            WHERE id_usuario IN (${idsString});
        `;
        const result = await pool.query(sqlQuery);

        // 🆕 INICIO: Verificar estado de seguimiento para el usuario actual (currentUserId)
        let followStatus = {};
        if (currentUserId && currentUserId !== 'null' && userIds.length > 0) {
            const session = driver.session();
            try {
                // Consulta Neo4j para verificar si currentUserId sigue a alguno de los userIds (los de la lista)
                const cypher = `
                    MATCH (viewer:Usuario {id_usuario: $viewerId})
                    MATCH (followed:Usuario)
                    WHERE followed.id_usuario IN $followedIds
                    OPTIONAL MATCH (viewer)-[r:SIGUE_A]->(followed)
                    RETURN followed.id_usuario AS id, r IS NOT NULL AS isFollowing
                `;

                const followResult = await session.run(cypher, {
                    viewerId: parseInt(currentUserId),
                    followedIds: userIds.map(id => parseInt(id, 10))
                });

                followResult.records.forEach(record => {
                    const id = record.get('id');
                    followStatus[id] = record.get('isFollowing');
                });
            } catch (neo4jError) {
                console.error("❌ Error al verificar estado de seguimiento en Neo4j:", neo4jError);
            } finally {
                await session.close();
            }
        }
        // 🆕 FIN: Verificar estado de seguimiento

        const users = result.rows.map(user => {
            let fotoUrl = user.foto_perfil;
            if (fotoUrl && !fotoUrl.startsWith('http')) {
                fotoUrl = `http://${HOST_IP}:${PORT}/uploads/${path.basename(fotoUrl)}`;
            }
           
            const userIdNumber = parseInt(user.id_usuario, 10);
           
            return {
                id_usuario: String(user.id_usuario),
                nombre: user.nombre,
                apellido: user.apellido,
                nombre_usuario: user.nombre_usuario,
                foto_perfil: fotoUrl || null,
                descripcion: user.descripcion || '',
                // ✅ Usar el estado real de Neo4j
                isFollowing: !!followStatus[userIdNumber],
            };
        });
       
        return users;

    } catch (error) {
        console.error("❌ Error al obtener detalles de usuarios de PostgreSQL:", error);
        return [];
    }
};

// Configuración de Multer para la carga de archivos
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Usar la ruta absoluta para la carpeta 'uploads'
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });
// ---------------------------------------------

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

// Middleware
app.use(cors());
// Middleware para servir archivos estáticos (imágenes)
app.use('/uploads', express.static(uploadDir));
// Aplicar bodyParser.json SOLO a rutas que NO usen multer (la mayoría de tus rutas)
// Las rutas con multer manejan el body parse por sí mismas
app.use(bodyParser.json());

// ------------------ HOME ------------------
app.get("/", (req, res) => {
    res.json({message: "Servidor funcionando 🚀"});
});

// ------------------ REGISTRO ------------------
app.post("/register", async (req, res) => {
    try {
        const {nombre, apellido, email, fecha_nacimiento, nombre_usuario, contrasena} = req.body;

        if (!nombre || !apellido || !email || !fecha_nacimiento || !nombre_usuario || !contrasena) {
            return res.status(400).json({error: "Faltan datos"});
        }

        // Validar correo duplicado
        const checkEmail = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
        if (checkEmail.rows.length > 0) {
            return res.status(400).json({error: "El correo ya existe"});
        }

        // Validar usuario duplicado
        const checkUser = await pool.query("SELECT * FROM usuarios WHERE nombre_usuario = $1", [nombre_usuario]);
        if (checkUser.rows.length > 0) {
            return res.status(400).json({error: "El nombre de usuario ya existe"});
        }

        const hashedPassword = await bcrypt.hash(contrasena, 10);

        const query = `
            INSERT INTO usuarios (nombre, apellido, email, fecha_nacimiento, nombre_usuario, contrasena, rol_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`;
        const values = [nombre, apellido, email, fecha_nacimiento, nombre_usuario, hashedPassword, 1];

        const result = await pool.query(query, values);
        const usuario = result.rows[0];

        // Guardar en Neo4j
        const session = driver.session();
        await session.run(
            "CREATE (u:Usuario {id_usuario: $id_usuario, email: $email, username: $username})",
            {id_usuario: usuario.id_usuario, email: usuario.email, username: usuario.nombre_usuario}
        );
        await session.close();

        res.status(201).json({message: "Usuario registrado con éxito", usuario});
    } catch (error) {
        console.error("❌ Error en /register:", error);

        if (error.code === "23505") {
            if (error.detail.includes("(email)")) {
                return res.status(400).json({error: "El correo ya existe"});
            }
            if (error.detail.includes("(nombre_usuario)")) {
                return res.status(400).json({error: "El nombre de usuario ya existe"});
            }
        }

        res.status(500).json({error: "Error interno del servidor"});
    }
});

// ------------------ LOGIN ------------------
app.post("/login", async (req, res) => {
    const {email, contrasena} = req.body;

    try {
        const result = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);

        if (result.rows.length === 0) {
            return res.status(400).json({error: "Usuario no encontrado"});
        }

        const usuario = result.rows[0];
        const validPassword = await bcrypt.compare(contrasena, usuario.contrasena);

        if (!validPassword) {
            return res.status(400).json({error: "Credenciales inválidas"});
        }

        res.json({message: "Login exitoso", usuario});
    } catch (error) {
        console.error("❌ Error en /login:", error);
        res.status(500).json({error: "Error en el servidor"});
    }
});

// ------------------ RECUPERAR CONTRASEÑA ------------------
app.post("/forgot-password", async (req, res) => {
    const { email } = req.body;
    
    try {
        const result = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ error: "Correo no encontrado." });
        }

        const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
        const resetExpires = new Date(Date.now() + 3600000);

        await pool.query(
            "UPDATE usuarios SET reset_password_token = $1, reset_password_expires = $2 WHERE id_usuario = $3",
            [resetToken, resetExpires, user.id_usuario]
        );

        console.log(`📧 Intentando enviar email a: ${email}`);
        console.log(`🔑 Token generado: ${resetToken}`);

        try {
            const emailResponse = await resend.emails.send({
                from: 'DataSport <onboarding@resend.dev>',
                to: [email],
                subject: '🔐 Código de recuperación - DataSport',
                html: `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Recuperación de Contraseña</title>
                </head>
                <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 0;">
                        <tr>
                            <td align="center">
                                <!-- Container Principal -->
                                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                                    
                                    <!-- Header con Gradiente -->
                                    <tr>
                                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                                            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold; letter-spacing: 1px;">
                                                ⚽ DataSport
                                            </h1>
                                            <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 14px;">
                                                Tu plataforma deportiva de confianza
                                            </p>
                                        </td>
                                    </tr>
                                    
                                    <!-- Contenido Principal -->
                                    <tr>
                                        <td style="padding: 40px 30px;">
                                            <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px; font-weight: 600;">
                                                Hola, ${user.nombre} 👋
                                            </h2>
                                            
                                            <p style="margin: 0 0 20px 0; color: #555555; font-size: 16px; line-height: 1.6;">
                                                Recibimos una solicitud para restablecer la contraseña de tu cuenta. 
                                                Usa el siguiente código de verificación para continuar:
                                            </p>
                                            
                                            <!-- Token Box -->
                                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                                <tr>
                                                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; padding: 30px; text-align: center;">
                                                        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">
                                                            Tu código de verificación
                                                        </p>
                                                        <h1 style="margin: 0; color: #ffffff; font-size: 48px; font-weight: bold; letter-spacing: 12px; font-family: 'Courier New', monospace;">
                                                            ${resetToken}
                                                        </h1>
                                                    </td>
                                                </tr>
                                            </table>
                                            
                                            <!-- Información Importante -->
                                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff9e6; border-left: 4px solid #ffc107; border-radius: 6px; padding: 15px; margin: 25px 0;">
                                                <tr>
                                                    <td>
                                                        <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
                                                            ⏰ <strong>Importante:</strong> Este código expira en <strong>1 hora</strong>.
                                                        </p>
                                                    </td>
                                                </tr>
                                            </table>
                                            
                                            <p style="margin: 20px 0 0 0; color: #777777; font-size: 14px; line-height: 1.6;">
                                                Si no solicitaste este código, puedes ignorar este correo de forma segura. 
                                                Tu cuenta permanecerá protegida.
                                            </p>
                                        </td>
                                    </tr>
                                    
                                    <!-- Separador -->
                                    <tr>
                                        <td style="padding: 0 30px;">
                                            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 0;">
                                        </td>
                                    </tr>
                                    
                                    <!-- Footer -->
                                    <tr>
                                        <td style="background-color: #f8f9fa; padding: 30px; text-align: center;">
                                            <p style="margin: 0 0 10px 0; color: #999999; font-size: 13px;">
                                                ¿Necesitas ayuda? Contáctanos en 
                                                <a href="mailto:soporte@datasport.com" style="color: #667eea; text-decoration: none;">soporte@datasport.com</a>
                                            </p>
                                            <p style="margin: 0; color: #aaaaaa; font-size: 12px;">
                                                © 2024 DataSport. Todos los derechos reservados.
                                            </p>
                                            <div style="margin-top: 20px;">
                                                <a href="#" style="display: inline-block; margin: 0 10px; color: #999999; text-decoration: none; font-size: 20px;">📱</a>
                                                <a href="#" style="display: inline-block; margin: 0 10px; color: #999999; text-decoration: none; font-size: 20px;">🌐</a>
                                                <a href="#" style="display: inline-block; margin: 0 10px; color: #999999; text-decoration: none; font-size: 20px;">📧</a>
                                            </div>
                                        </td>
                                    </tr>
                                    
                                </table>
                                
                                <!-- Nota de Seguridad -->
                                <table width="600" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
                                    <tr>
                                        <td style="text-align: center; padding: 0 30px;">
                                            <p style="margin: 0; color: #999999; font-size: 11px; line-height: 1.5;">
                                                🔒 Este es un correo automatizado. Por tu seguridad, nunca compartas este código con nadie.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                                
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
                `
            });

            console.log('✅ Email enviado exitosamente!', emailResponse);
            res.status(200).json({ message: "Código enviado a tu correo." });

        } catch (emailError) {
            console.error('❌ Error al enviar email:', emailError);
            await pool.query(
                "UPDATE usuarios SET reset_password_token = NULL, reset_password_expires = NULL WHERE id_usuario = $1",
                [user.id_usuario]
            );
            return res.status(500).json({ error: "No se pudo enviar el correo. Intenta nuevamente." });
        }
    } catch (error) {
        console.error("❌ Error en /forgot-password:", error);
        res.status(500).json({ error: "Error en el servidor." });
    }
    
});

app.post("/verify-token", async (req, res) => {
    const {token} = req.body;
    try {
        const result = await pool.query(
            "SELECT * FROM usuarios WHERE reset_password_token = $1 AND reset_password_expires > NOW()",
            [token]
        );
        const user = result.rows[0];

        if (!user) {
            return res.status(400).json({error: "Token inválido o expirado."});
        }

        res.status(200).json({message: "Token verificado con éxito."});
    } catch (error) {
        console.error("❌ Error en /verify-token:", error);
        res.status(500).json({error: "Error en el servidor."});
    }
});

app.post("/reset-password", async (req, res) => {
    const {token, newPassword} = req.body;
    try {
        const result = await pool.query(
            "SELECT * FROM usuarios WHERE reset_password_token = $1 AND reset_password_expires > NOW()",
            [token]
        );
        const user = result.rows[0];

        if (!user) {
            return res.status(400).json({error: "Token inválido o expirado."});
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query(
            "UPDATE usuarios SET contrasena = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id_usuario = $2",
            [hashedPassword, user.id_usuario]
        );

        res.status(200).json({message: "Contraseña restablecida con éxito."});
    } catch (error) {
        console.error("❌ Error en /reset-password:", error);
        res.status(500).json({error: "Error en el servidor."});
    }
});

// ------------------ PERFIL ------------------
app.get("/profile/:userId", async (req, res) => {
    const {userId} = req.params;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({error: "ID de usuario inválido"});
    }

    // 🆕 INICIO: Obtener estadísticas de seguimiento de Neo4j
    const neo4jSession = driver.session();
    let followersCount = 0;
    let followingCount = 0;
   
    try {
        const neo4jResult = await neo4jSession.run(
            `MATCH (u:Usuario {id_usuario: $userId})
             OPTIONAL MATCH (u)<-[:SIGUE_A]-(follower)
             WITH u, count(DISTINCT follower) as seguidores
             OPTIONAL MATCH (u)-[:SIGUE_A]->(followed)
             RETURN seguidores, count(DISTINCT followed) as siguiendo`,
            { userId: parseInt(userId) }
        );

        const record = neo4jResult.records[0];
        if (record) {
            followersCount = record.get('seguidores').toNumber();
            followingCount = record.get('siguiendo').toNumber();
        }
    } catch (error) {
        console.error("❌ Error al obtener follow stats de Neo4j en /profile:", error);
        // Continuamos con 0 si falla Neo4j para no romper el perfil
    } finally {
        await neo4jSession.close();
    }
    // 🆕 FIN: Obtener estadísticas de seguimiento

    try {
        const result = await pool.query("SELECT * FROM usuarios WHERE id_usuario = $1", [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({error: "Usuario no encontrado"});
        }
       
        // Generar la URL completa de la imagen si existe
        let fotoUrl = result.rows[0].foto_perfil;
        if (fotoUrl && !fotoUrl.startsWith('http')) {
             // Asume que si no es una URL completa, es el nombre del archivo en 'uploads'
             fotoUrl = `http://${HOST_IP}:${PORT}/uploads/${path.basename(fotoUrl)}`;
        }

        const user = {
            ...result.rows[0],
            descripcion: result.rows[0].descripcion || "",
            foto_perfil: fotoUrl || "", // Usar la URL completa
            // 💡 Ocultar campos sensibles
            contrasena: undefined,
            reset_password_token: undefined,
            reset_password_expires: undefined,
        };

        // 🆕 Devolver las métricas de seguimiento junto con el perfil
        res.json({
            user,
            followersCount,
            followingCount,
        });
    } catch (error) {
        console.error("❌ Error en GET /profile/:userId:", error);
        res.status(500).json({error: "Error del servidor"});
    }
});

app.put("/profile/:userId", upload.single('profileImage'), async (req, res) => {
    const { userId } = req.params;
   
    // Multer procesa el campo de texto 'descripcion'
    const descripcion = req.body.descripcion || "";
   
    // Si no se subió un nuevo archivo (req.file), buscamos la URL existente en req.body.foto_perfil
    const existingPhotoUrl = req.body.foto_perfil;
   
    let finalPhotoUrl = existingPhotoUrl;
   
    if (!userId || isNaN(userId)) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({error: "ID de usuario inválido"});
    }

    // 1. Manejar la carga de la nueva imagen
    if (req.file) {
        // Si hay un archivo (imagen nueva), construimos la URL completa para guardar
        const fileName = req.file.filename;
        finalPhotoUrl = `http://${HOST_IP}:${PORT}/uploads/${fileName}`;
        console.log(`✅ Nueva foto de perfil subida: ${finalPhotoUrl}`);
    }

    // 2. Ejecutar la actualización en PostgreSQL
    try {
        const result = await pool.query(
            `UPDATE usuarios
             SET descripcion = $1, foto_perfil = $2
             WHERE id_usuario = $3
             RETURNING *`,
            [descripcion, finalPhotoUrl || "", userId] // Guardamos la URL pública o la que se envió
        );

        if (result.rows.length === 0) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({error: "Usuario no encontrado"});
        }

        // 3. Devolver la respuesta con la URL corregida para el frontend
        const updatedUser = {
            ...result.rows[0],
            foto_perfil: finalPhotoUrl || "",
            // Ocultar campos sensibles
            contrasena: undefined,
            reset_password_token: undefined,
            reset_password_expires: undefined,
        };

        res.json({message: "Perfil actualizado con éxito", user: updatedUser});
    } catch (error) {
        if (req.file) fs.unlinkSync(req.file.path);
        console.error("❌ Error en PUT /profile/:userId:", error);
        res.status(500).json({error: "Error del servidor al actualizar el perfil."});
    }
});

// ------------------ PUBLICACIONES ------------------

// POST: Crear una publicación con soporte para carga de archivos
app.post("/posts/create", upload.single('postImage'), async (req, res) => {
    // AHORA req.body DEBERÍA TENER LOS DATOS DE TEXTO
    // 💡 CORRECCIÓN: Usar safeParseInt para limpiar el userId
    const userId = safeParseInt(req.body.userId);
    const { content } = req.body;
   
    // 1. VALIDACIÓN
    if (!userId || !content) {
        // Si hay un error, intentamos eliminar la imagen temporal si se subió
        if (req.file) fs.unlinkSync(req.file.path);
       
        // 💡 MEJORA: Mensaje de error más detallado
        let errorMsg = "Faltan datos requeridos: ";
        if (!userId) {
            // userId será null si safeParseInt falló (valor no numérico o vacío)
            errorMsg += `[Usuario ID inválido o faltante. Valor recibido: ${req.body.userId}]`;
        }
        if (!content) {
            // Esto solo es true si el contenido es null o undefined (no si es un string vacío, ya que el cliente lo valida)
            errorMsg += "[Contenido faltante. Valor recibido: " + req.body.content + "]";
        }
       
        return res.status(400).json({ error: errorMsg });
    }

    // 2. OBTENER URL DE LA IMAGEN
    const fileName = req.file ? req.file.filename : null;

    let imageUrl = null;
    if (fileName) {
        // Guardamos la URL completa para el frontend
        imageUrl = `http://${HOST_IP}:${PORT}/uploads/${fileName}`;
        console.log(`✅ URL de imagen generada: ${imageUrl}`);
    }

    // 3. Intentar la inserción en PostgreSQL
    try {
        const sqlQuery = `
            INSERT INTO posts (user_id, content, image_url)
            VALUES ($1, $2, $3)
            RETURNING id, created_at;
        `;
       
        const result = await pool.query(sqlQuery, [userId, content, imageUrl]);

        // 4. Respuesta exitosa
        res.status(201).json({
            message: "Publicación creada con éxito.",
            post: {
                id: result.rows[0].id,
                createdAt: result.rows[0].created_at,
                imageUrl: imageUrl
            }
        });

    } catch (error) {
        // Si hay un error de DB, intentamos eliminar la imagen temporal
        if (req.file) fs.unlinkSync(req.file.path);
       
        console.error('❌ Error al insertar la publicación en la BD:', error);
       
        if (error.code === '23503') {
            return res.status(400).json({ error: "El ID de usuario no existe." });
        }
        res.status(500).json({ error: "Ocurrió un error interno al crear la publicación." });
    }
});

// --- PUBLICACIONES (LECTURA) ---

// Función auxiliar para obtener contadores de likes y comentarios
const getPostMetrics = async (postId, currentUserId) => {
    // 💡 CORRECCIÓN: Usar safeParseInt para limpiar el userId
    const numericUserId = safeParseInt(currentUserId);
   
    try {
        // 1. Contar Likes
        const likesResult = await pool.query(
            'SELECT COUNT(*)::INTEGER FROM likes WHERE post_id = $1',
            [postId]
        );
        const likeCount = likesResult.rows[0].count;

        // 2. Contar Comentarios
        const commentResult = await pool.query(
            'SELECT COUNT(*)::INTEGER FROM comentarios WHERE post_id = $1',
            [postId]
        );
        const commentCount = commentResult.rows[0].count;

        // 3. Verificar si el usuario actual ya dio like
        let isLikedByCurrentUser = false;
        if (numericUserId) {
            const likedResult = await pool.query(
                'SELECT 1 FROM likes WHERE post_id = $1 AND user_id = $2',
                [postId, numericUserId] // Usamos el ID ya convertido y limpio
            );
            isLikedByCurrentUser = likedResult.rows.length > 0;
        }

        return { likeCount, commentCount, isLikedByCurrentUser };
    } catch (error) {
        console.error('Error fetching post metrics:', error);
        // Devolver 0 y false en caso de error para no detener el feed
        return { likeCount: 0, commentCount: 0, isLikedByCurrentUser: false };
    }
};

// GET: Obtener TODAS las publicaciones para el Home Feed (FEED PRINCIPAL)
app.get("/posts", async (req, res) => {
    // 💡 CORRECCIÓN: El userId se pasa para obtener las métricas de like del usuario
    const currentUserId = req.query.userId;

    try {
        // Consulta base para obtener posts con la información del autor
        const sqlQuery = `
            SELECT
                p.id,
                p.content,
                p.image_url AS "imageUrl",
                p.created_at AS "createdAt",
                u.id_usuario AS "authorId",
                u.nombre_usuario AS "authorUsername",
                u.foto_perfil AS "authorProfilePic"
            FROM posts p
            JOIN usuarios u ON p.user_id = u.id_usuario
            ORDER BY p.created_at DESC;
        `;
       
        const result = await pool.query(sqlQuery);
       
        // CORRECCIÓN: Mapear para completar URLs de imágenes
        const postsWithMetrics = await Promise.all(result.rows.map(async (post) => {
            const metrics = await getPostMetrics(post.id, currentUserId);
           
            // Reconstruir la URL de la imagen del Post
            let postImageUrl = post.imageUrl;
            if (postImageUrl && !postImageUrl.startsWith('http')) {
                // Si solo tenemos el nombre del archivo, lo corregimos
                postImageUrl = `http://${HOST_IP}:${PORT}/uploads/${path.basename(postImageUrl)}`;
            }

            // Reconstruir la URL de la Foto de Perfil del Autor
            let authorProfilePicUrl = post.authorProfilePic;
            if (authorProfilePicUrl && !authorProfilePicUrl.startsWith('http')) {
                authorProfilePicUrl = `http://${HOST_IP}:${PORT}/uploads/${path.basename(authorProfilePicUrl)}`;
            }

            return {
                ...post,
                ...metrics,
                imageUrl: postImageUrl, // Usar la URL corregida
                authorProfilePic: authorProfilePicUrl // Usar la URL corregida
            };
        }));

        res.status(200).json({ posts: postsWithMetrics });

    } catch (error) {
        console.error("❌ Error al obtener posts del feed:", error);
        res.status(500).json({ error: "Error interno del servidor al cargar publicaciones." });
    }
});

// GET: Obtener publicaciones de un usuario específico para el Perfil
app.get("/profile/:userId/posts", async (req, res) => {
    const { userId } = req.params;
    const currentUserId = req.query.currentUserId;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: "ID de usuario inválido." });
    }

    try {
        const sqlQuery = `
            SELECT
                p.id,
                p.content,
                p.image_url AS "imageUrl",
                p.created_at AS "createdAt",
                u.id_usuario AS "authorId",
                u.nombre_usuario AS "authorUsername",
                u.foto_perfil AS "authorProfilePic"
            FROM posts p
            JOIN usuarios u ON p.user_id = u.id_usuario
            WHERE p.user_id = $1
            ORDER BY p.created_at DESC;
        `;

        const result = await pool.query(sqlQuery, [userId]);
       
        // CORRECCIÓN: Mapear para completar URLs de imágenes
        const postsWithMetrics = await Promise.all(result.rows.map(async (post) => {
            const metrics = await getPostMetrics(post.id, currentUserId);
           
            // Reconstruir la URL de la imagen del Post
            let postImageUrl = post.imageUrl;
            if (postImageUrl && !postImageUrl.startsWith('http')) {
                postImageUrl = `http://${HOST_IP}:${PORT}/uploads/${path.basename(postImageUrl)}`;
            }

            // Reconstruir la URL de la Foto de Perfil del Autor
            let authorProfilePicUrl = post.authorProfilePic;
            if (authorProfilePicUrl && !authorProfilePicUrl.startsWith('http')) {
                authorProfilePicUrl = `http://${HOST_IP}:${PORT}/uploads/${path.basename(authorProfilePicUrl)}`;
            }

            return {
                ...post,
                ...metrics,
                imageUrl: postImageUrl, // Usar la URL corregida
                authorProfilePic: authorProfilePicUrl // Usar la URL corregida
            };
        }));

        res.status(200).json({ posts: postsWithMetrics });

    } catch (error) {
        console.error(`❌ Error al obtener posts del usuario ${userId}:`, error);
        res.status(500).json({ error: "Error interno del servidor al cargar publicaciones del perfil." });
    }
});

// ------------------ LIKES Y COMENTARIOS (NUEVAS RUTAS) ------------------

// 1. POST: Dar "Me Gusta"
app.post("/posts/:postId/like", async (req, res) => {
    const { postId } = req.params;
   
    // 💡 CORRECCIÓN: Usar safeParseInt para limpiar el userId
    const userId = safeParseInt(req.body.userId);

    if (!userId) {
        return res.status(400).json({ error: "User ID inválido o faltante." });
    }

    try {
        const sqlQuery = `
            INSERT INTO likes (post_id, user_id, created_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (post_id, user_id) DO NOTHING
            RETURNING id;
        `;
       
        const result = await pool.query(sqlQuery, [postId, userId]);

        if (result.rowCount === 0) {
            return res.status(200).json({ message: "Like ya existía o ya fue registrado." });
        }

        res.status(201).json({ message: "Like registrado con éxito." });

    } catch (error) {
        console.error('❌ Error al registrar like:', error);
        res.status(500).json({ error: "Error interno del servidor al registrar like." });
    }
});

// 2. DELETE: Quitar "Me Gusta"
app.delete("/posts/:postId/like", async (req, res) => {
    const { postId } = req.params;
   
    // 💡 CORRECCIÓN: Usar safeParseInt para limpiar el userId
    const userId = safeParseInt(req.body.userId);

    if (!userId) {
        return res.status(400).json({ error: "User ID inválido o faltante." });
    }

    try {
        const sqlQuery = `
            DELETE FROM likes
            WHERE post_id = $1 AND user_id = $2;
        `;
       
        const result = await pool.query(sqlQuery, [postId, userId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Like no encontrado para eliminar." });
        }

        res.status(200).json({ message: "Like eliminado con éxito." });

    } catch (error) {
        console.error('❌ Error al eliminar like:', error);
        res.status(500).json({ error: "Error interno del servidor al eliminar like." });
    }
});

// 3. GET: Obtener Comentarios del Post
app.get("/posts/:postId/comments", async (req, res) => {
    const { postId } = req.params;
   
    try {
        const sqlQuery = `
            SELECT
                c.id AS id,
                c.content AS content,
                c.created_at AS "createdAt",
                u.nombre_usuario AS "authorUsername",
                u.foto_perfil AS "authorProfilePic"
            FROM
                comentarios c
            JOIN
                usuarios u ON c.user_id = u.id_usuario
            WHERE
                c.post_id = $1  
            ORDER BY
                c.created_at DESC;
        `;
       
        const result = await pool.query(sqlQuery, [postId]);

        // Mapear los resultados para corregir la URL de la foto de perfil del autor
        const comments = result.rows.map(comment => {
            let authorProfilePicUrl = comment.authorProfilePic;
            if (authorProfilePicUrl && !authorProfilePicUrl.startsWith('http')) {
                authorProfilePicUrl = `http://${HOST_IP}:${PORT}/uploads/${path.basename(authorProfilePicUrl)}`;
            }
            return {
                ...comment,
                authorProfilePic: authorProfilePicUrl
            };
        });

        res.status(200).json({ comments });

    } catch (error) {
        console.error('❌ Error al obtener comentarios:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener comentarios.' });
    }
});

// 4. POST: Crear un nuevo Comentario
app.post("/posts/:postId/comments", async (req, res) => {
    const { postId } = req.params;
   
    // 💡 CORRECCIÓN: Usar safeParseInt para limpiar el userId
    const userId = safeParseInt(req.body.userId);
    const { content } = req.body;

    if (!userId || !content) {
        return res.status(400).json({ error: "User ID y contenido son requeridos." });
    }
   
    try {
        const insertQuery = `
            INSERT INTO comentarios (post_id, user_id, content, created_at)
            VALUES ($1, $2, $3, NOW())
            RETURNING id;
        `;
       
        // 1. Insertar el comentario
        const insertResult = await pool.query(insertQuery, [postId, userId, content]);
        const newCommentId = insertResult.rows[0].id;

        // 2. Obtener la información completa del comentario para devolverla al frontend
        const fetchQuery = `
            SELECT
                c.id,
                c.content,
                c.created_at AS "createdAt",
                u.nombre_usuario AS "authorUsername",
                u.foto_perfil AS "authorProfilePic"
            FROM comentarios c
            JOIN usuarios u ON c.user_id = u.id_usuario
            WHERE c.id = $1
        `;
       
        const fetchResult = await pool.query(fetchQuery, [newCommentId]);
       
        // 3. Corregir la URL de la foto de perfil antes de devolver el comentario
        let newComment = fetchResult.rows[0];
        let authorProfilePicUrl = newComment.authorProfilePic;
        if (authorProfilePicUrl && !authorProfilePicUrl.startsWith('http')) {
            newComment.authorProfilePic = `http://${HOST_IP}:${PORT}/uploads/${path.basename(authorProfilePicUrl)}`;
        }

        // Devolver el nuevo comentario insertado (tal como espera CommentsScreen.js)
        res.status(201).json({
            message: "Comentario publicado con éxito.",
            newComment: newComment
        });

    } catch (error) {
        console.error('❌ Error al crear comentario:', error);
        res.status(500).json({ error: 'Error interno del servidor al publicar comentario.' });
    }
});

// ------------------ ELIMINAR PUBLICACIÓN ------------------
app.delete("/posts/:postId", async (req, res) => {
    const { postId } = req.params;
    const userId = safeParseInt(req.body.userId);

    if (!postId || isNaN(postId)) {
        return res.status(400).json({ error: "ID de publicación inválido." });
    }

    if (!userId) {
        return res.status(400).json({ error: "Usuario no autorizado." });
    }

    try {
        // 1. Verificar que el post existe y pertenece al usuario
        const checkQuery = `
            SELECT user_id, image_url 
            FROM posts 
            WHERE id = $1
        `;
        const checkResult = await pool.query(checkQuery, [postId]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: "Publicación no encontrada." });
        }

        const post = checkResult.rows[0];

        // 2. Verificar que el usuario es el dueño del post
        if (parseInt(post.user_id) !== userId) {
            return res.status(403).json({ error: "No tienes permiso para eliminar esta publicación." });
        }

        // 3. Eliminar la imagen del servidor si existe
        if (post.image_url) {
            const imagePath = path.join(uploadDir, path.basename(post.image_url));
            if (fs.existsSync(imagePath)) {
                try {
                    fs.unlinkSync(imagePath);
                    console.log(`✅ Imagen eliminada: ${imagePath}`);
                } catch (err) {
                    console.error("⚠️ Error al eliminar imagen:", err);
                }
            }
        }

        // 4. Eliminar el post de la base de datos
        // Gracias a ON DELETE CASCADE, los likes y comentarios se eliminan automáticamente
        const deleteQuery = `
            DELETE FROM posts 
            WHERE id = $1
        `;
        await pool.query(deleteQuery, [postId]);

        console.log(`✅ Publicación ${postId} eliminada por usuario ${userId}`);
        res.status(200).json({ message: "Publicación eliminada con éxito." });

    } catch (error) {
        console.error("❌ Error al eliminar publicación:", error);
        res.status(500).json({ error: "Error interno del servidor al eliminar la publicación." });
    }
});

// ------------------ ELIMINAR CUENTA ------------------
app.delete("/delete-account/:userId", async (req, res) => {
    const {userId} = req.params;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({error: "ID de usuario inválido"});
    }

    try {
        // Eliminar en Neo4j (Grafos)
        const neo4jSession = driver.session();
        await neo4jSession.run("MATCH (u:Usuario {id_usuario: $userId}) DETACH DELETE u", {
            userId: parseInt(userId),
        });
        await neo4jSession.close();

        // Eliminar en PostgreSQL. Gracias a ON DELETE CASCADE,
        // las publicaciones, likes y comentarios del usuario se eliminan automáticamente.
        const result = await pool.query("DELETE FROM usuarios WHERE id_usuario = $1 RETURNING *", [userId]);

        if (result.rowCount === 0) {
            return res.status(404).json({error: "Usuario no encontrado"});
        }

        res.status(200).json({message: "Usuario eliminado con éxito"});
    } catch (error) {
        console.error("❌ Error en DELETE /delete-account:", error);
        res.status(500).json({error: "Error en el servidor al intentar eliminar al usuario"});
    }
});

// ------------------ BÚSQUEDA NEO4J + POSTGRESQL ------------------
app.get("/buscar", async (req, res) => {
    const termino = req.query.q || "";
    if (termino.length < 1) {
        // Devuelve un array vacío si no hay término de búsqueda
        return res.json({ ligas: [], equipos: [], jugadores: [], usuarios: [] });
    }
   
    // Convertir el término a minúsculas para comparaciones
    const terminoBusqueda = termino.toLowerCase();

    // 1. BÚSQUEDA EN NEO4J (Ligas, Equipos, Jugadores)
    const neo4jSession = driver.session();
    let neo4jResults = { ligas: [], equipos: [], jugadores: [] };

    try {
        const result = await neo4jSession.run(
            `
            MATCH (l:Liga)
            WHERE toLower(l.nombre) CONTAINS toLower($termino)
            WITH collect(l {.*, elementId: toString(elementId(l)), id_liga: ID(l)}) AS ligas

            OPTIONAL MATCH (e:Equipo)
            WHERE toLower(e.nombre) CONTAINS toLower($termino)
            WITH ligas, collect(e {.*, elementId: toString(elementId(e)), id_equipo: ID(e)}) AS equipos

            OPTIONAL MATCH (j:Jugador)
            WHERE toLower(j.nombre) CONTAINS toLower($termino)
            WITH ligas, equipos, collect(j {.*, elementId: toString(elementId(j)), id_jugador: ID(j)}) AS jugadores

            OPTIONAL MATCH (u:Usuario)
            WHERE toLower(u.username) CONTAINS toLower($termino)
            RETURN ligas, equipos, jugadores
            `,
            { termino: terminoBusqueda }
        );

        const records = result.records[0]?.toObject() || {};
        neo4jResults = {
            ligas: records.ligas || [],
            equipos: records.equipos || [],
            jugadores: records.jugadores || [],
        };
       
    } catch (error) {
        console.error("❌ Error en búsqueda Neo4j:", error);
    } finally {
        await neo4jSession.close();
    }

    // 2. BÚSQUEDA EN POSTGRESQL (Usuarios)
    let postgresUsers = [];
    try {
        // Busca coincidencias en: nombre, apellido, nombre_usuario o email
        const userQuery = `
            SELECT
                id_usuario,
                nombre,
                apellido,
                nombre_usuario,
                foto_perfil,
                -- Agregamos un 'elementId' temporal para que coincida con el frontend de React Native
                id_usuario AS "elementId"
            FROM usuarios
            WHERE
                LOWER(nombre) LIKE $1 OR
                LOWER(apellido) LIKE $1 OR
                LOWER(nombre_usuario) LIKE $1 OR
                LOWER(email) LIKE $1
            LIMIT 10;
        `;
       
        const searchPattern = `%${terminoBusqueda}%`;
        const result = await pool.query(userQuery, [searchPattern]);

        // Mapear los resultados de Postgres
        postgresUsers = result.rows.map(user => {
            let fotoUrl = user.foto_perfil;
            if (fotoUrl && !fotoUrl.startsWith('http')) {
                // Reconstruimos la URL de la imagen
                fotoUrl = `http://${HOST_IP}:${PORT}/uploads/${path.basename(fotoUrl)}`;
            }

            return {
                id_usuario: user.id_usuario,
                nombre: user.nombre,
                apellido: user.apellido,
                nombre_usuario: user.nombre_usuario,
                foto_perfil: fotoUrl || null,
                // Convertir la ID de usuario a string para keyExtractor (Como lo hacemos en Neo4j)
                elementId: user.elementId.toString()
            };
        });

    } catch (error) {
        console.error("❌ Error en búsqueda PostgreSQL (usuarios):", error);
    }

    // 3. COMBINAR Y ENVIAR
    // Enviamos todos los resultados combinados en el formato que el frontend espera
    res.json({
        ligas: neo4jResults.ligas,
        equipos: neo4jResults.equipos,
        jugadores: neo4jResults.jugadores,
        usuarios: postgresUsers,
    });
});

// ------------------ OBTENER LISTAS DE SEGUIMIENTO (SEGUIDORES/SEGUIDOS) ------------------

// GET: Obtener la lista de seguidores de un usuario (Followers)
app.get("/users/:userId/followers", async (req, res) => {
    const { userId } = req.params;
    const currentUserId = req.query.currentUserId;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: "ID de usuario inválido." });
    }

    const session = driver.session();
    try {
        // 1. Obtener IDs de usuarios que siguen al :userId (relación entrante)
        const cypher = `
            MATCH (follower:Usuario)-[:SIGUE_A]->(u:Usuario {id_usuario: $userId})
            RETURN collect(follower.id_usuario) AS followerIds
        `;
       
        const result = await session.run(cypher, { userId: parseInt(userId) });
       
        const followerIds = result.records[0]?.get('followerIds') || [];
       
        // 2. Obtener detalles de perfil de PostgreSQL y el estado de seguimiento
        // ✅ Pasamos currentUserId para que fetchUsersDetails verifique si currentUserId sigue a followerIds
        const followersDetails = await fetchUsersDetails(followerIds, currentUserId);

        res.status(200).json({ followers: followersDetails });

    } catch (error) {
        console.error("❌ Error al obtener lista de seguidores:", error);
        res.status(500).json({ error: "Error en el servidor al cargar la lista de seguidores." });
    } finally {
        await session.close();
    }
});

// GET: Obtener la lista de seguidos de un usuario (Following)
app.get("/users/:userId/following", async (req, res) => {
    const { userId } = req.params;
    const currentUserId = req.query.currentUserId;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: "ID de usuario inválido." });
    }

    const session = driver.session();
    try {
        // 1. Obtener IDs de usuarios que el :userId sigue (relación saliente)
        const cypher = `
            MATCH (u:Usuario {id_usuario: $userId})-[:SIGUE_A]->(followed:Usuario)
            RETURN collect(followed.id_usuario) AS followedIds
        `;
       
        const result = await session.run(cypher, { userId: parseInt(userId) });
       
        const followedIds = result.records[0]?.get('followedIds') || [];
       
        // 2. Obtener detalles de perfil de PostgreSQL y el estado de seguimiento
        // ✅ Pasamos currentUserId para que fetchUsersDetails verifique si currentUserId sigue a followedIds
        const followingDetails = await fetchUsersDetails(followedIds, currentUserId);

        res.status(200).json({ following: followingDetails });

    } catch (error) {
        console.error("❌ Error al obtener lista de seguidos:", error);
        res.status(500).json({ error: "Error en el servidor al cargar la lista de seguidos." });
    } finally {
        await session.close();
    }
});

// ------------------ SEGUIMIENTO DE USUARIOS (NEO4J) ------------------

// POST: Seguir a un usuario
app.post("/follow/:followedId", async (req, res) => {
    const { followedId } = req.params;
    const followerId = safeParseInt(req.body.followerId);

    console.log(`[FOLLOW] Intento de seguir: Follower ${followerId} -> Followed ${followedId}`);

    if (!followerId || !followedId) {
        return res.status(400).json({ error: "IDs de usuario inválidos." });
    }

    const session = driver.session();
   
    try {
        // Crear la relación SIGUE_A en Neo4j
        await session.run(
            `MATCH (follower:Usuario {id_usuario: $followerId})
             MATCH (followed:Usuario {id_usuario: $followedId})
             MERGE (follower)-[:SIGUE_A]->(followed)
             RETURN follower, followed`,
            {
                followerId: parseInt(followerId),
                followedId: parseInt(followedId)
            }
        );
       
        console.log(`✅ Usuario ${followerId} ahora sigue a ${followedId}`);
        res.status(200).json({ message: "Usuario seguido exitosamente" });
       
    } catch (error) {
        console.error("❌ Error al seguir usuario en Neo4j:", error);
        res.status(500).json({ error: "Error al seguir usuario" });
    } finally {
        await session.close();
    }
});

// DELETE: Dejar de seguir a un usuario
app.delete("/unfollow/:followedId", async (req, res) => {
    const { followedId } = req.params;
    const followerId = safeParseInt(req.body.followerId);

    console.log(`[UNFOLLOW] Intento de dejar de seguir: Follower ${followerId} -> Followed ${followedId}`);

    if (!followerId || !followedId) {
        return res.status(400).json({ error: "IDs de usuario inválidos." });
    }

    const session = driver.session();
   
    try {
        // Eliminar la relación SIGUE_A
        const result = await session.run(
            `MATCH (follower:Usuario {id_usuario: $followerId})-[r:SIGUE_A]->(followed:Usuario {id_usuario: $followedId})
             DELETE r
             RETURN count(r) as deleted`,
            {
                followerId: parseInt(followerId),
                followedId: parseInt(followedId)
            }
        );
       
        const deletedCount = result.records[0]?.get('deleted').toNumber() || 0;
       
        if (deletedCount === 0) {
            return res.status(404).json({ error: "No se encontró la relación de seguimiento." });
        }
       
        console.log(`✅ Usuario ${followerId} dejó de seguir a ${followedId}`);
        res.status(200).json({ message: "Dejaste de seguir al usuario" });
       
    } catch (error) {
        console.error("❌ Error al dejar de seguir en Neo4j:", error);
        res.status(500).json({ error: "Error al dejar de seguir" });
    } finally {
        await session.close();
    }
});

// GET: Verificar si un usuario sigue a otro
app.get("/isFollowing/:followedId", async (req, res) => {
    const { followedId } = req.params;
    const followerId = safeParseInt(req.query.followerId);

    if (!followerId || !followedId) {
        return res.status(400).json({ error: "IDs de usuario inválidos." });
    }

    const session = driver.session();
   
    try {
        const result = await session.run(
            `MATCH (follower:Usuario {id_usuario: $followerId})
             OPTIONAL MATCH (follower)-[r:SIGUE_A]->(followed:Usuario {id_usuario: $followedId})
             RETURN r IS NOT NULL AS isFollowing`,
            {
                followerId: parseInt(followerId),
                followedId: parseInt(followedId)
            }
        );
       
        const isFollowing = result.records[0]?.get('isFollowing') || false;
       
        console.log(`[CHECK FOLLOW] Usuario ${followerId} ${isFollowing ? 'SÍ' : 'NO'} sigue a ${followedId}`);
        res.status(200).json({ isFollowing });
       
    } catch (error) {
        console.error("❌ Error al verificar seguimiento en Neo4j:", error);
        res.status(500).json({ error: "Error al verificar seguimiento" });
    } finally {
        await session.close();
    }
});

// GET: Obtener estadísticas de seguimiento (seguidores y seguidos)
app.get("/profile/:userId/followStats", async (req, res) => {
    const { userId } = req.params;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: "ID de usuario inválido" });
    }

    const session = driver.session();
   
    try {
        const result = await session.run(
            `MATCH (u:Usuario {id_usuario: $userId})
             OPTIONAL MATCH (u)<-[:SIGUE_A]-(follower)
             WITH u, count(DISTINCT follower) as seguidores
             OPTIONAL MATCH (u)-[:SIGUE_A]->(followed)
             RETURN seguidores, count(DISTINCT followed) as siguiendo`,
            { userId: parseInt(userId) }
        );
       
        const record = result.records[0];
        const stats = {
            seguidores: record?.get('seguidores').toNumber() || 0,
            siguiendo: record?.get('siguiendo').toNumber() || 0
        };
       
        res.status(200).json(stats);
       
    } catch (error) {
        console.error("❌ Error al obtener estadísticas de seguimiento:", error);
        res.status(500).json({ error: "Error al obtener estadísticas" });
    } finally {
        await session.close();
    }
});

// ------------------ ENDPOINTS DE DETALLE (Neo4j) ------------------

// 1. OBTENER DETALLE DE LIGA Y SUS EQUIPOS (Neo4j)
app.get("/liga/:ligaId", async (req, res) => {
    const {ligaId} = req.params;
    const session = driver.session();
   
    try {
        // Consultar la liga y sus equipos relacionados
        const cypher = `
            MATCH (l:Liga)
            WHERE ID(l) = toInteger($id)
            // Relación: (Equipo)-[:PERTENECE_A]->(Liga)
            OPTIONAL MATCH (e:Equipo)-[:PERTENECE_A]->(l)
            RETURN l, collect(e {.*, id_equipo: ID(e)}) AS equipos
        `;
       
        const result = await session.run(cypher, {id: ligaId});

        if (result.records.length === 0) {
            return res.status(404).json({error: "Liga no encontrada."});
        }

        const record = result.records[0];
        const ligaNode = record.get('l').properties;
        const equipos = record.get('equipos');

        const liga = {
            ...ligaNode,
            id_liga: record.get('l').identity.low, // Usamos ID nativo de Neo4j
            equipos: equipos.map(e => e.properties || e),
        };

        res.json(liga);
    } catch (error) {
        console.error("❌ Error en /liga/:ligaId (Neo4j):", error);
        res.status(500).json({error: "Error interno del servidor al consultar Neo4j"});
    } finally {
        await session.close();
    }
});

// 2. OBTENER DETALLE DE EQUIPO Y SUS JUGADORES (Neo4j)
app.get("/equipo/:equipoId", async (req, res) => {
    const {equipoId} = req.params;
    const session = driver.session();
   
    try {
        // Consultar el equipo y sus jugadores relacionados
        const cypher = `
            MATCH (e:Equipo)
            WHERE ID(e) = toInteger($id)
            // Relación: (Jugador)-[:PERTENECE_A]->(Equipo)
            OPTIONAL MATCH (j:Jugador)-[:PERTENECE_A]->(e)
            RETURN e, collect(j {.*, id_jugador: ID(j)}) AS jugadores
        `;
       
        const result = await session.run(cypher, {id: equipoId});

        if (result.records.length === 0) {
            return res.status(404).json({error: "Equipo no encontrado."});
        }

        const record = result.records[0];
        const equipoNode = record.get('e').properties;
        const jugadores = record.get('jugadores');

        const equipo = {
            ...equipoNode,
            id_equipo: record.get('e').identity.low,
            jugadores: jugadores.map(j => j.properties || j),
        };

        res.json(equipo);
    } catch (error) {
        console.error("❌ Error en /equipo/:equipoId (Neo4j):", error);
        res.status(500).json({error: "Error interno del servidor al consultar Neo4j"});
    } finally {
        await session.close();
    }
});

// 3. OBTENER DETALLE DE JUGADOR (Neo4j)
app.get("/jugador/:jugadorId", async (req, res) => {
    const {jugadorId} = req.params;
    const session = driver.session();

    try {
        // Consultar solo el nodo del jugador
        const cypher = `
            MATCH (j:Jugador)
            WHERE ID(j) = toInteger($id)
            RETURN j
        `;
       
        const result = await session.run(cypher, {id: jugadorId});

        if (result.records.length === 0) {
            return res.status(404).json({error: "Jugador no encontrado."});
        }

        const jugadorNode = result.records[0].get('j').properties;
        const jugador = {
            ...jugadorNode,
            id_jugador: result.records[0].get('j').identity.low,
        };

        res.json(jugador);
    } catch (error) {
        console.error("❌ Error en /jugador/:jugadorId (Neo4j):", error);
        res.status(500).json({error: "Error interno del servidor al consultar Neo4j"});
    } finally {
        await session.close();
    }
});

// ============================================
// 📍 ENDPOINTS DE ADMINISTRACIÓN
// ============================================
// AGREGAR ESTA SECCIÓN COMPLETA DESPUÉS DEL ENDPOINT /jugador/:jugadorId
// (línea 1089 aproximadamente) Y ANTES DE app.listen (línea 1091)

// Función auxiliar: Verificar si un usuario es admin
const isAdmin = async (userId) => {
    try {
        const result = await pool.query(
            'SELECT rol_id FROM usuarios WHERE id_usuario = $1',
            [userId]
        );
        return result.rows.length > 0 && result.rows[0].rol_id === 2;
    } catch (error) {
        console.error("❌ Error al verificar rol de admin:", error);
        return false;
    }
};

// 1️⃣ GET: Obtener todas las publicaciones reportadas
app.get('/admin/reported-posts', async (req, res) => {
    try {
        // Primero verificamos si la tabla 'reportes' existe
        const query = `
            SELECT 
                p.id,
                p.content,
                p.image_url as "imageUrl",
                p.created_at as "createdAt",
                p.user_id as "authorId",
                u.nombre_usuario as "authorUsername",
                u.foto_perfil as "authorProfilePic",
                COUNT(DISTINCT r.id_reporte) as "reportCount"
            FROM posts p
            INNER JOIN reportes r ON p.id = r.post_id
            INNER JOIN usuarios u ON p.user_id = u.id_usuario
            WHERE r.estado = 'pendiente'
            GROUP BY p.id, p.content, p.image_url, p.created_at, p.user_id,
                     u.nombre_usuario, u.foto_perfil
            ORDER BY COUNT(r.id_reporte) DESC, p.created_at DESC
        `;
        
        const result = await pool.query(query);
        
        // Corregir URLs de imágenes
        const posts = result.rows.map(post => {
            let imageUrl = post.imageUrl;
            if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = `http://${HOST_IP}:${PORT}/uploads/${path.basename(imageUrl)}`;
            }
            
            let authorProfilePic = post.authorProfilePic;
            if (authorProfilePic && !authorProfilePic.startsWith('http')) {
                authorProfilePic = `http://${HOST_IP}:${PORT}/uploads/${path.basename(authorProfilePic)}`;
            }
            
            return {
                ...post,
                imageUrl,
                authorProfilePic,
                reportCount: parseInt(post.reportCount)
            };
        });
        
        res.json({ posts });
    } catch (error) {
        console.error('❌ Error al obtener posts reportados:', error);
        
        // Si el error es porque la tabla 'reportes' no existe
        if (error.code === '42P01') {
            return res.status(503).json({ 
                error: 'La tabla de reportes no está configurada. Ejecuta las migraciones SQL necesarias.',
                posts: []
            });
        }
        
        res.status(500).json({ error: 'Error al cargar publicaciones reportadas' });
    }
});


// 3️⃣ POST: Descartar reporte// 2️⃣ DELETE: Eliminar publicación (por admin) - CON NOTIFICACIÓN
app.delete('/admin/posts/:postId', async (req, res) => {
    const { postId } = req.params;
    const adminId = safeParseInt(req.body.adminId);
    const { reason } = req.body; // ✅ NUEVA LÍNEA

    if (!adminId) {
        return res.status(400).json({ error: 'ID de administrador inválido' });
    }

    // ✅ VALIDAR RAZÓN
    if (!reason || reason.trim().length === 0) {
        return res.status(400).json({ error: 'Debes proporcionar una razón para eliminar la publicación' });
    }

    try {
        // Verificar si es admin
        if (!await isAdmin(adminId)) {
            return res.status(403).json({ error: 'No tienes permisos de administrador' });
        }

        // Obtener información del post Y su autor antes de eliminarlo
        const postQuery = 'SELECT user_id, image_url, content FROM posts WHERE id = $1';
        const postResult = await pool.query(postQuery, [postId]);
        
        if (postResult.rows.length === 0) {
            return res.status(404).json({ error: 'Publicación no encontrada' });
        }

        const post = postResult.rows[0];
        const postAuthorId = post.user_id;

        // ✅ CREAR NOTIFICACIÓN PARA EL AUTOR
        const notificationMessage = `Tu publicación fue eliminada por un administrador. Razón: ${reason}`;
        
        await pool.query(
            `INSERT INTO notificaciones (user_id, type, message, post_id, is_read, created_at)
             VALUES ($1, 'post_deleted', $2, $3, FALSE, NOW())`,
            [postAuthorId, notificationMessage, postId]
        );

        // Actualizar reportes relacionados
        try {
            await pool.query(
                "UPDATE reportes SET estado = 'resuelto', reason = $1 WHERE post_id = $2",
                [reason, postId]
            );
        } catch (err) {
            console.log('⚠️ No se pudieron actualizar reportes');
        }

        // Eliminar la imagen del servidor si existe
        if (post.image_url) {
            const imagePath = path.join(uploadDir, path.basename(post.image_url));
            if (fs.existsSync(imagePath)) {
                try {
                    fs.unlinkSync(imagePath);
                    console.log(`✅ Imagen eliminada: ${imagePath}`);
                } catch (err) {
                    console.error("⚠️ Error al eliminar imagen:", err);
                }
            }
        }

        // Eliminar likes
        await pool.query('DELETE FROM likes WHERE post_id = $1', [postId]);
        
        // Eliminar comentarios
        await pool.query('DELETE FROM comentarios WHERE post_id = $1', [postId]);
        
        // Eliminar publicación
        await pool.query('DELETE FROM posts WHERE id = $1', [postId]);

        console.log(`✅ Admin ${adminId} eliminó publicación ${postId}. Usuario ${postAuthorId} notificado.`);
        res.json({ message: 'Publicación eliminada y usuario notificado exitosamente' });
    } catch (error) {
        console.error('❌ Error al eliminar publicación:', error);
        res.status(500).json({ error: 'Error al eliminar la publicación' });
    }
});

app.post('/admin/reports/:postId/dismiss', async (req, res) => {
    const { postId } = req.params;
    const adminId = safeParseInt(req.body.adminId);

    if (!adminId) {
        return res.status(400).json({ error: 'ID de administrador inválido' });
    }

    try {
        // Verificar si es admin
        if (!await isAdmin(adminId)) {
            return res.status(403).json({ error: 'No tienes permisos de administrador' });
        }

        // Actualizar estado de reportes a 'descartado'
        const result = await pool.query(
            "UPDATE reportes SET estado = 'descartado' WHERE post_id = $1 AND estado = 'pendiente'",
            [postId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'No se encontraron reportes pendientes para esta publicación' });
        }

        console.log(`✅ Admin ${adminId} descartó reportes del post ${postId}`);
        res.json({ message: 'Reporte descartado exitosamente' });
    } catch (error) {
        console.error('❌ Error al descartar reporte:', error);
        
        if (error.code === '42P01') {
            return res.status(503).json({ 
                error: 'La tabla de reportes no está configurada.' 
            });
        }
        
        res.status(500).json({ error: 'Error al descartar el reporte' });
    }
});

// 4️⃣ GET: Obtener todos los usuarios
app.get('/admin/users', async (req, res) => {
    try {
        const query = `
            SELECT 
                id_usuario,
                nombre,
                apellido,
                nombre_usuario,
                email,
                foto_perfil,
                rol_id,
                COALESCE(estado, 'active') as estado,
                fecha_registro
            FROM usuarios
            ORDER BY 
                CASE WHEN rol_id = 2 THEN 0 ELSE 1 END,
                fecha_registro DESC
        `;
        
        const result = await pool.query(query);
        
        // Corregir URLs de fotos de perfil
        const users = result.rows.map(user => {
            let fotoUrl = user.foto_perfil;
            if (fotoUrl && !fotoUrl.startsWith('http')) {
                fotoUrl = `http://${HOST_IP}:${PORT}/uploads/${path.basename(fotoUrl)}`;
            }
            
            return {
                ...user,
                foto_perfil: fotoUrl
            };
        });
        
        res.json({ users });
    } catch (error) {
        console.error('❌ Error al obtener usuarios:', error);
        res.status(500).json({ error: 'Error al cargar usuarios' });
    }
});

// 5️⃣ POST: Suspender/Activar usuario
app.post('/admin/users/:userId/toggle-status', async (req, res) => {
    const { userId } = req.params;
    const adminId = safeParseInt(req.body.adminId);

    if (!adminId) {
        return res.status(400).json({ error: 'ID de administrador inválido' });
    }

    try {
        // Verificar si es admin
        if (!await isAdmin(adminId)) {
            return res.status(403).json({ error: 'No tienes permisos de administrador' });
        }

        // Verificar que no intente suspenderse a sí mismo
        if (parseInt(userId) === adminId) {
            return res.status(400).json({ error: 'No puedes cambiar tu propio estado' });
        }

        // Verificar que el usuario a suspender no sea admin
        if (await isAdmin(userId)) {
            return res.status(400).json({ error: 'No puedes cambiar el estado de otro administrador' });
        }

        // Obtener estado actual (si no existe la columna, usar 'active' por defecto)
        const currentStatus = await pool.query(
            "SELECT COALESCE(estado, 'active') as estado FROM usuarios WHERE id_usuario = $1",
            [userId]
        );

        if (currentStatus.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const newStatus = currentStatus.rows[0].estado === 'suspended' ? 'active' : 'suspended';

        // Actualizar estado
        // Si la columna 'estado' no existe, esto fallará y deberás ejecutar la migración SQL
        const updateResult = await pool.query(
            'UPDATE usuarios SET estado = $1 WHERE id_usuario = $2',
            [newStatus, userId]
        );

        console.log(`✅ Admin ${adminId} cambió estado de usuario ${userId} a ${newStatus}`);
        res.json({ 
            message: `Usuario ${newStatus === 'suspended' ? 'suspendido' : 'activado'} exitosamente`,
            newStatus 
        });
    } catch (error) {
        console.error('❌ Error al cambiar estado de usuario:', error);
        
        // Si el error es porque la columna 'estado' no existe
        if (error.code === '42703') {
            return res.status(503).json({ 
                error: 'La columna estado no existe. Ejecuta: ALTER TABLE usuarios ADD COLUMN estado VARCHAR(20) DEFAULT \'active\';' 
            });
        }
        
        res.status(500).json({ error: 'Error al cambiar el estado del usuario' });
    }
});

// 6️⃣ GET: Obtener estadísticas generales
app.get('/admin/stats', async (req, res) => {
    try {
        // Total de usuarios
        const totalUsersResult = await pool.query('SELECT COUNT(*) as count FROM usuarios');
        const totalUsers = parseInt(totalUsersResult.rows[0].count);

        // Total de publicaciones
        const totalPostsResult = await pool.query('SELECT COUNT(*) as count FROM posts');
        const totalPosts = parseInt(totalPostsResult.rows[0].count);

        // Total de reportes pendientes (con manejo de error si la tabla no existe)
        let totalReports = 0;
        try {
            const totalReportsResult = await pool.query(
                "SELECT COUNT(DISTINCT post_id) as count FROM reportes WHERE estado = 'pendiente'"
            );
            totalReports = parseInt(totalReportsResult.rows[0].count);
        } catch (err) {
            console.log('⚠️ No se pudo obtener conteo de reportes (tabla puede no existir)');
        }

        // Usuarios activos (con al menos una publicación en los últimos 30 días)
        const activeUsersResult = await pool.query(`
            SELECT COUNT(DISTINCT user_id) as count 
            FROM posts 
            WHERE created_at >= NOW() - INTERVAL '30 days'
        `);
        const activeUsers = parseInt(activeUsersResult.rows[0].count);

        res.json({
            totalUsers,
            totalPosts,
            totalReports,
            activeUsers,
        });
    } catch (error) {
        console.error('❌ Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error al cargar estadísticas' });
    }
});

// 7️⃣ POST: Reportar una publicación (endpoint para usuarios normales)
app.post('/posts/:postId/report', async (req, res) => {
    const { postId } = req.params;
    const reporterId = safeParseInt(req.body.reporterId);

    if (!reporterId) {
        return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    try {
        // Verificar que la publicación existe
        const postCheck = await pool.query('SELECT id FROM posts WHERE id = $1', [postId]);
        if (postCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Publicación no encontrada' });
        }

        // Verificar que el usuario no haya reportado ya esta publicación
        const existingReport = await pool.query(
            'SELECT id_reporte FROM reportes WHERE post_id = $1 AND reporter_id = $2',
            [postId, reporterId]
        );

        if (existingReport.rows.length > 0) {
            return res.status(400).json({ error: 'Ya has reportado esta publicación' });
        }

        // Insertar el reporte
        await pool.query(
            `INSERT INTO reportes (post_id, reporter_id, estado, created_at) 
             VALUES ($1, $2, 'pendiente', NOW())`,
            [postId, reporterId]
        );

        console.log(`✅ Usuario ${reporterId} reportó publicación ${postId}`);
        res.status(201).json({ message: 'Reporte enviado exitosamente' });
    } catch (error) {
        console.error('❌ Error al reportar publicación:', error);
        
        if (error.code === '42P01') {
            return res.status(503).json({ 
                error: 'El sistema de reportes no está configurado. Contacta al administrador.' 
            });
        }
        
        res.status(500).json({ error: 'Error al enviar el reporte' });
    }
});

// ============================================
// 📬 ENDPOINTS DE NOTIFICACIONES
// ============================================

// 1️⃣ GET: Obtener notificaciones de un usuario
app.get('/notifications/:userId', async (req, res) => {
    const { userId } = req.params;
    
    try {
        const notifications = await pool.query(
            `SELECT 
                id,
                user_id as "userId",
                type,
                message,
                post_id as "postId",
                is_read as "isRead",
                created_at as "createdAt"
            FROM notificaciones
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 50`,
            [userId]
        );

        const unreadCount = await pool.query(
            'SELECT COUNT(*) as count FROM notificaciones WHERE user_id = $1 AND is_read = FALSE',
            [userId]
        );

        res.json({
            notifications: notifications.rows,
            unreadCount: parseInt(unreadCount.rows[0].count)
        });
    } catch (error) {
        console.error('❌ Error al obtener notificaciones:', error);
        res.status(500).json({ error: 'Error al obtener notificaciones' });
    }
});

// 2️⃣ PUT: Marcar una notificación como leída
app.put('/notifications/:notificationId/read', async (req, res) => {
    const { notificationId } = req.params;
    const userId = safeParseInt(req.body.userId);

    if (!userId) {
        return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    try {
        await pool.query(
            'UPDATE notificaciones SET is_read = TRUE WHERE id = $1 AND user_id = $2',
            [notificationId, userId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error al marcar notificación como leída:', error);
        res.status(500).json({ error: 'Error al actualizar notificación' });
    }
});

// 3️⃣ PUT: Marcar todas las notificaciones como leídas
app.put('/notifications/:userId/read-all', async (req, res) => {
    const { userId } = req.params;

    try {
        await pool.query(
            'UPDATE notificaciones SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
            [userId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error al marcar todas como leídas:', error);
        res.status(500).json({ error: 'Error al actualizar notificaciones' });
    }
});

// FIN DE ENDPOINTS DE NOTIFICACIONES

// ------------------ INICIO SERVIDOR ------------------
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Servidor corriendo en http://10.0.2.2:${PORT}`);
});