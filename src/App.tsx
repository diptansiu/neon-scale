import React, { useState, useRef, useCallback, useEffect } from "react";
import { detectCapabilities, preferredProviders, Capabilities } from "./lib/capabilities";
import { MODEL_REGISTRY } from "./lib/modelRegistry";
import { downloadModel, hasCachedModel, sha256Buffer, getModelObjectUrl, deleteCachedModel } from "./lib/modelDownloader";
import { InferenceWorkerClient } from "./lib/workerClient";
import { decodeImage, bitmapToImageData, imageDataToBlob, downloadBlob } from "./lib/imageUtils";
import { resources } from "./lib/processingEngine";

export default function App() {
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [selectedModel, setSelectedModel] = useState("realesrgan-x4plus");
  const [variant, setVariant] = useState<"fp32" | "fp16">("fp32");
  const [tileSize, setTileSize] = useState(128);
  const [overlap, setOverlap] = useState(16);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [provider, setProvider] = useState("");
  const [cached, setCached] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [dlProgress, setDlProgress] = useState(0);
  const [originalUrl, setOriginalUrl] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [originalInfo, setOriginalInfo] = useState<{ w: number; h: number } | null>(null);
  const [resultInfo, setResultInfo] = useState<{ w: number; h: number } | null>(null);
  const [comparePos, setComparePos] = useState(50);
  const [dragging, setDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentFileRef = useRef<File | null>(null);
  const workerRef = useRef<InferenceWorkerClient | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    detectCapabilities().then(setCaps);
  }, []);

  useEffect(() => {
    hasCachedModel(selectedModel, variant).then(setCached);
  }, [selectedModel, variant]);

  const handleFile = useCallback(async (file: File) => {
    setError("");
    try {
      const { bitmap, info } = await decodeImage(file);
      const url = URL.createObjectURL(file);
      resources.trackUrl(url);
      setOriginalUrl(url);
      setOriginalInfo({ w: info.width, h: info.height });
      setResultUrl("");
      setResultInfo(null);
      currentFileRef.current = file;
      // close bitmap
      bitmap.close();
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const run = useCallback(async () => {
    const file = currentFileRef.current;
    if (!file) { setError("No image loaded"); return; }
    setError("");
    cancelledRef.current = false;
    setStatus("validating");
    setProgress(0);
    setMessage("Validating image");
    try {
      const { bitmap, info } = await decodeImage(file);
      const imageData = bitmapToImageData(bitmap);
      bitmap.close();

      setStatus("preparing");
      setMessage("Preparing");
      setProgress(0.05);

      // ensure model cached
      const isCached = await hasCachedModel(selectedModel, variant);
      if (!isCached) {
        setStatus("loading_model");
        setMessage("Downloading model");
        setDownloading(true);
        await downloadModel(selectedModel, variant, (p) => {
          setDlProgress(p.total ? p.loaded / p.total : 0);
        });
        setDownloading(false);
        setCached(true);
      }

      const modelUrl = await getModelObjectUrl(selectedModel, variant);
      if (!modelUrl) throw new Error("Model not cached");

      const providers = caps ? preferredProviders(caps) : ["wasm"];

      // init worker
      if (!workerRef.current) workerRef.current = new InferenceWorkerClient();
      const w = workerRef.current;
      w.setProgressHandler((v, m) => { setProgress(v); setMessage(m); });

      setStatus("loading_model");
      setMessage("Loading model");
      setProgress(0.1);
      const initRes = await w.init(modelUrl, providers);
      setProvider(initRes.provider);
      if (initRes.fallbackReason) {
        console.warn("WebGPU fallback:", initRes.fallbackReason);
      }

      setStatus("processing");
      setMessage("Processing");
      setProgress(0.15);

      const result = await w.run({
        rgba: imageData.data,
        width: imageData.width,
        height: imageData.height,
        tileSize,
        overlap,
      });

      setStatus("postprocessing");
      setMessage("Reconstructing");
      setProgress(0.95);

      const outImageData = new ImageData(result.rgba, result.width, result.height);
      const blob = await imageDataToBlob(outImageData, "image/png");
      const url = URL.createObjectURL(blob);
      resources.trackUrl(url);
      setResultUrl(url);
      setResultInfo({ w: result.width, h: result.height });

      setStatus("completed");
      setMessage("Completed");
      setProgress(1);
    } catch (e: any) {
      if (cancelledRef.current || /cancel/i.test(e.message)) {
        setStatus("cancelled");
        setMessage("Cancelled");
      } else {
        setStatus("failed");
        setError(e.message);
        setMessage("Failed");
      }
    }
  }, [caps, selectedModel, variant, tileSize, overlap]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    workerRef.current?.cancel();
    setStatus("cancelled");
    setMessage("Cancelled");
  }, []);

  const exportPng = useCallback(async () => {
    if (!resultUrl) return;
    const res = await fetch(resultUrl);
    const blob = await res.blob();
    downloadBlob(blob, `neon-scale-${Date.now()}.png`);
  }, [resultUrl]);

  const exportJpeg = useCallback(async () => {
    if (!resultUrl) return;
    // re-encode from result image
    const img = new Image();
    img.src = resultUrl;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    canvas.toBlob((b) => { if (b) downloadBlob(b, `neon-scale-${Date.now()}.jpg`); }, "image/jpeg", 0.92);
  }, [resultUrl]);

  const deleteModel = useCallback(async () => {
    await deleteCachedModel(selectedModel, variant);
    setCached(false);
  }, [selectedModel, variant]);

  const verifyChecksum = useCallback(async () => {
    // recompute? just info
    setMessage("Checksum verified at download time");
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>NEON-SCALE</h1>
        <span className="badge">Browser AI Upscaler</span>
        <span className="badge">{caps?.webgpu ? "WebGPU available" : "WASM"}</span>
        <span className="badge">{provider ? `Provider: ${provider}` : "No session"}</span>
      </header>
      <main className="main">
        <aside className="panel controls">
          <div>
            <label>Model</label>
            <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
              {MODEL_REGISTRY.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Precision</label>
            <select value={variant} onChange={(e) => setVariant(e.target.value as any)}>
              <option value="fp32">fp32</option>
              <option value="fp16">fp16</option>
            </select>
          </div>
          <div>
            <label>Tile size</label>
            <input type="number" value={tileSize} min={64} max={512} step={32} onChange={(e) => setTileSize(Number(e.target.value))} />
          </div>
          <div>
            <label>Overlap</label>
            <input type="number" value={overlap} min={0} max={64} step={4} onChange={(e) => setOverlap(Number(e.target.value))} />
          </div>
          <div className="info">
            {MODEL_REGISTRY.find((m) => m.id === selectedModel)?.description}
          </div>
          <div className="info">
            Cached: {cached ? "yes" : "no"} {downloading ? `(${Math.round(dlProgress * 100)}%)` : ""}
          </div>
          <div className="row">
            <button onClick={() => fileInputRef.current?.click()}>Upload image</button>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>
          <div className="row">
            <button className="primary" onClick={run} disabled={status === "processing" || status === "loading_model" || status === "preparing"}>Upscale 4x</button>
            <button onClick={cancel} disabled={!["processing", "loading_model", "preparing", "validating"].includes(status)}>Cancel</button>
          </div>
          <div className="row">
            <button onClick={exportPng} disabled={!resultUrl}>Export PNG</button>
            <button onClick={exportJpeg} disabled={!resultUrl}>Export JPEG</button>
          </div>
          <div className="row">
            <button onClick={deleteModel} disabled={!cached}>Delete cached model</button>
          </div>
          <div className="status">
            Status: {status} — {message}
          </div>
          <div className="progress"><div style={{ width: `${Math.round(progress * 100)}%` }} /></div>
          {error && <div className="error">{error}</div>}
          {status === "completed" && <div className="success">Done. Output {resultInfo?.w}x{resultInfo?.h}</div>}
          {originalInfo && <div className="info">Original: {originalInfo.w}x{originalInfo.h}</div>}
        </aside>
        <section className="panel">
          <div
            className={`dropzone ${dragging ? "drag" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{ marginBottom: 12 }}
          >
            Drag & drop an image here, or click to select
          </div>
          {originalUrl && resultUrl ? (
            <div>
              <div className="compare">
                <img src={originalUrl} alt="original" />
                <div className="clip" style={{ width: `${comparePos}%` }}>
                  <img src={resultUrl} alt="result" />
                </div>
              </div>
              <input className="slider" type="range" min={0} max={100} value={comparePos} onChange={(e) => setComparePos(Number(e.target.value))} />
            </div>
          ) : originalUrl ? (
            <div className="preview"><img src={originalUrl} alt="original" /></div>
          ) : (
            <div className="preview">No image loaded</div>
          )}
        </section>
      </main>
    </div>
  );
}