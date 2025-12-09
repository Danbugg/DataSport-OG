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
const { Resend } = require('resend');
const app = express();
const PORT = 3000;

// 🛠️ CONFIGURACIÓN INICIAL

// Inicializar Resend
const resend = new Resend('re_gFjMsn7f_2a2L1vmj9SQ3UFC4QHN7aaDa');

const HOST_IP = "localhost";

// Parseo seguro de Integer
const safeParseInt = (value) => {
    if (!value) return null;
    const num = parseInt(value, 10);
    return isNaN(num) ? null : num;
};

// Obtener detalles de usuarios con estado de seguimiento
const fetchUsersDetails = async (userIds, currentUserId) => {
    if (userIds.length === 0) return [];
   
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

        //  Verificar estado de seguimiento (Neo4j)
        let followStatus = {};
        if (currentUserId && currentUserId !== 'null' && userIds.length > 0) {
            const session = driver.session();
            try {
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
                console.error("Error al verificar estado de seguimiento en Neo4j:", neo4jError);
            } finally {
                await session.close();
            }
        }

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
                isFollowing: !!followStatus[userIdNumber],
            };
        });
       
        return users;

    } catch (error) {
        console.error("Error al obtener detalles de usuarios de PostgreSQL:", error);
        return [];
    }
};

// Configuración de la carga de archivos (uploads)
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); 
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Conexión PostgreSQL
const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "DataSport",
    password: "admin",
    port: 5432,
});

// Conexión Neo4j (driver)
const driver = neo4j.driver(
    "bolt://localhost:7687",
    neo4j.auth.basic("neo4j", "administrador")
);

// Middleware
app.use(cors());
app.use('/uploads', express.static(uploadDir));
app.use(bodyParser.json());

// 🏠 ENDPOINT BASE

app.get("/", (req, res) => {
    res.json({message: "Servidor funcionando "});
});

// 🔐 AUTENTICACIÓN

// POST: Registro de Usuario
app.post("/register", async (req, res) => {
    try {
        const {nombre, apellido, email, fecha_nacimiento, nombre_usuario, contrasena} = req.body;

        if (!nombre || !apellido || !email || !fecha_nacimiento || !nombre_usuario || !contrasena) {
            return res.status(400).json({error: "Faltan datos"});
        }

        const checkEmail = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
        if (checkEmail.rows.length > 0) {
            return res.status(400).json({error: "El correo ya existe"});
        }

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

        // Guardar nodo en Neo4j
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

// POST: Inicio de Sesión
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
        console.error("Error en /login:", error);
        res.status(500).json({error: "Error en el servidor"});
    }
});

// POST: Solicitar Recuperación de Contraseña (Envío de Email con Resend)
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

        console.log(`Intentando enviar email a: ${email}`);
        console.log(`Token generado: ${resetToken}`);

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
                                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                                    
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
                                    
                                    <tr>
                                        <td style="padding: 40px 30px;">
                                            <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px; font-weight: 600;">
                                                Hola, ${user.nombre} 👋
                                            </h2>
                                            
                                            <p style="margin: 0 0 20px 0; color: #555555; font-size: 16px; line-height: 1.6;">
                                                Recibimos una solicitud para restablecer la contraseña de tu cuenta. 
                                                Usa el siguiente código de verificación para continuar:
                                            </p>
                                            
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
                                    
                                    <tr>
                                        <td style="padding: 0 30px;">
                                            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 0;">
                                        </td>
                                    </tr>
                                    
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
            console.error('Error al enviar email:', emailError);
            await pool.query(
                "UPDATE usuarios SET reset_password_token = NULL, reset_password_expires = NULL WHERE id_usuario = $1",
                [user.id_usuario]
            );
            return res.status(500).json({ error: "No se pudo enviar el correo. Intenta nuevamente." });
        }
    } catch (error) {
        console.error("Error en /forgot-password:", error);
        res.status(500).json({ error: "Error en el servidor." });
    }
    
});

// POST: Verificar Token de Recuperación
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
        console.error("Error en /verify-token:", error);
        res.status(500).json({error: "Error en el servidor."});
    }
});

// POST: Restablecer Contraseña
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
        console.error("Error en /reset-password:", error);
        res.status(500).json({error: "Error en el servidor."});
    }
});

// DELETE: Eliminar Cuenta
app.delete("/delete-account/:userId", async (req, res) => {
    const {userId} = req.params;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({error: "ID de usuario inválido"});
    }

    try {
        // Eliminar nodo y relaciones en Neo4j
        const neo4jSession = driver.session();
        await neo4jSession.run("MATCH (u:Usuario {id_usuario: $userId}) DETACH DELETE u", {
            userId: parseInt(userId),
        });
        await neo4jSession.close();

        // Eliminar en PostgreSQL
        const result = await pool.query("DELETE FROM usuarios WHERE id_usuario = $1 RETURNING *", [userId]);

        if (result.rowCount === 0) {
            return res.status(404).json({error: "Usuario no encontrado"});
        }

        res.status(200).json({message: "Usuario eliminado con éxito"});
    } catch (error) {
        console.error("Error en DELETE /delete-account:", error);
        res.status(500).json({error: "Error en el servidor al intentar eliminar al usuario"});
    }
});

// 👤 PERFIL DE USUARIO

