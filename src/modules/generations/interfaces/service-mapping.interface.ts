import {
  ServiceModel,
  TextToImageModelVersion,
  TextToVideoModelVersion,
  ModelVersion,
} from '@/modules/services/enums';

export interface ServiceMapping {
  model: ServiceModel;
  model_version: ModelVersion;
  replicateModel: string;
  replicateVersion: string;
}

export interface ModelVersionMapping {
  [ServiceModel.GOOGLE]: {
    [TextToVideoModelVersion.VEO_3]: string;
    [TextToVideoModelVersion.VEO_3_FAST]: string;
    [TextToImageModelVersion.IMAGEN_4_FAST]: string;
    [TextToImageModelVersion.NANO_BANANA]: string;
  };
  [ServiceModel.KWAIGI]: {
    [TextToVideoModelVersion.KLING_V2_1]: string;
  };
  [ServiceModel.MINIMAX]: {
    [TextToVideoModelVersion.HAILUO_02]: string;
    [TextToVideoModelVersion.VIDEO_01]: string;
  };
  [ServiceModel.BYTEDANCE]: {
    [TextToVideoModelVersion.SEEDANCE_1_PRO]: string;
  };
  [ServiceModel.IDEOGRAM_AI]: {
    [TextToImageModelVersion.IDEOGRAM_V3_TURBO]: string;
  };
  [ServiceModel.BLACK_FOREST_LABS]: {
    [TextToImageModelVersion.FLUX_KONTEXT_MAX]: string;
  };
  [ServiceModel.WAN_VIDEO]: Record<string, never>;
  [ServiceModel.WAVESPEEDAI]: Record<string, never>;
}
