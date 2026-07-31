// Si se define VITE_API_URL (build de produccion con backend en otro dominio),
// se usa esa base. En desarrollo, el proxy de Vite redirige /api y /uploads
// al backend en localhost:4000, asi que dejamos la base vacia.
const API_BASE = import.meta.env.VITE_API_URL || "";

export function getPhotoUrl(relativeUrl) {
  return `${API_BASE}${relativeUrl}`;
}

// Carga inicial o "cargar mas viejas" (scroll hacia abajo).
// Sin cursor -> trae las mas recientes. Con cursor -> trae las anteriores a esa fecha.
export async function fetchPhotos({ before, limit = 20 } = {}) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (before) params.set("before", String(before));
  const res = await fetch(`${API_BASE}/GetFotos?${params.toString()}`);
  if (!res.ok) throw new Error("No se pudieron cargar las fotos");
  return res.json(); // { items, hasMore }
}

// Sondeo de fotos nuevas subidas por otros invitados desde la ultima vez.
export async function fetchNewerPhotos(after) {
  const params = new URLSearchParams({ after: String(after) });
  const res = await fetch(`${API_BASE}/GetFotos?${params.toString()}`);
  if (!res.ok) throw new Error("No se pudieron cargar fotos nuevas");
  const data = await res.json();
  return data.items;
}

// Sube una foto con seguimiento de progreso (via XMLHttpRequest)
export function uploadPhoto(file, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("foto", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/UploadFoto`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error("Error al subir la foto"));
      }
    };
    xhr.onerror = () => reject(new Error("Error de red al subir la foto"));
    xhr.send(formData);
  });
}