// GET: Obtener Detalles de Perfil y Estadísticas de Seguimiento
app.get("/profile/:userId", async (req, res) => {
    const {userId} = req.params;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({error: "ID de usuario inválido"});
    }

    // Obtener contadores de seguimiento de Neo4j
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
        console.error("Error al obtener follow stats de Neo4j en /profile:", error);
    } finally {
        await neo4jSession.close();
    }

    try {
        const result = await pool.query("SELECT * FROM usuarios WHERE id_usuario = $1", [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({error: "Usuario no encontrado"});
        }
       
        // Corregir URL de la imagen de perfil
        let fotoUrl = result.rows[0].foto_perfil;
        if (fotoUrl && !fotoUrl.startsWith('http')) {
             fotoUrl = `http://${HOST_IP}:${PORT}/uploads/${path.basename(fotoUrl)}`;
        }

        const user = {
            ...result.rows[0],
            descripcion: result.rows[0].descripcion || "",
            foto_perfil: fotoUrl || "",
            // Ocultar campos sensibles
            contrasena: undefined,
            reset_password_token: undefined,
            reset_password_expires: undefined,
        };

        // Devolver métricas de seguimiento y perfil
        res.json({
            user,
            followersCount,
            followingCount,
        });
    } catch (error) {
        console.error("Error en GET /profile/:userId:", error);
        res.status(500).json({error: "Error del servidor"});
    }
});

// PUT: Actualizar Perfil y Foto
app.put("/profile/:userId", upload.single('profileImage'), async (req, res) => {
    const { userId } = req.params;
   
    const descripcion = req.body.descripcion || "";
    const existingPhotoUrl = req.body.foto_perfil;
   
    let finalPhotoUrl = existingPhotoUrl;
   
    if (!userId || isNaN(userId)) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({error: "ID de usuario inválido"});
    }

    // Manejo de la imagen nueva
    if (req.file) {
        const fileName = req.file.filename;
        finalPhotoUrl = `http://${HOST_IP}:${PORT}/uploads/${fileName}`;
        console.log(`Nueva foto de perfil subida: ${finalPhotoUrl}`);
    }

    try {
        const result = await pool.query(
            `UPDATE usuarios
             SET descripcion = $1, foto_perfil = $2
             WHERE id_usuario = $3
             RETURNING *`,
            [descripcion, finalPhotoUrl || "", userId]
        );

        if (result.rows.length === 0) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({error: "Usuario no encontrado"});
        }

        // Devolver la respuesta con la URL corregida
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
        console.error("Error en PUT /profile/:userId:", error);
        res.status(500).json({error: "Error del servidor al actualizar el perfil."});
    }
});

// 📣 PUBLICACIONES 



// Obtener contadores de Likes y Comentarios
const getPostMetrics = async (postId, currentUserId) => {
    const numericUserId = safeParseInt(currentUserId);
   
    try {
        // Contar Likes
        const likesResult = await pool.query(
            'SELECT COUNT(*)::INTEGER FROM likes WHERE post_id = $1',
            [postId]
        );
        const likeCount = likesResult.rows[0].count;

        // Contar Comentarios
        const commentResult = await pool.query(
            'SELECT COUNT(*)::INTEGER FROM comentarios WHERE post_id = $1',
            [postId]
        );
        const commentCount = commentResult.rows[0].count;

        // Verificar si el usuario actual ya dio like
        let isLikedByCurrentUser = false;
        if (numericUserId) {
            const likedResult = await pool.query(
                'SELECT 1 FROM likes WHERE post_id = $1 AND user_id = $2',
                [postId, numericUserId]
            );
            isLikedByCurrentUser = likedResult.rows.length > 0;
        }

        return { likeCount, commentCount, isLikedByCurrentUser };
    } catch (error) {
        console.error('Error fetching post metrics:', error);
        return { likeCount: 0, commentCount: 0, isLikedByCurrentUser: false };
    }
};

// POST: Crear una Publicación 
app.post("/posts/create", upload.single('postImage'), async (req, res) => {
    const userId = safeParseInt(req.body.userId);
    const { content } = req.body;
   
    if (!userId || !content) {
        if (req.file) fs.unlinkSync(req.file.path);
        let errorMsg = "Faltan datos requeridos: ";
        if (!userId) {
            errorMsg += `[Usuario ID inválido o faltante. Valor recibido: ${req.body.userId}]`;
        }
        if (!content) {
            errorMsg += "[Contenido faltante. Valor recibido: " + req.body.content + "]";
        }
       
        return res.status(400).json({ error: errorMsg });
    }

    const fileName = req.file ? req.file.filename : null;

    let imageUrl = null;
    if (fileName) {
        imageUrl = `http://${HOST_IP}:${PORT}/uploads/${fileName}`;
        console.log(`✅ URL de imagen generada: ${imageUrl}`);
    }

    try {
        const sqlQuery = `
            INSERT INTO posts (user_id, content, image_url)
            VALUES ($1, $2, $3)
            RETURNING id, created_at;
        `;
       
        const result = await pool.query(sqlQuery, [userId, content, imageUrl]);

        res.status(201).json({
            message: "Publicación creada con éxito.",
            post: {
                id: result.rows[0].id,
                createdAt: result.rows[0].created_at,
                imageUrl: imageUrl
            }
        });

    } catch (error) {
        if (req.file) fs.unlinkSync(req.file.path);
       
        console.error('Error al insertar la publicación en la BD:', error);
       
        if (error.code === '23503') {
            return res.status(400).json({ error: "El ID de usuario no existe." });
        }
        res.status(500).json({ error: "Ocurrió un error interno al crear la publicación." });
    }
});

