import React, { useRef } from "react";

function bytesToMB(bytes) {
  return Math.round((bytes / (1024 * 1024)) * 100) / 100;
}

export default function ImageUploadField({
  label = "Imagen",
  value, // { dataUrl, name, type, size }
  onChange, // (newValue|null) => void
  maxMB = 1.5,
}) {
  const inputRef = useRef(null);

  async function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }

  async function handlePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type?.startsWith("image/")) {
      alert("El archivo debe ser una imagen.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const sizeMB = bytesToMB(file.size);
    if (sizeMB > maxMB) {
      alert(`La imagen pesa ${sizeMB}MB. Máximo permitido: ${maxMB}MB.`);
      if (inputRef.current) inputRef.current.value = "";
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
    if (inputRef.current) inputRef.current.value = "";
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

      <input
        ref={inputRef}
        className="np-input"
        type="file"
        accept="image/*"
        onChange={handlePick}
      />

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
