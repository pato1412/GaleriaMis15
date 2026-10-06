import { useCallback, useEffect, useRef, useState } from "react";
import { fetchPhotos, fetchNewerPhotos } from "../api";

const POLL_INTERVAL_MS = 12000;

export function usePhotos() {
  const [photos, setPhotos] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Cursor de la foto mas vieja cargada, para pedir "las siguientes" (mas
  // antiguas). Se guarda como {ts, filename}: el nombre de archivo
  // desempata cuando dos fotos comparten la misma fecha de modificacion
  // (pasa si se copiaron varias juntas a la carpeta en vez de subirlas una
  // por una), asi la paginacion nunca repite ni se salta fotos.
  const oldestCursorRef = useRef(null);
  // Cursor de la foto mas nueva que ya vimos, para detectar fotos nuevas
  // subidas por otros invitados.
  const newestSeenRef = useRef(null);

  // Espejo en refs de loadingMore/hasMore: loadMore los necesita para la
  // validacion, pero si fueran dependencias del useCallback, la funcion
  // cambiaria de identidad en cada carga. Eso hacia que el useEffect del
  // centinela en Gallery/AdminPage desconectara y reconectara el
  // IntersectionObserver todo el tiempo, y con cientos de fotos terminaba
  // "comiendose" el aviso de que el centinela volvio a entrar en pantalla:
  // el scroll infinito se quedaba pegado en la primera tanda. Con refs,
  // loadMore mantiene SIEMPRE la misma identidad (deps: []) y el observer
  // se crea una sola vez.
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);

  const loadInitial = useCallback(async () => {
    setLoadingInitial(true);
    try {
      const { items, hasMore: more } = await fetchPhotos({ limit: 20 });
      setPhotos(items);
      setHasMore(more);
      hasMoreRef.current = more;
      if (items.length > 0) {
        const ultima = items[items.length - 1];
        oldestCursorRef.current = { ts: ultima.uploadedAt, filename: ultima.filename };
        const primera = items[0];
        newestSeenRef.current = { ts: primera.uploadedAt, filename: primera.filename };
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current || oldestCursorRef.current == null) {
      return;
    }
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const { items, hasMore: more } = await fetchPhotos({
        before: oldestCursorRef.current.ts,
        beforeFile: oldestCursorRef.current.filename,
        limit: 20,
      });
      if (items.length > 0) {
        const ultima = items[items.length - 1];
        oldestCursorRef.current = { ts: ultima.uploadedAt, filename: ultima.filename };
        setPhotos((prev) => [...prev, ...items]);
      }
      hasMoreRef.current = more;
      setHasMore(more);
    } catch (err) {
      console.error(err);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  // Agrega al toque una foto recien subida por este mismo usuario, arriba de todo
  const prependPhoto = useCallback((photo) => {
    setPhotos((prev) => {
      if (prev.some((p) => p.filename === photo.filename)) return prev;
      return [photo, ...prev];
    });
    if (oldestCursorRef.current == null) {
      oldestCursorRef.current = { ts: photo.uploadedAt, filename: photo.filename };
    }
    if (!newestSeenRef.current || photo.uploadedAt >= newestSeenRef.current.ts) {
      newestSeenRef.current = { ts: photo.uploadedAt, filename: photo.filename };
    }
  }, []);

  // Saca una foto de la lista (usado por el panel de admin al borrarla)
  const removePhoto = useCallback((filename) => {
    setPhotos((prev) => prev.filter((p) => p.filename !== filename));
  }, []);

  // Sondeo periodico de fotos nuevas subidas por otros invitados
  useEffect(() => {
    const interval = setInterval(async () => {
      if (newestSeenRef.current == null) return;
      try {
        const nuevas = await fetchNewerPhotos(
          newestSeenRef.current.ts,
          newestSeenRef.current.filename
        );
        if (nuevas.length > 0) {
          setPhotos((prev) => {
            const existentes = new Set(prev.map((p) => p.filename));
            const aAgregar = nuevas.filter((p) => !existentes.has(p.filename));
            return [...aAgregar, ...prev];
          });
          // La mas nueva de la tanda queda primera en "nuevas" (vienen ordenadas desc)
          const masNueva = nuevas[0];
          if (masNueva.uploadedAt >= newestSeenRef.current.ts) {
            newestSeenRef.current = { ts: masNueva.uploadedAt, filename: masNueva.filename };
          }
        }
      } catch (err) {
        console.error(err);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { photos, loadingInitial, loadingMore, hasMore, loadMore, prependPhoto, removePhoto };
}
