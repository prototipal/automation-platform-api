import { DataSource } from 'typeorm';
import { Service } from '@/modules/services/entities';
import {
  ServiceType,
  ServiceModel,
  ModelVersion,
} from '@/modules/services/enums';

export class ServicesSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const servicesRepository = dataSource.getRepository(Service);

    // Clear existing services to avoid conflicts
    await servicesRepository.clear();

    const servicesData = [
      {
        from: 'replicate',
        type: ServiceType.IMAGE_TO_VIDEO,
        model: ServiceModel.MINIMAX,
        model_version: ModelVersion.HAILUO_02,
        fields: {
          prompt: {
            required: true,
            type: 'string',
            desc: 'Text description for video generation',
          },
          first_frame_image: {
            required: false,
            type: 'string',
            desc: 'Optional starting image for the video',
          },
          duration: {
            required: false,
            type: 'enum',
            values: ['6', '10'],
            desc: 'Video duration in seconds',
          },
          resolution: {
            required: false,
            type: 'enum',
            values: ['512p', '768p', '1080p'],
            desc: 'Output video resolution',
          },
        },
      },
      {
        from: 'replicate',
        type: ServiceType.IMAGE_TO_VIDEO,
        model: ServiceModel.GOOGLE,
        model_version: ModelVersion.VEO_3_FAST,
        fields: {
          prompt: {
            required: true,
            type: 'string',
            desc: 'Text description for video generation',
          },
          image: {
            required: false,
            type: 'string',
            desc: 'Optional reference image',
          },
          resolution: {
            required: false,
            type: 'enum',
            values: ['720p', '1080p'],
            desc: 'Output video resolution',
          },
        },
      },
      {
        from: 'replicate',
        type: ServiceType.IMAGE_TO_VIDEO,
        model: ServiceModel.BYTEDANCE,
        model_version: ModelVersion.SEEDANCE_1_PRO,
        fields: {
          prompt: {
            required: true,
            type: 'string',
            desc: 'Text description for video generation',
          },
          image: {
            required: false,
            type: 'string',
            desc: 'Optional reference image',
          },
          duration: {
            required: false,
            type: 'enum',
            values: ['5', '10'],
            desc: 'Video duration in seconds',
          },
          resolution: {
            required: false,
            type: 'enum',
            values: ['480p', '1080p'],
            desc: 'Output video resolution',
          },
          aspect_ratio: {
            required: false,
            type: 'enum',
            values: ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9', '9:21'],
            desc: 'Video aspect ratio',
          },
          fps: {
            required: false,
            type: 'enum',
            values: ['24'],
            desc: 'Frames per second',
          },
          camera_fixed: {
            required: false,
            type: 'boolean',
            desc: 'Whether camera position is fixed',
          },
        },
      },
      {
        from: 'replicate',
        type: ServiceType.IMAGE_TO_VIDEO,
        model: ServiceModel.MINIMAX,
        model_version: ModelVersion.VIDEO_01,
        fields: {
          prompt: {
            required: true,
            type: 'string',
            desc: 'Text description for video generation',
          },
          first_frame_image: {
            required: false,
            type: 'string',
            desc: 'Optional starting image for the video',
          },
          subject_reference: {
            required: false,
            type: 'string',
            desc: 'Optional subject reference for consistency',
          },
        },
      },
      {
        from: 'replicate',
        type: ServiceType.IMAGE_TO_VIDEO,
        model: ServiceModel.KWAIGI,
        model_version: ModelVersion.KLING_V2_1,
        fields: {
          prompt: {
            required: true,
            type: 'string',
            desc: 'Text description for video generation',
          },
          start_image: {
            required: true,
            type: 'string',
            desc: 'Starting image for the video (required)',
          },
          mode: {
            required: false,
            type: 'enum',
            values: ['standard', 'pro'],
            default: 'standard',
            desc: 'Generation mode quality',
          },
          duration: {
            required: false,
            type: 'enum',
            values: ['5', '10'],
            desc: 'Video duration in seconds',
          },
        },
      },
    ];

    console.log('🌱 Seeding services...');

    for (const serviceData of servicesData) {
      const service = servicesRepository.create(serviceData as any);
      await servicesRepository.save(service);
      console.log(
        `✅ Created service: ${serviceData.model} ${serviceData.model_version}`,
      );
    }

    console.log('🎉 Services seeded successfully!');
  }
}
