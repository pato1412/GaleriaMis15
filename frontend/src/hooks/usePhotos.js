import { useCallback, useEffect, useRef, useState } from "react";
import { fetchPhotos, fetchNewerPhotos } from "../api";

const POLL_INTERVAL_MS = 12000;

export function usePhotos() {
  const [photos, setPhotos] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Cursor con la fecha de la foto mas vieja cargada (para pedir "mas antiguas")
  const oldestCursorRef = useRef(null);
  // Fecha de la foto mas nueva que ya vimos (para detectar fotos nuevas de otros)
  const newestSeenRef = useRef(null);

  const loadInitial = useCallback(async () => {
    setLoadingInitial(true);
    try {
      const { items, hasMore: more } = await fetchPhotos({ limit: 20 });
      setPhotos(items);
      setHasMore(more);
      if (items.length > 0) {
        oldestCursorRef.current = items[items.length - 1].uploadedAt;
        newestSeenRef.current = items[0].uploadedAt;
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || oldestCursorRef.current == null) return;
    setLoadingMore(true);
    try {
      const { items, hasMore: more } = await fetchPhotos({
        before: oldestCursorRef.current,
        limit: 20,
      });
      if (items.length > 0) {
        oldestCursorRef.current = items[items.length - 1].uploadedAt;
        setPhotos((prev) => [...prev, ...items]);
      }
      setHasMore(more);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore]);

  // Agrega al toque una foto recien subida por este mismo usuario, arriba de todo
  const prependPhoto = useCallback((photo) => {
    setPhotos((prev) => {
      if (prev.some((p) => p.filename === photo.filename)) return prev;
      return [photo, ...prev];
    });
    if (oldestCursorRef.current == null) {
      oldestCursorRef.current = photo.uploadedAt;
    }
    newestSeenRef.current = Math.max(newestSeenRef.current || 0, photo.uploadedAt);
  }, []);

  // Sondeo periodico de fotos nuevas subidas por otros invitados
  useEffect(() => {
    const interval = setInterval(async () => {
      if (newestSeenRef.current == null) return;
      try {
        const nuevas = await fetchNewerPhotos(newestSeenRef.current);
        if (nuevas.length > 0) {
          setPhotos((prev) => {
            const existentes = new Set(prev.map((p) => p.filename));
            const aAgregar = nuevas.filter((p) => !existentes.has(p.filename));
            return [...aAgregar, ...prev];
          });
          newestSeenRef.current = Math.max(
            newestSeenRef.current,
            ...nuevas.map((p) => p.uploadedAt)
          );
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

  return { photos, loadingInitial, loadingMore, hasMore, loadMore, prependPhoto };
}