// GET: Obtener Feed Principal (incluye compartidos)
app.get("/posts", async (req, res) => {
    const currentUserId = req.query.userId;

    try {
        const sqlQuery = `
            SELECT
                p.id,
                p.content,
                p.image_url AS "imageUrl",
                p.created_at AS "createdAt",
                p.user_id AS "authorId",
                p.shared_post_id AS "sharedPostId",
                COALESCE(p.share_count, 0) AS "shareCount",
                u.nombre_usuario AS "authorUsername",
                u.foto_perfil AS "authorProfilePic",
                op.content AS "originalContent",
                op.image_url AS "originalImageUrl",
                op.created_at AS "originalCreatedAt",
                op.user_id AS "originalAuthorId",
                ou.nombre_usuario AS "originalAuthorUsername",
                ou.foto_perfil AS "originalAuthorProfilePic"
            FROM posts p
            JOIN usuarios u ON p.user_id = u.id_usuario
            LEFT JOIN posts op ON p.shared_post_id = op.id
            LEFT JOIN usuarios ou ON op.user_id = ou.id_usuario
            ORDER BY p.created_at DESC;
        `;
       
        const result = await pool.query(sqlQuery);
       
        const postsWithMetrics = await Promise.all(result.rows.map(async (post) => {
            const metrics = await getPostMetrics(post.id, currentUserId);
           
            // Reconstruir URLs de imágenes
            let postImageUrl = post.imageUrl;
            if (postImageUrl && !postImageUrl.startsWith('http')) {
                postImageUrl = `http://${HOST_IP}:${PORT}/uploads/${path.basename(postImageUrl)}`;
            }

            let authorProfilePicUrl = post.authorProfilePic;
            if (authorProfilePicUrl && !authorProfilePicUrl.startsWith('http')) {
                authorProfilePicUrl = `http://${HOST_IP}:${PORT}/uploads/${path.basename(authorProfilePicUrl)}`;
            }

            let originalImageUrl = post.originalImageUrl;
            if (originalImageUrl && !originalImageUrl.startsWith('http')) {
                originalImageUrl = `http://${HOST_IP}:${PORT}/uploads/${path.basename(originalImageUrl)}`;
            }

            let originalAuthorProfilePic = post.originalAuthorProfilePic;
            if (originalAuthorProfilePic && !originalAuthorProfilePic.startsWith('http')) {
                originalAuthorProfilePic = `http://${HOST_IP}:${PORT}/uploads/${path.basename(originalAuthorProfilePic)}`;
            }

            return {
                ...post,
                ...metrics,
                imageUrl: postImageUrl,
                authorProfilePic: authorProfilePicUrl,
                originalImageUrl,
                originalAuthorProfilePic
            };
        }));

        res.status(200).json({ posts: postsWithMetrics });

    } catch (error) {
        console.error("Error al obtener posts del feed:", error);
        res.status(500).json({ error: "Error interno del servidor al cargar publicaciones." });
    }
});

// GET: Obtener Publicaciones de un Usuario (Perfil)
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
                p.user_id AS "authorId",
                p.shared_post_id AS "sharedPostId",
                COALESCE(p.share_count, 0) AS "shareCount",
                u.nombre_usuario AS "authorUsername",
                u.foto_perfil AS "authorProfilePic",
                op.content AS "originalContent",
                op.image_url AS "originalImageUrl",
                op.created_at AS "originalCreatedAt",
                op.user_id AS "originalAuthorId",
                ou.nombre_usuario AS "originalAuthorUsername",
                ou.foto_perfil AS "originalAuthorProfilePic"
            FROM posts p
            JOIN usuarios u ON p.user_id = u.id_usuario
            LEFT JOIN posts op ON p.shared_post_id = op.id
            LEFT JOIN usuarios ou ON op.user_id = ou.id_usuario
            WHERE p.user_id = $1
            ORDER BY p.created_at DESC;
        `;

        const result = await pool.query(sqlQuery, [userId]);
       
        const postsWithMetrics = await Promise.all(result.rows.map(async (post) => {
            const metrics = await getPostMetrics(post.id, currentUserId);
           
            // Reconstruir URLs de imágenes y perfil
            let postImageUrl = post.imageUrl;
            if (postImageUrl && !postImageUrl.startsWith('http')) {
                postImageUrl = `http://${HOST_IP}:${PORT}/uploads/${path.basename(postImageUrl)}`;
            }

            let authorProfilePicUrl = post.authorProfilePic;
            if (authorProfilePicUrl && !authorProfilePicUrl.startsWith('http')) {
                authorProfilePicUrl = `http://${HOST_IP}:${PORT}/uploads/${path.basename(authorProfilePicUrl)}`;
            }

            let originalImageUrl = post.originalImageUrl;
            if (originalImageUrl && !originalImageUrl.startsWith('http')) {
                originalImageUrl = `http://${HOST_IP}:${PORT}/uploads/${path.basename(originalImageUrl)}`;
            }

            let originalAuthorProfilePic = post.originalAuthorProfilePic;
            if (originalAuthorProfilePic && !originalAuthorProfilePic.startsWith('http')) {
                originalAuthorProfilePic = `http://${HOST_IP}:${PORT}/uploads/${path.basename(originalAuthorProfilePic)}`;
            }

            return {
                ...post,
                ...metrics,
                imageUrl: postImageUrl,
                authorProfilePic: authorProfilePicUrl,
                originalImageUrl,
                originalAuthorProfilePic
            };
        }));

        res.status(200).json({ posts: postsWithMetrics });

    } catch (error) {
        console.error(`Error al obtener posts del usuario ${userId}:`, error);
        res.status(500).json({ error: "Error interno del servidor al cargar publicaciones del perfil." });
    }
});

// DELETE: Eliminar Publicación (por el Autor)
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
        // Verificar que el post existe y pertenece al usuario
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

        if (parseInt(post.user_id) !== userId) {
            return res.status(403).json({ error: "No tienes permiso para eliminar esta publicación." });
        }

        // Eliminar la imagen del servidor
        if (post.image_url) {
            const imagePath = path.join(uploadDir, path.basename(post.image_url));
            if (fs.existsSync(imagePath)) {
                try {
                    fs.unlinkSync(imagePath);
                    console.log(`Imagen eliminada: ${imagePath}`);
                } catch (err) {
                    console.error("Error al eliminar imagen:", err);
                }
            }
        }

        // Eliminar el post 
        const deleteQuery = `
            DELETE FROM posts 
            WHERE id = $1
        `;
        await pool.query(deleteQuery, [postId]);

        console.log(`Publicación ${postId} eliminada por usuario ${userId}`);
        res.status(200).json({ message: "Publicación eliminada con éxito." });

    } catch (error) {
        console.error("Error al eliminar publicación:", error);
        res.status(500).json({ error: "Error interno del servidor al eliminar la publicación." });
    }
});

