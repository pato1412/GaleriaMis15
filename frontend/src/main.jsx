import React from "react";
import ReactDOM from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "./theme.css";
import App from "./App.jsx";
import AdminPage from "./pages/AdminPage.jsx";

// Sin librería de routing: es solo una página más además de la galería,
// asi que alcanza con mirar la URL actual. El servidor tiene que devolver
// siempre index.html para que /admin funcione al entrar directo o refrescar
// (ver README, sección de deploy).
const isAdmin = window.location.pathname.replace(/\/+$/, "") === "/admin";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isAdmin ? <AdminPage /> : <App />}
  </React.StrictMode>
);
