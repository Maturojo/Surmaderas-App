import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Productos() {
  const navigate = useNavigate();

  useEffect(() => {
    const confirmed = window.confirm("¿Quieres ir a la pagina de productos?");
    if (confirmed) {
      window.location.href = "https://precios-seven.vercel.app/";
      return;
    }

    navigate("/dashboard", { replace: true });
  }, [navigate]);

  return (
    <div className="rounded-[20px] border border-[var(--sm-line)] bg-white p-6 text-center text-[#5b5249]">
      Preparando acceso a Productos...
      <div className="mt-3">
        <a
          href="https://precios-seven.vercel.app/"
          className="font-bold text-[#3b3026] underline"
          target="_self"
          rel="noreferrer"
        >
          Abrir precios-seven.vercel.app
        </a>
      </div>
    </div>
  );
}
