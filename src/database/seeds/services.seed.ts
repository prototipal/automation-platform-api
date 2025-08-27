import { DataSource } from 'typeorm';
import { Service } from '@/modules/services/entities';
import {
  ServiceType,
  ServiceModel,
  TextToImageModelVersion,
  TextToVideoModelVersion,
} from '@/modules/services/enums';
import { PricingType } from '@/modules/services/interfaces';

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
        model_version: TextToVideoModelVersion.HAILUO_02,
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
        pricing: {
          rule: {
            type: PricingType.CONDITIONAL,
            rules: [
              { conditions: { resolution: '512p', duration: 6 }, price: 0.1 },
              { conditions: { resolution: '512p', duration: 10 }, price: 0.15 },
              { conditions: { resolution: '768p', duration: 6 }, price: 0.27 },
              { conditions: { resolution: '768p', duration: 10 }, price: 0.45 },
              { conditions: { resolution: '1080p', duration: 6 }, price: 0.48 },
              // 1080p + 10s desteklenmiyor, bu yüzden yok
            ],
          },
        },
        logo: 'https://rnjphepcnyquyuzhaxpy.supabase.co/storage/v1/object/public/assets/logos/minimax-logo.png',
      },
      {
        from: 'replicate',
        type: ServiceType.IMAGE_TO_VIDEO,
        model: ServiceModel.GOOGLE,
        model_version: TextToVideoModelVersion.VEO_3_FAST,
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
        pricing: {
          rule: {
            type: PricingType.FIXED,
            price: 3.2,
          },
        },
        logo: 'https://rnjphepcnyquyuzhaxpy.supabase.co/storage/v1/object/public/assets/logos/google-logo.png',
      },
      {
        from: 'replicate',
        type: ServiceType.IMAGE_TO_VIDEO,
        model: ServiceModel.BYTEDANCE,
        model_version: TextToVideoModelVersion.SEEDANCE_1_PRO,
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
        pricing: {
          rule: {
            type: PricingType.PER_SECOND,
            parameter: 'resolution',
            rates: {
              '480p': 0.03,
              '1080p': 0.15,
            },
          },
        },
      },
      {
        from: 'replicate',
        type: ServiceType.IMAGE_TO_VIDEO,
        model: ServiceModel.MINIMAX,
        model_version: TextToVideoModelVersion.VIDEO_01,
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
        pricing: {
          rule: {
            type: PricingType.FIXED,
            price: 0.5,
          },
        },
        logo: 'https://rnjphepcnyquyuzhaxpy.supabase.co/storage/v1/object/public/assets/logos/minimax-logo.png',
      },
      {
        from: 'replicate',
        type: ServiceType.IMAGE_TO_VIDEO,
        model: ServiceModel.KWAIGI,
        model_version: TextToVideoModelVersion.KLING_V2_1,
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
        pricing: {
          rule: {
            type: PricingType.PER_SECOND,
            parameter: 'mode',
            rates: {
              standard: 0.05,
              pro: 0.09,
            },
          },
        },
      },
      // Yeni text-to-image servisler
      {
        from: 'replicate',
        type: ServiceType.TEXT_TO_IMAGE,
        model: ServiceModel.IDEOGRAM_AI,
        model_version: TextToImageModelVersion.IDEOGRAM_V3_TURBO,
        fields: {
          prompt: {
            required: true,
            type: 'string',
            desc: 'Text description for image generation',
          },
          aspect_ratio: {
            required: false,
            type: 'enum',
            values: ['3:2', '3:4', '4:3', '4:5', '1:1', '16:9', '9:16', '1:3'],
            desc: 'Image aspect ratio',
          },
        },
        pricing: {
          rule: {
            type: PricingType.FIXED,
            price: 0.03,
          },
        },
        logo: 'https://rnjphepcnyquyuzhaxpy.supabase.co/storage/v1/object/public/assets/logos/ideogram-logo.png',
      },
      {
        from: 'replicate',
        type: ServiceType.TEXT_TO_IMAGE,
        model: ServiceModel.GOOGLE,
        model_version: TextToImageModelVersion.IMAGEN_4_FAST,
        fields: {
          prompt: {
            required: true,
            type: 'string',
            desc: 'Text description for image generation',
          },
          aspect_ratio: {
            required: false,
            type: 'enum',
            values: ['4:3', '3:4', '16:9', '9:16', '1:1'],
            desc: 'Image aspect ratio',
          },
        },
        pricing: {
          rule: {
            type: PricingType.FIXED,
            price: 0.02,
          },
        },
        logo: 'https://rnjphepcnyquyuzhaxpy.supabase.co/storage/v1/object/public/assets/logos/google-logo.png',
      },
      {
        from: 'replicate',
        type: ServiceType.TEXT_TO_IMAGE,
        model: ServiceModel.BLACK_FOREST_LABS,
        model_version: TextToImageModelVersion.FLUX_KONTEXT_MAX,
        fields: {
          prompt: {
            required: true,
            type: 'string',
            desc: 'Text description for image generation',
          },
          input_image: {
            required: false,
            type: 'string',
            desc: 'Optional input image for context',
          },
          aspect_ratio: {
            required: false,
            type: 'enum',
            values: ['1:1', '16:9', '9:16'],
            default: 'match_input_image',
            desc: 'Image aspect ratio',
          },
        },
        pricing: {
          rule: {
            type: PricingType.FIXED,
            price: 0.08,
          },
        },
        logo: 'https://rnjphepcnyquyuzhaxpy.supabase.co/storage/v1/object/public/assets/logos/flux.png',
      },
      {
        from: 'replicate',
        type: ServiceType.TEXT_TO_IMAGE,
        model: ServiceModel.GOOGLE,
        model_version: TextToImageModelVersion.NANO_BANANA,
        fields: {
          prompt: {
            required: true,
            type: 'string',
            desc: 'Text description for image generation',
          },
          image_input: {
            required: false,
            type: 'array',
            items: 'string',
            desc: 'Optional input images',
          },
        },
        pricing: {
          rule: {
            type: PricingType.FIXED,
            price: 0.039,
          },
        },
        logo: 'https://rnjphepcnyquyuzhaxpy.supabase.co/storage/v1/object/public/assets/logos/google-logo.png',
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