// 👍 LIKES Y COMENTARIOS

// POST: Dar "Me Gusta"
app.post("/posts/:postId/like", async (req, res) => {
    const { postId } = req.params;
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
        console.error('Error al registrar like:', error);
        res.status(500).json({ error: "Error interno del servidor al registrar like." });
    }
});

// DELETE: Quitar "Me Gusta"
app.delete("/posts/:postId/like", async (req, res) => {
    const { postId } = req.params;
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
        console.error('Error al eliminar like:', error);
        res.status(500).json({ error: "Error interno del servidor al eliminar like." });
    }
});

// GET: Obtener Comentarios de una Publicación
app.get("/posts/:postId/comments", async (req, res) => {
    const { postId } = req.params;

    if (!postId || isNaN(postId)) {
        return res.status(400).json({ error: "ID de publicación inválido." });
    }

    try {
        const sqlQuery = `
            SELECT
                c.id,
                c.content,
                c.created_at AS "createdAt",
                c.user_id AS "userId",
                u.nombre_usuario AS "authorUsername",
                u.foto_perfil AS "authorProfilePic"
            FROM comentarios c
            JOIN usuarios u ON c.user_id = u.id_usuario
            WHERE c.post_id = $1
            ORDER BY c.created_at ASC;
        `;
        
        const result = await pool.query(sqlQuery, [postId]);
        
        // Corregir URLs de fotos de perfil
        const comments = result.rows.map(comment => {
            let authorProfilePicUrl = comment.authorProfilePic;
            if (authorProfilePicUrl && !authorProfilePicUrl.startsWith('http')) {
                authorProfilePicUrl = `http://${HOST_IP}:${PORT}/uploads/${path.basename(authorProfilePicUrl)}`;
            }
            
            return {
                ...comment,
                authorProfilePic: authorProfilePicUrl || null
            };
        });

        res.status(200).json({ comments });

    } catch (error) {
        console.error(`Error al obtener comentarios del post ${postId}:`, error);
        res.status(500).json({ error: "Error interno del servidor al cargar comentarios." });
    }
});

// POST: Crear un nuevo Comentario
app.post("/posts/:postId/comments", async (req, res) => {
    const { postId } = req.params;
   
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

        // 2. Obtener información completa
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
       
        // 3. Corregir URL de perfil
        let newComment = fetchResult.rows[0];
        let authorProfilePicUrl = newComment.authorProfilePic;
        if (authorProfilePicUrl && !authorProfilePicUrl.startsWith('http')) {
            newComment.authorProfilePic = `http://${HOST_IP}:${PORT}/uploads/${path.basename(authorProfilePicUrl)}`;
        }

        res.status(201).json({
            message: "Comentario publicado con éxito.",
            newComment: newComment
        });

    } catch (error) {
        console.error('❌ Error al crear comentario:', error);
        res.status(500).json({ error: 'Error interno del servidor al publicar comentario.' });
    }
});

// COMPARTIR Y REPORTAR

// POST: Compartir una Publicación
app.post("/posts/:postId/share", async (req, res) => {
    const { postId } = req.params;
    const userId = safeParseInt(req.body.userId);
    const { comment } = req.body;

    if (!userId) {
        return res.status(400).json({ error: "Usuario no autorizado." });
    }

    if (!postId || isNaN(postId)) {
        return res.status(400).json({ error: "ID de publicación inválido." });
    }

    try {
        // 1. Verificar post original
        const originalPostQuery = `
            SELECT 
                p.id,
                p.content,
                p.image_url,
                p.user_id,
                p.shared_post_id
            FROM posts p
            WHERE p.id = $1
        `;
        const originalPostResult = await pool.query(originalPostQuery, [postId]);

        if (originalPostResult.rows.length === 0) {
            return res.status(404).json({ error: "Publicación no encontrada." });
        }

        const originalPost = originalPostResult.rows[0];
        
        // 2. Determinar ID raíz
        const rootPostId = originalPost.shared_post_id || originalPost.id;

        // 3. Chequeo de auto-compartido 
        if (parseInt(originalPost.user_id) === userId && !originalPost.shared_post_id) {
            return res.status(400).json({ error: "No puedes compartir tu propia publicación." });
        }

        // 4. Chequeo de duplicado
        const duplicateCheck = await pool.query(
            'SELECT id FROM posts WHERE user_id = $1 AND shared_post_id = $2',
            [userId, rootPostId]
        );

        if (duplicateCheck.rows.length > 0) {
            return res.status(400).json({ error: "Ya has compartido esta publicación." });
        }

        // 5. Crear la publicación compartida
        const shareContent = comment && comment.trim() 
            ? comment.trim() 
            : null;

        const insertQuery = `
            INSERT INTO posts (user_id, content, image_url, shared_post_id, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING id, created_at
        `;

        const insertResult = await pool.query(insertQuery, [
            userId,
            shareContent,
            originalPost.image_url,
            rootPostId
        ]);

        // 6. Incrementar contador en el post original
        await pool.query(
            'UPDATE posts SET share_count = share_count + 1 WHERE id = $1',
            [rootPostId]
        );

        // 7. Notificación al autor original
        const originalAuthorId = await pool.query(
            'SELECT user_id FROM posts WHERE id = $1',
            [rootPostId]
        );

        if (originalAuthorId.rows.length > 0 && 
            parseInt(originalAuthorId.rows[0].user_id) !== userId) {
            
            const notificationMessage = 'Un usuario compartió tu publicación';
            
            await pool.query(
                `INSERT INTO notificaciones (user_id, type, message, post_id, is_read, created_at)
                 VALUES ($1, 'post_shared', $2, $3, FALSE, NOW())`,
                [originalAuthorId.rows[0].user_id, notificationMessage, rootPostId]
            );
        }

        console.log(`Usuario ${userId} compartió publicación ${rootPostId}`);
        
        res.status(200).json({
            message: "Publicación compartida exitosamente",
            sharedPostId: insertResult.rows[0].id
        });

    } catch (error) {
        console.error("❌ Error al compartir publicación:", error);
        res.status(500).json({ error: "Error interno del servidor al compartir la publicación." });
    }
});

