import { useEffect, useRef, useState } from "react";
import { Modal, Spinner } from "react-bootstrap";
import { getPhotoUrl } from "../api";

export default function Gallery({ photos, loadingInitial, loadingMore, hasMore, onLoadMore }) {
  const [selected, setSelected] = useState(null);
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
      <div className="mosaic">
        {photos.map((photo) => (
          <div
            key={photo.filename}
            className="mosaic-item"
            onClick={() => setSelected(photo)}
          >
            <img src={getPhotoUrl(photo.url)} alt="Foto de la fiesta" loading="lazy" />
          </div>
        ))}
      </div>

      <div ref={sentinelRef} className="scroll-sentinel">
        {loadingMore && <Spinner animation="border" size="sm" variant="danger" />}
        {!hasMore && photos.length > 0 && (
          <span className="text-muted small">Llegaste al principio de la fiesta 🎉</span>
        )}
      </div>

      <Modal show={!!selected} onHide={() => setSelected(null)} centered size="lg">
        <Modal.Body className="p-0" style={{ background: "#000" }}>
          {selected && (
            <img
              src={getPhotoUrl(selected.url)}
              alt="Foto ampliada"
              style={{ width: "100%", display: "block" }}
            />
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}
