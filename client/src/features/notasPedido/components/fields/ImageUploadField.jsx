import React, { useRef } from "react";

function bytesToMB(bytes) {
  return Math.round((bytes / (1024 * 1024)) * 100) / 100;
}

export default function ImageUploadField({
  label = "Imagen",
  value, // { dataUrl, name, type, size }
  onChange, // (newValue|null) => void
  maxMB = 1.5,
  capture,
}) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  async function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }

  function resetInputs() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  async function handlePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type?.startsWith("image/")) {
      alert("El archivo debe ser una imagen.");
      resetInputs();
      return;
    }

    const sizeMB = bytesToMB(file.size);
    if (sizeMB > maxMB) {
      alert(`La imagen pesa ${sizeMB}MB. Máximo permitido: ${maxMB}MB.`);
      resetInputs();
      return;
    }

    const dataUrl = await fileToDataUrl(file);

    onChange({
      dataUrl,
      name: file.name,
      type: file.type,
      size: file.size,
      updatedAt: new Date().toISOString(),
    });
  }

  function clear() {
    onChange(null);
    resetInputs();
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <label style={{ fontSize: 12, color: "#666" }}>{label}</label>

        {value?.dataUrl ? (
          <button type="button" className="np-linkdanger" onClick={clear} style={{ height: 32 }}>
            Quitar
          </button>
        ) : null}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button
          type="button"
          className="np-btn"
          onClick={() => cameraInputRef.current?.click()}
          style={{ minHeight: 42, padding: "0 14px" }}
        >
          Sacar foto
        </button>

        <button
          type="button"
          className="np-btn-secondary"
          onClick={() => fileInputRef.current?.click()}
          style={{ minHeight: 42, padding: "0 14px" }}
        >
          Elegir imagen
        </button>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture={capture}
        onChange={handlePick}
        style={{ display: "none" }}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePick}
        style={{ display: "none" }}
      />

      <div style={{ fontSize: 12, color: "#666" }}>
        Podes sacar una foto en el momento o subir una imagen ya guardada. Maximo: {maxMB}MB.
      </div>

      {value?.dataUrl ? (
        <div style={{ display: "grid", gap: 6 }}>
          <img
            src={value.dataUrl}
            alt="Adjunto"
            style={{
              width: "100%",
              maxHeight: 220,
              objectFit: "contain",
              border: "1px solid #e6e6e6",
              borderRadius: 10,
              background: "#fff",
            }}
          />
          <div style={{ fontSize: 12, color: "#666" }}>
            {value.name} · {bytesToMB(value.size)}MB
          </div>
        </div>
      ) : null}
    </div>
  );
}
