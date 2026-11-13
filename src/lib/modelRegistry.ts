export type ModelState = "available" | "downloadable" | "downloading" | "loading" | "loaded" | "failed" | "planned" | "unsupported";

export interface ModelMeta {
  id: string;
  name: string;
  description: string;
  architecture: string;
  nativeScale: number;
  inputFormat: string;
  inputDimensions: string;
  outputFormat: string;
  precision: string;
  fileSize: number;
  downloadUrl: string;
  sha256: string;
  source: string;
  originalAuthor: string;
  license: string;
  attribution: string;
  supportedProviders: string[];
  status: ModelState;
  category: string;
  downloadUrlFp16?: string;
  sha256Fp16?: string;
  fileSizeFp16?: number;
}

export const MODEL_REGISTRY: ModelMeta[] = [
  {
    id: "realesrgan-x4plus",
    name: "Real-ESRGAN x4plus",
    description: "General photography super-resolution. RRDBNet, 23 blocks. Native 4x.",
    architecture: "RRDBNet (Real-ESRGAN)",
    nativeScale: 4,
    inputFormat: "RGB float32 NCHW, range [0,1]",
    inputDimensions: "dynamic H/W",
    outputFormat: "RGB float32 NCHW, range [0,1]",
    precision: "fp32 (fp16 variant available)",
    fileSize: 67051650,
    downloadUrl: "https://huggingface.co/skillsafe-ai/realesrgan-x4plus/resolve/main/model.onnx",
    sha256: "4851ec156207d271f5328605d0582eeb851e656227da8aca093ced9e60789291",
    source: "https://huggingface.co/skillsafe-ai/realesrgan-x4plus",
    originalAuthor: "Xintao Wang (Real-ESRGAN)",
    license: "BSD-3-Clause",
    attribution: "Real-ESRGAN RealESRGAN_x4plus weights and RRDBNet architecture: Copyright (c) 2021, Xintao Wang. BSD 3-Clause License.",
    supportedProviders: ["webgpu", "wasm"],
    status: "downloadable",
    category: "General photography",
    downloadUrlFp16: "https://huggingface.co/skillsafe-ai/realesrgan-x4plus/resolve/main/model_fp16.onnx",
    sha256Fp16: "38fe853c9cd8e1d6fd0ff387f2d43c51c1352feb9d7b3e2533d4c07b1b932f68",
    fileSizeFp16: 33754617,
  },
];

export interface CloudModel {
  id: string;
  name: string;
  provider: string;
  architecture: string;
  nativeScale: number;
  description: string;
  license: string;
  status: "available" | "blocked" | "planned";
  blockReason?: string;
}

export const CLOUD_MODELS: CloudModel[] = [
  {
    id: "cloud-realesrgan-x4",
    name: "Real-ESRGAN x4 (Cloud)",
    provider: "Hugging Face (free tier)",
    architecture: "RRDBNet",
    nativeScale: 4,
    description: "Remote inference via free Hugging Face endpoint. Requires backend proxy for secure credentials.",
    license: "BSD-3-Clause (weights)",
    status: "blocked",
    blockReason: "No secure backend proxy available; free-tier quota and CORS unverified. Local mode fully functional.",
  },
];

export function getModel(id: string): ModelMeta | undefined {
  return MODEL_REGISTRY.find((m) => m.id === id);
}

export function validateModelMeta(m: ModelMeta): string[] {
  const errors: string[] = [];
  const required: (keyof ModelMeta)[] = ["id", "name", "description", "architecture", "nativeScale", "inputFormat", "outputFormat", "precision", "fileSize", "downloadUrl", "sha256", "source", "originalAuthor", "license", "attribution", "supportedProviders", "status", "category"];
  for (const k of required) {
    if (m[k] === undefined || m[k] === null || m[k] === "") errors.push(`missing ${String(k)}`);
  }
  if (typeof m.nativeScale !== "number" || m.nativeScale < 1) errors.push("invalid nativeScale");
  if (typeof m.fileSize !== "number" || m.fileSize <= 0) errors.push("invalid fileSize");
  if (!/^https?:\/\//.test(m.downloadUrl)) errors.push("invalid downloadUrl");
  if (!/^[0-9a-f]{64}$/i.test(m.sha256)) errors.push("invalid sha256");
  return errors;
}