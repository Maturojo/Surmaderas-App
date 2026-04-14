import React, { useEffect, useRef, useState } from "react";

function bytesToMB(bytes) {
  return Math.round((bytes / (1024 * 1024)) * 100) / 100;
}

export default function CameraImageUploadField({
  label = "Imagen",
  value,
  onChange,
  maxMB = 1.5,
  capture = "environment",
}) {
  const fileInputRef = useRef(null);
  const fallbackCameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [pasteFeedback, setPasteFeedback] = useState("");

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
    if (fallbackCameraInputRef.current) fallbackCameraInputRef.current.value = "";
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraReady(false);
  }

  async function commitFile(file) {
    if (!file.type?.startsWith("image/")) {
      alert("El archivo debe ser una imagen.");
      resetInputs();
      return false;
    }

    const sizeMB = bytesToMB(file.size);
    if (sizeMB > maxMB) {
      alert(`La imagen pesa ${sizeMB}MB. Maximo permitido: ${maxMB}MB.`);
      resetInputs();
      return false;
    }

    const dataUrl = await fileToDataUrl(file);

    onChange({
      dataUrl,
      name: file.name,
      type: file.type,
      size: file.size,
      updatedAt: new Date().toISOString(),
    });

    return true;
  }

  async function handlePick(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    await commitFile(file);
  }

  async function handlePaste(event) {
    const clipboardItems = Array.from(event.clipboardData?.items || []);
    const imageItem = clipboardItems.find((item) => item.type?.startsWith("image/"));
    if (!imageItem) return;

    event.preventDefault();
    const file = imageItem.getAsFile();
    if (!file) {
      setPasteFeedback("No se pudo leer la imagen pegada.");
      return;
    }

    const saved = await commitFile(file);
    setPasteFeedback(saved ? "Imagen pegada desde el portapapeles." : "");
  }

  async function openCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      fallbackCameraInputRef.current?.click();
      return;
    }

    try {
      stopCamera();
      setCameraError("");
      setCameraOpen(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: capture === "environment" ? { ideal: "environment" } : "user" },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch {
      setCameraOpen(false);
      setCameraError("No se pudo abrir la camara. Revisa permisos o usa Elegir imagen.");
    }
  }

  async function takePhoto() {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("No se pudo procesar la foto.");
      return;
    }

    context.drawImage(video, 0, 0, width, height);

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!blob) {
      setCameraError("No se pudo generar la foto.");
      return;
    }

    const file = new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" });
    const saved = await commitFile(file);

    if (saved) {
      setCameraOpen(false);
      stopCamera();
    }
  }

  function closeCamera() {
    setCameraOpen(false);
    setCameraError("");
    stopCamera();
  }

  function clear() {
    onChange(null);
    resetInputs();
    setPasteFeedback("");
  }

  useEffect(() => () => stopCamera(), []);
  useEffect(() => {
    if (!pasteFeedback) return undefined;
    const timeoutId = window.setTimeout(() => setPasteFeedback(""), 2400);
    return () => window.clearTimeout(timeoutId);
  }, [pasteFeedback]);

  return (
    <div style={{ display: "grid", gap: 8 }} onPaste={handlePaste}>
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
          onClick={openCamera}
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
        ref={fallbackCameraInputRef}
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
        Podes sacar una foto, subir una imagen o pegarla con Ctrl+V. Maximo: {maxMB}MB.
      </div>

      {pasteFeedback ? <div style={{ fontSize: 12, color: "#4f6b42" }}>{pasteFeedback}</div> : null}
      {cameraError ? <div style={{ fontSize: 12, color: "#b14040" }}>{cameraError}</div> : null}

      {cameraOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            background: "rgba(24, 21, 18, 0.72)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              width: "min(720px, 100%)",
              background: "#fff",
              borderRadius: 24,
              padding: 18,
              display: "grid",
              gap: 14,
              boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#2a241d" }}>Camara</div>
                <div style={{ marginTop: 4, fontSize: 13, color: "#6f655a" }}>
                  Acomoda la foto y toca capturar.
                </div>
              </div>
              <button type="button" className="np-btn-secondary" onClick={closeCamera}>
                Cerrar
              </button>
            </div>

            <div
              style={{
                borderRadius: 18,
                overflow: "hidden",
                background: "#111",
                minHeight: 260,
                display: "grid",
                placeItems: "center",
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={() => setCameraReady(true)}
                style={{ width: "100%", display: "block" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
              <button type="button" className="np-btn-secondary" onClick={closeCamera}>
                Cancelar
              </button>
              <button
                type="button"
                className="np-btn"
                onClick={takePhoto}
                disabled={!cameraReady}
                style={{ opacity: cameraReady ? 1 : 0.7 }}
              >
                Capturar foto
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
            {value.name} - {bytesToMB(value.size)}MB
          </div>
        </div>
      ) : null}
    </div>
  );
}
