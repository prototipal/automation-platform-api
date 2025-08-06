// Text-to-Image Model Versions
export enum TextToImageModelVersion {
  IDEOGRAM_V3_TURBO = 'ideogram-v3-turbo',
  IMAGEN_4_FAST = 'imagen-4-fast',
  FLUX_KONTEXT_MAX = 'flux-kontext-max',
}

// Text-to-Video Model Versions
export enum TextToVideoModelVersion {
  HAILUO_02 = 'hailuo-02',
  VEO_3_FAST = 'veo-3-fast',
  SEEDANCE_1_PRO = 'seedance-1-pro',
  VEO_3 = 'veo-3',
  VIDEO_01 = 'video-01',
  KLING_V2_1 = 'kling-v2.1',
}

// Union type for all model versions
export type ModelVersion = TextToImageModelVersion | TextToVideoModelVersion;
