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

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
// Servimos las imagenes subidas como archivos estaticos
app.use("/uploads", express.static(UPLOAD_DIR));

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

// Listado de fotos para la galeria, con paginacion por cursor (mas recientes primero).
//
// - Carga inicial / scroll hacia abajo (mas viejas):
//     GET /api/photos?limit=20&before=<timestamp>
//     Devuelve items con uploadedAt < before, mas recientes primero.
// - Sondeo de fotos nuevas subidas por otros invitados (mas nuevas):
//     GET /api/photos?after=<timestamp>
//     Devuelve items con uploadedAt > after, mas recientes primero, sin limite.
app.get("/api/photos", (req, res) => {
  fs.readdir(UPLOAD_DIR, (err, files) => {
    if (err) return res.status(500).json({ error: "No se pudo leer la carpeta" });

    const { before, after } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    let images = files
      .filter((f) => /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(f))
      .map((f) => {
        const stats = fs.statSync(path.join(UPLOAD_DIR, f));
        return { filename: f, url: `/uploads/${f}`, uploadedAt: stats.mtimeMs };
      })
      .sort((a, b) => b.uploadedAt - a.uploadedAt);

    if (after) {
      const afterTs = parseFloat(after);
      images = images.filter((img) => img.uploadedAt > afterTs);
      return res.json({ items: images, hasMore: false });
    }

    if (before) {
      const beforeTs = parseFloat(before);
      images = images.filter((img) => img.uploadedAt < beforeTs);
    }

    const page = images.slice(0, limit);
    const hasMore = images.length > limit;

    res.json({ items: page, hasMore });
  });
});

app.get("/", (req, res) => {
  res.send("Servidor de fotos Mis 15 Delfi funcionando 🎉");
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Fotos guardadas en: ${UPLOAD_DIR}`);
});
