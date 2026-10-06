import { useEffect, useRef, useState } from "react";
import { Modal, Spinner } from "react-bootstrap";
import { FaDownload } from "react-icons/fa";
import { getPhotoUrl } from "../api";

export default function Gallery({ photos, loadingInitial, loadingMore, hasMore, onLoadMore }) {
  const [selected, setSelected] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const sentinelRef = useRef(null);

  // Dispara onLoadMore cuando el "centinela" al final de la lista entra en pantalla
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: "400px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [onLoadMore]);

  // Descarga la foto al dispositivo (via blob, para que funcione tambien
  // si el backend queda en otro dominio que el frontend)
  async function handleDownload(photo) {
    setDownloading(true);
    try {
      const res = await fetch(getPhotoUrl(photo.url));
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = photo.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(false);
    }
  }

  if (loadingInitial) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="danger" />
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="empty-state">
        Todavía no hay fotos. ¡Sé el primero en subir una! 📸
      </div>
    );
  }

  return (
    <>
      {/* Grid en orden de lectura (izquierda a derecha, arriba a abajo).
          La primera foto (la más reciente) queda destacada arriba de todo. */}
      <div className="mosaic">
        {photos.map((photo, index) => {
          const esDestacada = index === 0;
          return (
            <div
              key={photo.filename}
              className={`polaroid${esDestacada ? " destacada" : ""}`}
              onClick={() => setSelected(photo)}
            >
              {esDestacada && <span className="polaroid-badge">Recién subida ✨</span>}
              <img src={getPhotoUrl(photo.url)} alt="Foto de la fiesta" loading="lazy" />
            </div>
          );
        })}
      </div>

      <div ref={sentinelRef} className="scroll-sentinel">
        {loadingMore && <Spinner animation="border" size="sm" variant="danger" />}
        {!hasMore && photos.length > 0 && (
          <span className="text-muted small">Llegaste al principio de la fiesta 🎉</span>
        )}
      </div>

      <Modal show={!!selected} onHide={() => setSelected(null)} centered size="lg" className="modal-lightbox">
        <Modal.Body className="p-0" style={{ background: "#000" }}>
          {selected && (
            <>
              <img
                src={getPhotoUrl(selected.url)}
                alt="Foto ampliada"
                style={{ width: "100%", display: "block" }}
              />
              <button
                className="btn-descargar"
                onClick={() => handleDownload(selected)}
                disabled={downloading}
              >
                <FaDownload className="me-2" />
                {downloading ? "Descargando..." : "Descargar foto"}
              </button>
            </>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}