// POST: Reportar una Publicación (para usuario)
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

        // Verificar que no haya reportado ya
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

        console.log(`Usuario ${reporterId} reportó publicación ${postId}`);
        res.status(201).json({ message: 'Reporte enviado exitosamente' });
    } catch (error) {
        console.error('Error al reportar publicación:', error);
        
        if (error.code === '42P01') {
            return res.status(503).json({ 
                error: 'El sistema de reportes no está configurado. Contacta al administrador.' 
            });
        }
        
        res.status(500).json({ error: 'Error al enviar el reporte' });
    }
});

// GESTIÓN DE SEGUIMIENTO DE USUARIOS

// POST: Seguir a un Usuario
app.post("/follow/:followedId", async (req, res) => {
    const { followedId } = req.params;
    const followerId = safeParseInt(req.body.followerId);

    if (!followerId || !followedId) {
        return res.status(400).json({ error: "IDs de usuario inválidos." });
    }

    const session = driver.session();
   
    try {
        // Crear la relación SIGUE_A
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
       
        console.log(`Usuario ${followerId} ahora sigue a ${followedId}`);
        res.status(200).json({ message: "Usuario seguido exitosamente" });
       
    } catch (error) {
        console.error("Error al seguir usuario en Neo4j:", error);
        res.status(500).json({ error: "Error al seguir usuario" });
    } finally {
        await session.close();
    }
});

// DELETE: Dejar de Seguir a un Usuario
app.delete("/unfollow/:followedId", async (req, res) => {
    const { followedId } = req.params;
    const followerId = safeParseInt(req.body.followerId);

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
       
        console.log(`Usuario ${followerId} dejó de seguir a ${followedId}`);
        res.status(200).json({ message: "Dejaste de seguir al usuario" });
       
    } catch (error) {
        console.error("Error al dejar de seguir en Neo4j:", error);
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
        console.error("Error al verificar seguimiento en Neo4j:", error);
        res.status(500).json({ error: "Error al verificar seguimiento" });
    } finally {
        await session.close();
    }
});

// GET: Obtener Estadísticas de Seguimiento (Conteo)
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
        console.error("Error al obtener estadísticas de seguimiento:", error);
        res.status(500).json({ error: "Error al obtener estadísticas" });
    } finally {
        await session.close();
    }
});

// GET: Obtener Lista de Seguidores
app.get("/users/:userId/followers", async (req, res) => {
    const { userId } = req.params;
    const currentUserId = req.query.currentUserId;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: "ID de usuario inválido." });
    }

    const session = driver.session();
    try {
        // 1. Obtener IDs de seguidores desde Neo4j
        const cypher = `
            MATCH (follower:Usuario)-[:SIGUE_A]->(u:Usuario {id_usuario: $userId})
            RETURN collect(follower.id_usuario) AS followerIds
        `;
       
        const result = await session.run(cypher, { userId: parseInt(userId) });
       
        const followerIds = result.records[0]?.get('followerIds') || [];
       
        // 2. Obtener detalles de PostgreSQL y estado de seguimiento
        const followersDetails = await fetchUsersDetails(followerIds, currentUserId);

        res.status(200).json({ followers: followersDetails });

    } catch (error) {
        console.error("Error al obtener lista de seguidores:", error);
        res.status(500).json({ error: "Error en el servidor al cargar la lista de seguidores." });
    } finally {
        await session.close();
    }
});

// GET: Obtener Lista de Seguidos 
app.get("/users/:userId/following", async (req, res) => {
    const { userId } = req.params;
    const currentUserId = req.query.currentUserId;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: "ID de usuario inválido." });
    }

    const session = driver.session();
    try {
        // 1. Obtener IDs de seguidos desde Neo4j
        const cypher = `
            MATCH (u:Usuario {id_usuario: $userId})-[:SIGUE_A]->(followed:Usuario)
            RETURN collect(followed.id_usuario) AS followedIds
        `;
       
        const result = await session.run(cypher, { userId: parseInt(userId) });
       
        const followedIds = result.records[0]?.get('followedIds') || [];
       
        // 2. Obtener detalles de PostgreSQL y estado de seguimiento
        const followingDetails = await fetchUsersDetails(followedIds, currentUserId);

        res.status(200).json({ following: followingDetails });

    } catch (error) {
        console.error("Error al obtener lista de seguidos:", error);
        res.status(500).json({ error: "Error en el servidor al cargar la lista de seguidos." });
    } finally {
        await session.close();
    }
});

// BÚSQUEDA GENERAL

