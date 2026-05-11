import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import FormularioClientes from "./pages/FormularioClientes.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <FormularioClientes defaultBranch="independencia" />
  </StrictMode>
);
