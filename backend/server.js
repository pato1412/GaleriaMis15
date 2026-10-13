import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carpeta especifica donde se guardan las fotos de la fiesta
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Contraseña para poder borrar fotos desde /admin. Configurala en un archivo
// .env (ver .env.example) antes de usar esto en la fiesta real.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "delfi15";
if (!process.env.ADMIN_PASSWORD) {
  console.warn(
    "⚠️  ADMIN_PASSWORD no configurada: usando la contraseña por defecto 'delfi15'. " +
    "Definila en backend/.env antes de compartir el link de /admin."
  );
}

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
// Servimos las imagenes subidas como archivos estaticos
app.use("/uploads", express.static(UPLOAD_DIR));

// Chequea el header x-admin-password en los endpoints de moderacion
function requireAdmin(req, res, next) {
  const provided = req.header("x-admin-password");
  if (provided && provided === ADMIN_PASSWORD) {
    return next();
  }
  res.status(401).json({ error: "Contraseña incorrecta" });
}

// Config de multer: guarda con nombre unico (fecha + random) para no pisar archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const uniqueName = `foto-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB por foto
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Solo se permiten imagenes"));
  },
});

// Subida de una foto
app.post("/api/upload", upload.single("foto"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No se recibio ninguna imagen" });
  }
  res.json({
    ok: true,
    filename: req.file.filename,
    url: `/uploads/${req.file.filename}`,
  });
});

// Compara dos fotos para el orden "mas reciente primero". Si dos fotos
// tienen exactamente la misma fecha de modificacion (pasa seguido si se
// copiaron varias de una sola vez a la carpeta, en vez de subirlas una
// por una desde la app), se desempata por nombre de archivo para que el
// orden sea siempre el mismo y el cursor de paginacion nunca se trabe.
function compararFotos(a, b) {
  if (b.uploadedAt !== a.uploadedAt) return b.uploadedAt - a.uploadedAt;
  return a.filename < b.filename ? -1 : a.filename > b.filename ? 1 : 0;
}

// Compuesta (fecha, archivo): true si "img" va despues de "cursor" en el
// orden de compararFotos (o sea, es mas vieja que el cursor).
function esMasViejaQueCursor(img, cursorTs, cursorFile) {
  if (img.uploadedAt !== cursorTs) return img.uploadedAt < cursorTs;
  return img.filename > cursorFile;
}
function esMasNuevaQueCursor(img, cursorTs, cursorFile) {
  if (img.uploadedAt !== cursorTs) return img.uploadedAt > cursorTs;
  return img.filename < cursorFile;
}

// Listado de fotos para la galeria, con paginacion por cursor (mas recientes primero).
//
// - Carga inicial / scroll hacia abajo (mas viejas):
//     GET /api/photos?limit=20&before=<timestamp>&beforeFile=<nombre>
//     Devuelve las fotos siguientes a ese cursor, mas recientes primero.
// - Sondeo de fotos nuevas subidas por otros invitados (mas nuevas):
//     GET /api/photos?after=<timestamp>&afterFile=<nombre>
//     Devuelve items mas nuevos que el cursor, mas recientes primero, sin limite.
app.get("/api/photos", (req, res) => {
  fs.readdir(UPLOAD_DIR, (err, files) => {
    if (err) return res.status(500).json({ error: "No se pudo leer la carpeta" });

    const { before, beforeFile, after, afterFile } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    let images = files
      .filter((f) => /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(f))
      .map((f) => {
        const stats = fs.statSync(path.join(UPLOAD_DIR, f));
        return { filename: f, url: `/uploads/${f}`, uploadedAt: stats.mtimeMs };
      })
      .sort(compararFotos);

    if (after) {
      const afterTs = parseFloat(after);
      images = images.filter((img) => esMasNuevaQueCursor(img, afterTs, afterFile || ""));
      return res.json({ items: images, hasMore: false });
    }

    if (before) {
      const beforeTs = parseFloat(before);
      images = images.filter((img) => esMasViejaQueCursor(img, beforeTs, beforeFile || ""));
    }

    const page = images.slice(0, limit);
    const hasMore = images.length > limit;

    res.json({ items: page, hasMore });
  });
});

app.get("/", (req, res) => {
  res.send("Servidor de fotos Mis 15 Delfi funcionando 🎉");
});

// Valida la contraseña de admin (la usa el frontend antes de mostrar el panel)
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body || {};
  if (password === ADMIN_PASSWORD) {
    return res.json({ ok: true });
  }
  res.status(401).json({ error: "Contraseña incorrecta" });
});

// Borra una foto de la carpeta de uploads (moderacion). Requiere contraseña.
app.delete("/api/photos/:filename", requireAdmin, (req, res) => {
  // path.basename evita path traversal (../../ etc.) por si el nombre viene manipulado
  const filename = path.basename(req.params.filename);
  const filePath = path.join(UPLOAD_DIR, filename);

  if (!filePath.startsWith(UPLOAD_DIR)) {
    return res.status(400).json({ error: "Nombre de archivo invalido" });
  }

  fs.unlink(filePath, (err) => {
    if (err) {
      if (err.code === "ENOENT") {
        return res.status(404).json({ error: "La foto ya no existe" });
      }
      return res.status(500).json({ error: "No se pudo borrar la foto" });
    }
    res.json({ ok: true, filename });
  });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Fotos guardadas en: ${UPLOAD_DIR}`);
});
