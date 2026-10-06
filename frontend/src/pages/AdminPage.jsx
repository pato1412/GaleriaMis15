import { useEffect, useRef, useState } from "react";
import { Button, Form, Alert, Spinner, Modal } from "react-bootstrap";
import { FaTrash, FaArrowLeft } from "react-icons/fa";
import { adminLogin, deletePhoto, getPhotoUrl } from "../api";
import { usePhotos } from "../hooks/usePhotos";

const SESSION_KEY = "mis15delfi_admin_password";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loginError, setLoginError] = useState(null);
  const [loggingIn, setLoggingIn] = useState(false);

  // Al entrar, si ya habia una sesion de admin en este navegador, la valida
  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) {
      setCheckingSession(false);
      return;
    }
    adminLogin(stored).then((ok) => {
      if (ok) {
        setPassword(stored);
        setAuthenticated(true);
      } else {
        sessionStorage.removeItem(SESSION_KEY);
      }
      setCheckingSession(false);
    });
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);
    try {
      const ok = await adminLogin(password);
      if (ok) {
        sessionStorage.setItem(SESSION_KEY, password);
        setAuthenticated(true);
      } else {
        setLoginError("Contraseña incorrecta.");
      }
    } catch (err) {
      setLoginError("No se pudo conectar con el servidor.");
    } finally {
      setLoggingIn(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="admin-shell d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
        <Spinner animation="border" variant="danger" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="admin-shell d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
        <Form onSubmit={handleLogin} className="admin-login-card">
          <h1 className="admin-login-title">Panel de moderación</h1>
          <p className="admin-login-subtitle">Mis 15 Delfi</p>
          <Form.Group className="mb-3">
            <Form.Control
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </Form.Group>
          {loginError && (
            <Alert variant="danger" className="py-2 text-center">
              {loginError}
            </Alert>
          )}
          <Button type="submit" className="btn-fiesta w-100" disabled={loggingIn || !password}>
            {loggingIn ? "Ingresando..." : "Ingresar"}
          </Button>
          <div className="text-center mt-3">
            <a href="/" className="admin-back-link">
              ← Volver a la galería
            </a>
          </div>
        </Form>
      </div>
    );
  }

  return <AdminGallery password={password} />;
}

function AdminGallery({ password }) {
  const { photos, loadingInitial, loadingMore, hasMore, loadMore, removePhoto } = usePhotos();
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "400px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadMore]);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await deletePhoto(toDelete.filename, password);
      removePhoto(toDelete.filename);
      setToDelete(null);
    } catch (err) {
      setError(err.message || "No se pudo borrar la foto.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <a href="/" className="admin-back-link">
          <FaArrowLeft className="me-2" />
          Galería
        </a>
        <h1 className="admin-header-title">Moderar fotos</h1>
      </header>

      {error && (
        <Alert variant="danger" className="mx-3 py-2 text-center">
          {error}
        </Alert>
      )}

      {loadingInitial ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="danger" />
        </div>
      ) : photos.length === 0 ? (
        <div className="empty-state">Todavía no hay fotos subidas.</div>
      ) : (
        <>
          <div className="admin-grid">
            {photos.map((photo) => (
              <div key={photo.filename} className="admin-thumb">
                <img src={getPhotoUrl(photo.url)} alt="Foto de la fiesta" loading="lazy" />
                <button
                  className="admin-delete-btn"
                  onClick={() => setToDelete(photo)}
                  aria-label="Borrar foto"
                >
                  <FaTrash />
                </button>
              </div>
            ))}
          </div>

          <div ref={sentinelRef} className="scroll-sentinel">
            {loadingMore && <Spinner animation="border" size="sm" variant="danger" />}
            {!hasMore && <span className="text-muted small">No hay más fotos.</span>}
          </div>

          {hasMore && !loadingMore && (
            <div className="text-center">
              <button className="btn-cargar-mas" onClick={loadMore}>
                Cargar más fotos
              </button>
            </div>
          )}
        </>
      )}

      <Modal show={!!toDelete} onHide={() => setToDelete(null)} centered className="modal-fiesta">
        <Modal.Header closeButton>
          <Modal.Title style={{ color: "var(--rosa-fuerte)", fontWeight: 700 }}>
            ¿Borrar esta foto?
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {toDelete && (
            <img
              src={getPhotoUrl(toDelete.url)}
              alt="Foto a borrar"
              style={{ width: "100%", borderRadius: 12, marginBottom: "1rem" }}
            />
          )}
          <p className="text-center text-muted mb-3">Esta acción no se puede deshacer.</p>
          <div className="d-flex gap-2 justify-content-center">
            <Button variant="danger" className="rounded-pill px-4" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Borrando..." : "Sí, borrar"}
            </Button>
            <Button
              variant="outline-secondary"
              className="rounded-pill px-4"
              onClick={() => setToDelete(null)}
              disabled={deleting}
            >
              Cancelar
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}
