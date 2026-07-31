import Header from "./components/Header.jsx";
import Gallery from "./components/Gallery.jsx";
import UploadWidget from "./components/UploadWidget.jsx";
import { usePhotos } from "./hooks/usePhotos.js";

export default function App() {
  const { photos, loadingInitial, loadingMore, hasMore, loadMore, prependPhoto } = usePhotos();

  return (
    <div className="app-shell">
      <Header />

      <h2 className="gallery-title">Fotos de la fiesta</h2>

      <Gallery
        photos={photos}
        loadingInitial={loadingInitial}
        loadingMore={loadingMore}
        hasMore={hasMore}
        onLoadMore={loadMore}
      />

      <p className="footer-note">Mis 15 Delfi · {new Date().getFullYear()}</p>

      <UploadWidget onUploaded={prependPhoto} />
    </div>
  );
}
