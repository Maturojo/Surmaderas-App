import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import PanelSucursal from "./pages/PanelSucursal.jsx";
import "./panel-sucursal.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <PanelSucursal branch="independencia" />
  </StrictMode>
);
