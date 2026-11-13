import React, { useState, useRef, useCallback, useEffect } from "react";
import { detectCapabilities, preferredProviders, Capabilities } from "./lib/capabilities";
import { MODEL_REGISTRY, CLOUD_MODELS, CloudModel } from "./lib/modelRegistry";
import { downloadModel, hasCachedModel, getModelObjectUrl, deleteCachedModel } from "./lib/modelDownloader";
import { InferenceWorkerClient } from "./lib/workerClient";
import { decodeImage, bitmapToImageData, imageDataToBlob, downloadBlob } from "./lib/imageUtils";
import { resources } from "./lib/processingEngine";

export default function App() {
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [selectedModel] = useState("realesrgan-x4plus");
  const [variant] = useState<"fp32" | "fp16">("fp32");
  const [mode, setMode] = useState<"local" | "cloud">(() => (localStorage.getItem("neon-mode") as "local" | "cloud") || "local");
  const [cloudModel, setCloudModel] = useState<CloudModel>(CLOUD_MODELS[0]);
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupModelName, setPopupModelName] = useState("");
  const [consentGiven, setConsentGiven] = useState(() => localStorage.getItem("neon-cloud-consent") === "1");
  const [showConsent, setShowConsent] = useState(false);
  const [scale, setScale] = useState<2 | 4 | 8>(4);
  const [format, setFormat] = useState<"png" | "jpeg">("png");
  const [jpegQuality, setJpegQuality] = useState(92);
  const [transparentBg, setTransparentBg] = useState<"white" | "black">("white");
  const [tileSize] = useState(128);
  const [overlap] = useState(16);

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
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [comparePos, setComparePos] = useState(50);
  const [dragging, setDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentFileRef = useRef<File | null>(null);
  const workerRef = useRef<InferenceWorkerClient | null>(null);
  const cancelledRef = useRef(false);
  const jobIdRef = useRef(0);

  useEffect(() => {
    detectCapabilities().then(setCaps);
  }, []);

  useEffect(() => {
    hasCachedModel(selectedModel, variant).then(setCached);
  }, [selectedModel, variant]);

  useEffect(() => {
    localStorage.setItem("neon-mode", mode);
  }, [mode]);

  useEffect(() => {
    if (!popupOpen) return;
    const t = setTimeout(() => setPopupOpen(false), 4000);
    return () => clearTimeout(t);
  }, [popupOpen]);

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
      bitmap.close();
    } catch (e: any) {
      setError(e.message || "Invalid image");
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
    if (mode === "cloud") { setError("Cloud inference is not available: no verified free endpoint configured."); return; }
    if (scale !== 4) { setError("Only 4× AI upscaling is supported by the loaded model."); return; }
    setError("");
    cancelledRef.current = false;
    const thisJob = ++jobIdRef.current;
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

      if (!workerRef.current) workerRef.current = new InferenceWorkerClient();
      const w = workerRef.current;
      w.setProgressHandler((v, m) => { setProgress(v); setMessage(m); });

      setStatus("loading_model");
      setMessage("Loading model");
      setProgress(0.1);
      const initRes = await w.init(modelUrl, providers);
      setProvider(initRes.provider);

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
      setElapsedMs(result.elapsedMs ?? null);

      setStatus("postprocessing");
      setMessage("Reconstructing");
      setProgress(0.95);

      const outImageData = new ImageData(result.rgba, result.width, result.height);
      const blob = await imageDataToBlob(outImageData, "image/png");
      if (thisJob !== jobIdRef.current) return; // stale job
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
  }, [caps, selectedModel, variant, scale, tileSize, overlap]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    workerRef.current?.cancel();
    setStatus("cancelled");
    setMessage("Cancelled");
  }, []);

  const exportFile = useCallback(async () => {
    if (!resultUrl) return;
    if (format === "png") {
      const res = await fetch(resultUrl);
      const blob = await res.blob();
      downloadBlob(blob, `neon-scale-${Date.now()}.png`);
    } else {
      const img = new Image();
      img.src = resultUrl;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      if (transparentBg === "white") {
        ctx.fillStyle = "#ffffff";
      } else {
        ctx.fillStyle = "#000000";
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((b) => { if (b) downloadBlob(b, `neon-scale-${Date.now()}.jpg`); }, "image/jpeg", jpegQuality / 100);
    }
  }, [resultUrl, format, transparentBg, jpegQuality]);

  const deleteModel = useCallback(async () => {
    await deleteCachedModel(selectedModel, variant);
    setCached(false);
  }, [selectedModel, variant]);

  const predictedW = originalInfo ? originalInfo.w * 4 : 0;
  const predictedH = originalInfo ? originalInfo.h * 4 : 0;

  const busy = status === "processing" || status === "loading_model" || status === "preparing" || status === "validating";

  return (
    <div className="app">
      <header className="header">
        <div style={{ display: "flex", alignItems: "baseline", gap: 0 }}>
          <span className="brand">
            <span className="neon">NEON</span><span className="slash">//</span><span className="scale">SCALE</span>
          </span>
          <span className="brand-sub">LOCAL IMAGE ENLARGER / v1.0.0</span>
        </div>
        <div className="header-right">
          <span><span className={`status-dot ${provider ? "ok" : "off"}`} />{provider ? provider.toUpperCase() : "NO PROVIDER"}</span>
          <span><span className={`status-dot ${cached ? "ok" : "warn"}`} />{cached ? "MODEL CACHED" : "AWAITING INPUT"}</span>
        </div>
      </header>

      <main>
        <div className="container">
          {/* Hero */}
          <section className="hero">
            <div className="eyebrow">BROWSER-ONLY / PRIVATE BY DESIGN</div>
            <h1>SCALE THE SIGNAL.</h1>
            <p>Enlarge one image with AI super-resolution. Your file stays inside this tab — nothing leaves your device.</p>
            <p>A precision utility for stills, sprites, and screen captures. No account. No queue. No cloud.</p>
            <div className="note">
              <span className="icon">◆</span>
              <span>INPUT IS PROCESSED LOCALLY</span>
            </div>
          </section>

          {/* Mode selector */}
          <section className="section" style={{ paddingTop: 24, paddingBottom: 24 }}>
            <div className="section-head">
              <span className="section-num">MODE</span>
              <span className="section-title">PROCESSING MODE</span>
            </div>
            <div className="format-grid">
              <button
                className={`format-btn ${mode === "local" ? "active" : ""}`}
                onClick={() => { setMode("local"); setPopupModelName("Real-ESRGAN x4plus"); setPopupOpen(true); }}
              >
                <span className="fmt-name">LOCAL AI</span>
                <span className="fmt-sub">ON-DEVICE · PRIVATE</span>
              </button>
              <button
                className={`format-btn ${mode === "cloud" ? "active" : ""}`}
                onClick={() => {
                  setMode("cloud");
                  setPopupModelName(cloudModel.name);
                  setPopupOpen(true);
                  if (!consentGiven) setShowConsent(true);
                }}
              >
                <span className="fmt-name">CLOUD AI</span>
                <span className="fmt-sub">REMOTE · {cloudModel.status.toUpperCase()}</span>
              </button>
            </div>
            {mode === "cloud" && (
              <div className="msg info" style={{ marginTop: 12 }}>
                Cloud mode: {cloudModel.blockReason || "Remote inference not yet available."}
              </div>
            )}
          </section>

          {/* 01 Input signal */}
          <section className="section">
            <div className="section-head">
              <span className="section-num">01</span>
              <span className="section-title">INPUT SIGNAL</span>
            </div>
            <div className="grid-2">
              <div className="stack">
                <div
                  className={`dropzone ${dragging ? "drag" : ""}`}
                  role="button"
                  tabIndex={0}
                  aria-label="Drop an image here or choose a file"
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="label">Drop an image here or choose a file</div>
                  <div className="sub">JPG / JPEG / PNG / WEBP · LOCAL ONLY</div>
                  <button className="btn-choose" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                    CHOOSE FILE
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                {originalUrl && (
                  <div>
                    <img src={originalUrl} alt="original" className="selected-img" />
                    <div className="info-row">
                      <span>ORIGINAL <strong>{originalInfo?.w} × {originalInfo?.h}</strong></span>
                      <button className="btn-ghost" onClick={() => { setOriginalUrl(""); setOriginalInfo(null); currentFileRef.current = null; setResultUrl(""); setResultInfo(null); }}>CLEAR</button>
                    </div>
                  </div>
                )}
                {error && <div className="msg err">{error}</div>}
                {downloading && <div className="msg info">Downloading model… {Math.round(dlProgress * 100)}%</div>}
              </div>

              {/* 02 Scale protocol */}
              <div className="stack">
                <div className="section-head" style={{ marginBottom: 12 }}>
                  <span className="section-num">02</span>
                  <span className="section-title">SCALE PROTOCOL</span>
                </div>
                <div className="scale-grid">
                  {([2, 4, 8] as const).map((s) => (
                    <button
                      key={s}
                      className={`scale-btn ${scale === s ? "active" : ""}`}
                      onClick={() => setScale(s)}
                      disabled={s !== 4}
                      title={s !== 4 ? "Not available (model is 4×)" : "4× AI upscaling"}
                    >
                      <span className="scale-num">{s}×</span>
                      <span className="scale-sub">{s === 4 ? "AI NATIVE" : "PLANNED"}</span>
                    </button>
                  ))}
                </div>

                <div style={{ marginTop: 16 }}>
                  <div className="eyebrow" style={{ marginBottom: 8 }}>OUTPUT FORMAT</div>
                  <div className="format-grid">
                    <button className={`format-btn ${format === "png" ? "active" : ""}`} onClick={() => setFormat("png")}>
                      <span className="fmt-name">PNG</span>
                      <span className="fmt-sub">LOSSLESS</span>
                    </button>
                    <button className={`format-btn ${format === "jpeg" ? "active" : ""}`} onClick={() => setFormat("jpeg")}>
                      <span className="fmt-name">JPEG</span>
                      <span className="fmt-sub">COMPACT</span>
                    </button>
                  </div>
                </div>

                {format === "jpeg" && (
                  <div style={{ marginTop: 12 }}>
                    <div className="eyebrow" style={{ marginBottom: 8 }}>JPEG QUALITY</div>
                    <div className="range-row">
                      <input type="range" min={60} max={100} value={jpegQuality} onChange={(e) => setJpegQuality(Number(e.target.value))} />
                      <span className="range-val">{jpegQuality}</span>
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 12 }}>
                  <div className="eyebrow" style={{ marginBottom: 8 }}>TRANSPARENT AREAS</div>
                  <div className="tbg-grid">
                    <button className={`tbg-btn ${transparentBg === "white" ? "active" : ""}`} onClick={() => setTransparentBg("white")}>
                      <span style={{ width: 12, height: 12, background: "#fff", border: "0.8px solid var(--border)" }} />
                      WHITE
                    </button>
                    <button className={`tbg-btn ${transparentBg === "black" ? "active" : ""}`} onClick={() => setTransparentBg("black")}>
                      <span style={{ width: 12, height: 12, background: "#000", border: "0.8px solid var(--border)" }} />
                      BLACK
                    </button>
                  </div>
                </div>

                {originalInfo && (
                  <div className="pred">
                    PREDICTED OUTPUT: <strong>{predictedW} × {predictedH}</strong>
                  </div>
                )}

                <button className="btn-upscale" onClick={run} disabled={busy || !originalUrl}>
                  {busy ? "PROCESSING…" : "UPSCALE IMAGE"}
                </button>

                <div className="progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${Math.round(progress * 100)}%` }} /></div>
                {message && <div className="msg info">{status.toUpperCase()} — {message}</div>}
                {status === "completed" && <div className="msg ok">COMPLETE · {resultInfo?.w} × {resultInfo?.h}{elapsedMs ? ` · ${elapsedMs}ms` : ""}</div>}

                {/* Technical status */}
                <div className="card-soft" style={{ marginTop: 16 }}>
                  <div className="eyebrow" style={{ marginBottom: 8 }}>TECHNICAL STATUS</div>
                  <div className="tech-grid">
                    <div className="tech-row"><span className="tech-key">Engine</span><span className="tech-val ok">ONNX Runtime Web</span></div>
                    <div className="tech-row"><span className="tech-key">Worker</span><span className="tech-val ok">{caps?.webWorker ? "AVAILABLE" : "NONE"}</span></div>
                    <div className="tech-row"><span className="tech-key">WASM</span><span className="tech-val ok">{caps?.wasm ? "AVAILABLE" : "NONE"}</span></div>
                    <div className="tech-row"><span className="tech-key">WebGPU</span><span className={`tech-val ${provider === "webgpu" ? "ok" : "off"}`}>{caps?.webgpu ? "AVAILABLE" : "NONE"}</span></div>
                    <div className="tech-row"><span className="tech-key">Model</span><span className="tech-val">{cached ? "REAL-ESRGAN X4" : "NOT CACHED"}</span></div>
                    <div className="tech-row"><span className="tech-key">Provider</span><span className={`tech-val ${provider ? "ok" : "off"}`}>{provider ? provider.toUpperCase() : "—"}</span></div>
                    <div className="tech-row"><span className="tech-key">Status</span><span className={`tech-val ${status === "completed" ? "ok" : status === "failed" ? "warn" : ""}`}>{status.toUpperCase()}</span></div>
                    <div className="tech-row"><span className="tech-key">Scale</span><span className="tech-val">4×</span></div>
                  </div>
                  <div className="row" style={{ marginTop: 12 }}>
                    <button className="btn-ghost" onClick={cancel} disabled={!busy}>CANCEL</button>
                    <button className="btn-ghost" onClick={deleteModel} disabled={!cached}>DELETE MODEL</button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 03 Inspection bay */}
          <section className="section">
            <div className="section-head">
              <span className="section-num">03</span>
              <span className="section-title">INSPECTION BAY</span>
            </div>
            <div className="bay">
              {!resultUrl ? (
                <div className="empty-state">
                  {status === "processing" || status === "loading_model" ? "PROCESSING IMAGE…" : "INSPECTION BAY STANDBY\nNO OUTPUT YET"}
                </div>
              ) : (
                <div>
                  <div className="compare-wrap">
                    <img src={originalUrl} alt="original" />
                    <div className="clip" style={{ width: `${comparePos}%` }}>
                      <img src={resultUrl} alt="result" />
                    </div>
                  </div>
                  <input className="slider" type="range" min={0} max={100} value={comparePos} onChange={(e) => setComparePos(Number(e.target.value))} />
                  <div className="info-row">
                    <span>ORIGINAL <strong>{originalInfo?.w} × {originalInfo?.h}</strong></span>
                    <span>OUTPUT <strong>{resultInfo?.w} × {resultInfo?.h}</strong></span>
                    <span>SCALE <strong>4×</strong></span>
                  </div>
                  <div className="dl-row">
                    <button className="btn-dl" onClick={exportFile} disabled={!resultUrl}>
                      DOWNLOAD {format.toUpperCase()}
                    </button>
                  </div>
                </div>
              )}
              {!resultUrl && originalUrl && (
                <div style={{ marginTop: 16 }}>
                  <div className="img-frame">
                    <img src={originalUrl} alt="original" />
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      {/* Model info popup */}
      {popupOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed", inset: 0, background: "rgba(1,6,9,0.7)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
          }}
          onClick={() => setPopupOpen(false)}
          onKeyDown={(e) => { if (e.key === "Escape") setPopupOpen(false); }}
        >
          <div
            className="card"
            style={{ maxWidth: 480, width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="section-head" style={{ marginBottom: 12 }}>
              <span className="section-num">INFO</span>
              <span className="section-title">MODEL INFORMATION</span>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, letterSpacing: 1, color: "var(--text)", marginBottom: 8 }}>
              {popupModelName}
            </div>
            <div className="tech-grid">
              <div className="tech-row"><span className="tech-key">Mode</span><span className="tech-val">{mode.toUpperCase()}</span></div>
              <div className="tech-row"><span className="tech-key">Scale</span><span className="tech-val">4×</span></div>
              <div className="tech-row"><span className="tech-key">License</span><span className="tech-val">BSD-3-CLAUSE</span></div>
              <div className="tech-row"><span className="tech-key">Engine</span><span className="tech-val">ONNX RUNTIME WEB</span></div>
            </div>
            <div className="msg info" style={{ marginTop: 12 }}>
              {mode === "local"
                ? "Local AI runs entirely in your browser. No data leaves your device."
                : "Cloud mode requires a remote provider. Currently blocked pending a verified free endpoint."}
            </div>
            <div className="row" style={{ marginTop: 16, justifyContent: "flex-end" }}>
              <button className="btn-ghost" onClick={() => setPopupOpen(false)}>CLOSE</button>
            </div>
          </div>
        </div>
      )}

      {/* Consent dialog */}
      {showConsent && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed", inset: 0, background: "rgba(1,6,9,0.8)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16,
          }}
        >
          <div className="card" style={{ maxWidth: 480, width: "100%" }}>
            <div className="section-head" style={{ marginBottom: 12 }}>
              <span className="section-num">CONSENT</span>
              <span className="section-title">CLOUD PROCESSING DISCLOSURE</span>
            </div>
            <div className="msg info">
              Cloud mode uploads your image to a remote provider for processing. The provider may store the image temporarily. Local processing is fully private. Confirm to enable cloud mode.
            </div>
            <div className="row" style={{ marginTop: 16, justifyContent: "flex-end" }}>
              <button className="btn-ghost" onClick={() => { setShowConsent(false); setMode("local"); }}>CANCEL</button>
              <button className="btn-choose" onClick={() => { setConsentGiven(true); localStorage.setItem("neon-cloud-consent", "1"); setShowConsent(false); }}>I UNDERSTAND</button>
            </div>
          </div>
        </div>
      )}

      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer-row">
            <span>NOTHING IS SENT TO A SERVER</span>
            <span>SUPPORTED: JPG / JPEG / PNG / WEBP</span>
          </div>
        </div>
      </footer>
    </div>
  );
}