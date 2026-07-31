import { useRef, useState } from "react";
import { Modal, Button, ProgressBar, Alert } from "react-bootstrap";
import { FaCamera, FaImages, FaCheck, FaTimes, FaPlus } from "react-icons/fa";
import { uploadPhoto } from "../api";

// Pasos del popup: elegir origen -> preview -> subiendo -> listo
const STEP = {
  CHOOSE: "choose",
  PREVIEW: "preview",
  UPLOADING: "uploading",
  DONE: "done",
};

export default function UploadWidget({ onUploaded }) {
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const [show, setShow] = useState(false);
  const [step, setStep] = useState(STEP.CHOOSE);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  function openModal() {
    setShow(true);
    setStep(STEP.CHOOSE);
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    setProgress(0);
  }

  function closeModal() {
    setShow(false);
  }

  function handleFileSelected(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setStep(STEP.PREVIEW);
    setError(null);
  }

  // "Cancelar" en el preview: la foto salió mal, volvemos a elegir origen
  function handleRetake() {
    setFile(null);
    setPreviewUrl(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    setStep(STEP.CHOOSE);
  }

  async function handleAccept() {
    if (!file) return;
    setStep(STEP.UPLOADING);
    setProgress(0);
    setError(null);
    try {
      const result = await uploadPhoto(file, setProgress);
      setStep(STEP.DONE);
      onUploaded?.({
        filename: result.filename,
        url: result.url,
        uploadedAt: Date.now(),
      });
      // Se cierra solo despues de mostrar el check de exito un instante
      setTimeout(() => {
        closeModal();
      }, 900);
    } catch (err) {
      setError("No se pudo subir la foto. Probá de nuevo.");
      setStep(STEP.PREVIEW);
    }
  }

  return (
    <>
      {/* Botón fijo abajo */}
      <button className="fab-subir" onClick={openModal} aria-label="Subir foto">
        <FaPlus className="me-2" />
        Subir foto
      </button>

      {/* Inputs ocultos: uno abre la cámara, el otro la galería del dispositivo */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelected}
        style={{ display: "none" }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelected}
        style={{ display: "none" }}
      />

      <Modal show={show} onHide={closeModal} centered className="modal-fiesta">
        <Modal.Header closeButton={step !== STEP.UPLOADING}>
          <Modal.Title style={{ color: "var(--rosa-fuerte)", fontWeight: 700 }}>
            {step === STEP.CHOOSE && "Compartí tu foto"}
            {step === STEP.PREVIEW && "¿La subimos?"}
            {step === STEP.UPLOADING && "Subiendo..."}
            {step === STEP.DONE && "¡Listo!"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {step === STEP.CHOOSE && (
            <div className="d-flex flex-column gap-2">
              <Button className="btn-fiesta" size="lg" onClick={() => cameraInputRef.current?.click()}>
                <FaCamera className="me-2" />
                Sacar foto
              </Button>
              <Button className="btn-plateado" size="lg" onClick={() => galleryInputRef.current?.click()}>
                <FaImages className="me-2" />
                Elegir de la galería
              </Button>
            </div>
          )}

          {(step === STEP.PREVIEW || step === STEP.UPLOADING) && previewUrl && (
            <>
              <div className="preview-wrap">
                <img src={previewUrl} alt="Vista previa" className="preview-img" />
              </div>

              {step === STEP.UPLOADING && (
                <ProgressBar
                  now={progress}
                  label={`${progress}%`}
                  animated
                  striped
                  variant="danger"
                  className="mb-2"
                  style={{ borderRadius: "999px", height: "1.1rem" }}
                />
              )}

              {error && (
                <Alert variant="danger" className="text-center py-2 mb-2">
                  {error}
                </Alert>
              )}

              {step === STEP.PREVIEW && (
                <div className="d-flex gap-2 justify-content-center mt-2">
                  <Button className="btn-fiesta" onClick={handleAccept}>
                    <FaCheck className="me-2" />
                    Subir esta foto
                  </Button>
                  <Button variant="outline-secondary" className="rounded-pill" onClick={handleRetake}>
                    <FaTimes className="me-2" />
                    Volver a sacar
                  </Button>
                </div>
              )}
            </>
          )}

          {step === STEP.DONE && (
            <div className="text-center py-3">
              <FaCheck size={42} color="var(--rosa-fuerte)" />
              <p className="mt-2 mb-0">¡Foto subida a la galería! 🎉</p>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}
