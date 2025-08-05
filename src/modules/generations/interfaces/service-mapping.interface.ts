import { ServiceModel, ModelVersion } from '@/modules/services/enums';

export interface ServiceMapping {
  model: ServiceModel;
  model_version: ModelVersion;
  replicateModel: string;
  replicateVersion: string;
}

export interface ModelVersionMapping {
  [ServiceModel.GOOGLE]: {
    [ModelVersion.VEO_3]: string;
    [ModelVersion.VEO_3_FAST]: string;
  };
  [ServiceModel.KWAIGI]: {
    [ModelVersion.KLING_V2_1]: string;
  };
  [ServiceModel.MINIMAX]: {
    [ModelVersion.HAILUO_02]: string;
    [ModelVersion.VIDEO_01]: string;
  };
  [ServiceModel.BYTEDANCE]: {
    [ModelVersion.SEEDANCE_1_PRO]: string;
  };
  [ServiceModel.WAN_VIDEO]: Record<string, never>;
  [ServiceModel.WAVESPEEDAI]: Record<string, never>;
}