// GET: Búsqueda Unificada (Ligas, Equipos, Jugadores, Usuarios)
app.get("/buscar", async (req, res) => {
    const termino = req.query.q || "";
    if (termino.length < 1) {
        return res.json({ ligas: [], equipos: [], jugadores: [], usuarios: [] });
    }
   
    const terminoBusqueda = termino.toLowerCase();

    try {
        // 1. BÚSQUEDA DE LIGAS
        const ligasQuery = `
            SELECT 
                id,
                nombre,
                pais,
                nivel,
                id::text AS "elementId"
            FROM ligas
            WHERE LOWER(nombre) LIKE $1 OR LOWER(pais) LIKE $1
            ORDER BY nombre
            LIMIT 10;
        `;
        const ligasResult = await pool.query(ligasQuery, [`%${terminoBusqueda}%`]);
        const ligas = ligasResult.rows.map(liga => ({
            ...liga,
            id_liga: liga.id
        }));

        // 2. BÚSQUEDA DE EQUIPOS
        const equiposQuery = `
            SELECT 
                e.id,
                e.nombre,
                e.ciudad,
                e.estadio,
                e.liga_id,
                l.nombre as liga_nombre,
                e.id::text AS "elementId"
            FROM equipos e
            LEFT JOIN ligas l ON e.liga_id = l.id
            WHERE LOWER(e.nombre) LIKE $1 OR LOWER(e.ciudad) LIKE $1
            ORDER BY e.nombre
            LIMIT 10;
        `;
        const equiposResult = await pool.query(equiposQuery, [`%${terminoBusqueda}%`]);
        const equipos = equiposResult.rows.map(equipo => ({
            ...equipo,
            id_equipo: equipo.id
        }));

        // 3. BÚSQUEDA DE JUGADORES
        const jugadoresQuery = `
            SELECT 
                j.id,
                j.nombre,
                j.posicion,
                j.edad,
                j.nacionalidad,
                e.nombre as equipo_nombre,
                j.id::text AS "elementId"
            FROM jugadores j
            LEFT JOIN equipos e ON j.equipo_id = e.id
            WHERE LOWER(j.nombre) LIKE $1 OR LOWER(j.posicion) LIKE $1
            ORDER BY j.nombre
            LIMIT 10;
        `;
        const jugadoresResult = await pool.query(jugadoresQuery, [`%${terminoBusqueda}%`]);
        const jugadores = jugadoresResult.rows.map(jugador => ({
            ...jugador,
            id_jugador: jugador.id,
            foto: null
        }));

        // 4. BÚSQUEDA DE USUARIOS (EN EL BUSCADOR)
        const usuariosQuery = `
            SELECT
                id_usuario,
                nombre,
                apellido,
                nombre_usuario,
                foto_perfil,
                id_usuario::text AS "elementId"
            FROM usuarios
            WHERE
                LOWER(nombre) LIKE $1 OR
                LOWER(apellido) LIKE $1 OR
                LOWER(nombre_usuario) LIKE $1 OR
                LOWER(email) LIKE $1
            LIMIT 10;
        `;
        const usuariosResult = await pool.query(usuariosQuery, [`%${terminoBusqueda}%`]);
        const usuarios = usuariosResult.rows.map(user => {
            let fotoUrl = user.foto_perfil;
            if (fotoUrl && !fotoUrl.startsWith('http')) {
                fotoUrl = `http://${HOST_IP}:${PORT}/uploads/${path.basename(fotoUrl)}`;
            }
            return {
                ...user,
                foto_perfil: fotoUrl || null
            };
        });

        res.json({ ligas, equipos, jugadores, usuarios });

    } catch (error) {
        console.error("Error en búsqueda PostgreSQL:", error);
        res.status(500).json({ error: "Error en el servidor al realizar búsqueda" });
    }
});

// BUSCADOR CON LOS DETALLES DE LIGAS, EQUIPOS Y JUGADORES

// GET: Detalle de Liga y lista de Equipos
app.get("/liga/:ligaId", async (req, res) => {
    const { ligaId } = req.params;
   
    if (!ligaId || isNaN(ligaId)) {
        return res.status(400).json({ error: "ID de liga inválido" });
    }

    try {
        const ligaQuery = `
            SELECT 
                id,
                nombre,
                pais,
                nivel,
                created_at
            FROM ligas
            WHERE id = $1
        `;
        const ligaResult = await pool.query(ligaQuery, [ligaId]);

        if (ligaResult.rows.length === 0) {
            return res.status(404).json({ error: "Liga no encontrada" });
        }

        const liga = ligaResult.rows[0];

        const equiposQuery = `
            SELECT 
                id,
                nombre,
                ciudad,
                estadio,
                liga_id
            FROM equipos
            WHERE liga_id = $1
            ORDER BY nombre
        `;
        const equiposResult = await pool.query(equiposQuery, [ligaId]);

        const equipos = equiposResult.rows.map(equipo => ({
            ...equipo,
            id_equipo: equipo.id
        }));

        res.json({
            ...liga,
            id_liga: liga.id,
            equipos: equipos
        });

    } catch (error) {
        console.error(" Error en /liga/:ligaId:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// GET: Detalles Totales de Liga
app.get("/liga/:ligaId/stats", async (req, res) => {
    const { ligaId } = req.params;
   
    try {
        const statsQuery = `
            SELECT 
                COUNT(DISTINCT e.id) as total_equipos,
                COUNT(DISTINCT j.id) as total_jugadores,
                SUM(j.goles) as total_goles,
                SUM(j.partidos_jugados) as total_partidos
            FROM ligas l
            LEFT JOIN equipos e ON e.liga_id = l.id
            LEFT JOIN jugadores j ON j.liga_id = l.id
            WHERE l.id = $1
            GROUP BY l.id
        `;
        const statsResult = await pool.query(statsQuery, [ligaId]);
        
        res.json(statsResult.rows[0] || {
            total_equipos: 0,
            total_jugadores: 0,
            total_goles: 0,
            total_partidos: 0
        });

    } catch (error) {
        console.error("Error en /liga/:ligaId/stats:", error);
        res.status(500).json({ error: "Error al obtener estadísticas" });
    }
});

// GET: Detalle de Equipo y lista de Jugadores
app.get("/equipo/:equipoId", async (req, res) => {
    const { equipoId } = req.params;
   
    if (!equipoId || isNaN(equipoId)) {
        return res.status(400).json({ error: "ID de equipo inválido" });
    }

    try {
        const equipoQuery = `
            SELECT 
                e.id,
                e.nombre,
                e.ciudad,
                e.estadio,
                e.liga_id,
                l.nombre as liga_nombre,
                l.pais as liga_pais
            FROM equipos e
            LEFT JOIN ligas l ON e.liga_id = l.id
            WHERE e.id = $1
        `;
        const equipoResult = await pool.query(equipoQuery, [equipoId]);

        if (equipoResult.rows.length === 0) {
            return res.status(404).json({ error: "Equipo no encontrado" });
        }

        const equipo = equipoResult.rows[0];

        const jugadoresQuery = `
            SELECT 
                id,
                nombre,
                posicion,
                edad,
                nacionalidad,
                partidos_jugados,
                goles,
                asistencias,
                tarjetas_amarillas,
                tarjetas_rojas
            FROM jugadores
            WHERE equipo_id = $1
            ORDER BY 
                CASE posicion
                    WHEN 'Portero' THEN 1
                    WHEN 'Defensa' THEN 2
                    WHEN 'Centrocampista' THEN 3
                    WHEN 'Delantero' THEN 4
                    ELSE 5
                END,
                nombre
        `;
        const jugadoresResult = await pool.query(jugadoresQuery, [equipoId]);

        const jugadores = jugadoresResult.rows.map(jugador => ({
            ...jugador,
            id_jugador: jugador.id,
            foto: null
        }));

        res.json({
            ...equipo,
            id_equipo: equipo.id,
            jugadores: jugadores
        });

    } catch (error) {
        console.error("Error en /equipo/:equipoId:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// GET: Detalle Completo de Jugador
app.get("/jugador/:jugadorId", async (req, res) => {
    const { jugadorId } = req.params;
   
    if (!jugadorId || isNaN(jugadorId)) {
        return res.status(400).json({ error: "ID de jugador inválido" });
    }

    try {
        const jugadorQuery = `
            SELECT 
                j.id,
                j.nombre,
                j.posicion,
                j.edad,
                j.nacionalidad,
                j.equipo_id,
                e.nombre as equipo_nombre,
                e.ciudad as equipo_ciudad,
                l.nombre as liga_nombre,
                j.partidos_jugados,
                j.minutos_jugados,
                j.titularidades,
                j.suplente,
                j.goles,
                j.goles_penalti,
                j.asistencias,
                j.tarjetas_amarillas,
                j.tarjetas_rojas,
                j.tiros_totales,
                j.tiros_a_puerta,
                j.pases_totales,
                j.pases_completados,
                j.pases_clave,
                j.regates_intentados,
                j.regates_exitosos,
                j.duelos_ganados,
                j.duelos_aereos_ganados,
                j.entradas,
                j.intercepciones,
                j.despejes,
                j.paradas,
                j.goles_encajados,
                j.porterias_imbatidas,
                j.temporada
            FROM jugadores j
            LEFT JOIN equipos e ON j.equipo_id = e.id
            LEFT JOIN ligas l ON j.liga_id = l.id
            WHERE j.id = $1
        `;
        const jugadorResult = await pool.query(jugadorQuery, [jugadorId]);

        if (jugadorResult.rows.length === 0) {
            return res.status(404).json({ error: "Jugador no encontrado" });
        }

        const jugador = jugadorResult.rows[0];

        res.json({
            ...jugador,
            id_jugador: jugador.id,
            foto: null,
            numero: null
        });

    } catch (error) {
        console.error("Error en /jugador/:jugadorId:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// 👑 ENDPOINTS DE ADMINISTRACIÓN

// Verificar Rol de Administrador
const isAdmin = async (userId) => {
    try {
        const result = await pool.query(
            'SELECT rol_id FROM usuarios WHERE id_usuario = $1',
            [userId]
        );
        return result.rows.length > 0 && result.rows[0].rol_id === 2;
    } catch (error) {
        console.error("Error al verificar rol de admin:", error);
        return false;
    }
};

// GET: Obtener Publicaciones Reportadas Pendientes
app.get('/admin/reported-posts', async (req, res) => {
    try {
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
        
        // Corregir URLs
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
        console.error('Error al obtener posts reportados:', error);
        
        if (error.code === '42P01') {
            return res.status(503).json({ 
                error: 'La tabla de reportes no está configurada. Ejecuta las migraciones SQL necesarias.',
                posts: []
            });
        }
        
        res.status(500).json({ error: 'Error al cargar publicaciones reportadas' });
    }
});


// DELETE: Eliminar Publicación (por Admin) y Notificar al Autor
app.delete('/admin/posts/:postId', async (req, res) => {
    const { postId } = req.params;
    const adminId = safeParseInt(req.body.adminId);
    const { reason } = req.body;

    if (!adminId) {
        return res.status(400).json({ error: 'ID de administrador inválido' });
    }

    if (!reason || reason.trim().length === 0) {
        return res.status(400).json({ error: 'Debes proporcionar una razón para eliminar la publicación' });
    }

    try {
        // Verificar Admin
        if (!await isAdmin(adminId)) {
            return res.status(403).json({ error: 'No tienes permisos de administrador' });
        }

        // Obtener datos del post y autor
        const postQuery = 'SELECT user_id, image_url, content FROM posts WHERE id = $1';
        const postResult = await pool.query(postQuery, [postId]);
        
        if (postResult.rows.length === 0) {
            return res.status(404).json({ error: 'Publicación no encontrada' });
        }

        const post = postResult.rows[0];
        const postAuthorId = post.user_id;

        // Crear Notificación para el Autor
        const notificationMessage = `Tu publicación fue eliminada por un administrador. Razón: ${reason}`;
        
        await pool.query(
            `INSERT INTO notificaciones (user_id, type, message, post_id, is_read, created_at)
             VALUES ($1, 'post_deleted', $2, $3, FALSE, NOW())`,
            [postAuthorId, notificationMessage, postId]
        );

        // Actualizar reportes a 'resuelto'
        try {
            await pool.query(
                "UPDATE reportes SET estado = 'resuelto', reason = $1 WHERE post_id = $2",
                [reason, postId]
            );
        } catch (err) {
            console.log('No se pudieron actualizar reportes');
        }

        // Eliminar archivos
        if (post.image_url) {
            const imagePath = path.join(uploadDir, path.basename(post.image_url));
            if (fs.existsSync(imagePath)) {
                try {
                    fs.unlinkSync(imagePath);
                    console.log(`Imagen eliminada: ${imagePath}`);
                } catch (err) {
                    console.error("Error al eliminar imagen:", err);
                }
            }
        }

        // Eliminar comentarios y likes
        await pool.query('DELETE FROM likes WHERE post_id = $1', [postId]);
        await pool.query('DELETE FROM comentarios WHERE post_id = $1', [postId]);
        
        // Eliminar publicación
        await pool.query('DELETE FROM posts WHERE id = $1', [postId]);

        console.log(`Admin ${adminId} eliminó publicación ${postId}. Usuario ${postAuthorId} notificado.`);
        res.json({ message: 'Publicación eliminada y usuario notificado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar publicación:', error);
        res.status(500).json({ error: 'Error al eliminar la publicación' });
    }
});

// POST: Descartar Reporte
app.post('/admin/reports/:postId/dismiss', async (req, res) => {
    const { postId } = req.params;
    const adminId = safeParseInt(req.body.adminId);

    if (!adminId) {
        return res.status(400).json({ error: 'ID de administrador inválido' });
    }

    try {
        // Verificar Admin
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

        console.log(`Admin ${adminId} descartó reportes del post ${postId}`);
        res.json({ message: 'Reporte descartado exitosamente' });
    } catch (error) {
        console.error('Error al descartar reporte:', error);
        
        if (error.code === '42P01') {
            return res.status(503).json({ 
                error: 'La tabla de reportes no está configurada.' 
            });
        }
        
        res.status(500).json({ error: 'Error al descartar el reporte' });
    }
});

// GET: Obtener Todos los Usuarios (Dashboard Admin)
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
        
        // Corregir URLs
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
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ error: 'Error al cargar usuarios' });
    }
});

// POST: Suspender o Activar Usuario
app.post('/admin/users/:userId/toggle-status', async (req, res) => {
    const { userId } = req.params;
    const adminId = safeParseInt(req.body.adminId);

    if (!adminId) {
        return res.status(400).json({ error: 'ID de administrador inválido' });
    }

    try {
        // Verificar Admin y auto-suspensión
        if (!await isAdmin(adminId)) {
            return res.status(403).json({ error: 'No tienes permisos de administrador' });
        }
        if (parseInt(userId) === adminId) {
            return res.status(400).json({ error: 'No puedes cambiar tu propio estado' });
        }
        if (await isAdmin(userId)) {
            return res.status(400).json({ error: 'No puedes cambiar el estado de otro administrador' });
        }

        // Obtener y alternar estado
        const currentStatus = await pool.query(
            "SELECT COALESCE(estado, 'active') as estado FROM usuarios WHERE id_usuario = $1",
            [userId]
        );

        if (currentStatus.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const newStatus = currentStatus.rows[0].estado === 'suspended' ? 'active' : 'suspended';

        // Actualizar estado
        const updateResult = await pool.query(
            'UPDATE usuarios SET estado = $1 WHERE id_usuario = $2',
            [newStatus, userId]
        );

        console.log(`Admin ${adminId} cambió estado de usuario ${userId} a ${newStatus}`);
        res.json({ 
            message: `Usuario ${newStatus === 'suspended' ? 'suspendido' : 'activado'} exitosamente`,
            newStatus 
        });
    } catch (error) {
        console.error('Error al cambiar estado de usuario:', error);
        
        if (error.code === '42703') {
            return res.status(503).json({ 
                error: 'La columna estado no existe. Ejecuta: ALTER TABLE usuarios ADD COLUMN estado VARCHAR(20) DEFAULT \'active\';' 
            });
        }
        
        res.status(500).json({ error: 'Error al cambiar el estado del usuario' });
    }
});

// GET: Obtener Estadísticas Generales del Sistema
app.get('/admin/stats', async (req, res) => {
    try {
        // Conteo de Usuarios
        const totalUsersResult = await pool.query('SELECT COUNT(*) as count FROM usuarios');
        const totalUsers = parseInt(totalUsersResult.rows[0].count);

        // Conteo de Publicaciones
        const totalPostsResult = await pool.query('SELECT COUNT(*) as count FROM posts');
        const totalPosts = parseInt(totalPostsResult.rows[0].count);

        // Conteo de Reportes Pendientes (con manejo de error)
        let totalReports = 0;
        try {
            const totalReportsResult = await pool.query(
                "SELECT COUNT(DISTINCT post_id) as count FROM reportes WHERE estado = 'pendiente'"
            );
            totalReports = parseInt(totalReportsResult.rows[0].count);
        } catch (err) {
            console.log('No se pudo obtener conteo de reportes (tabla puede no existir)');
        }

        // Usuarios Activos (publicación en los últimos 30 días)
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
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error al cargar estadísticas' });
    }
});

// 📬 NOTIFICACIONES

// GET: Obtener Notificaciones de un Usuario
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

        // Contar no leídas
        const unreadCount = await pool.query(
            'SELECT COUNT(*) as count FROM notificaciones WHERE user_id = $1 AND is_read = FALSE',
            [userId]
        );

        res.json({
            notifications: notifications.rows,
            unreadCount: parseInt(unreadCount.rows[0].count)
        });
    } catch (error) {
        console.error('Error al obtener notificaciones:', error);
        res.status(500).json({ error: 'Error al obtener notificaciones' });
    }
});

// PUT: Marcar una Notificación como Leída
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
        console.error('Error al marcar notificación como leída:', error);
        res.status(500).json({ error: 'Error al actualizar notificación' });
    }
});

// PUT: Marcar Todas las Notificaciones como Leídas
app.put('/notifications/:userId/read-all', async (req, res) => {
    const { userId } = req.params;

    try {
        await pool.query(
            'UPDATE notificaciones SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
            [userId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error al marcar todas como leídas:', error);
        res.status(500).json({ error: 'Error al actualizar notificaciones' });
    }
});

// INICIO SERVIDOR

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor corriendo en http://10.0.2.2:${PORT}`);
});