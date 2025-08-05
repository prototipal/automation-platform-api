# Services Module Setup Guide

This guide covers the complete setup and usage of the Services module for managing AI service configurations in the NestJS automation platform.

## Overview

The Services module provides a comprehensive solution for managing AI service configurations with the following features:

- **Service Types**: `image-to-video`, `text-to-image`
- **AI Models**: Google, Kwaigi, Minimax, ByteDance, Wan-Video, WaveSpeedAI
- **Model Versions**: Various versions for each model with specific field configurations
- **JSONB Field Storage**: Flexible field specifications for each model version

## Database Setup

### 1. Run Migration

```bash
npm run migration:run
```

### 2. Seed Initial Data

```bash
npm run seed
```

This will create the following pre-configured services:

1. **Minimax Hailuo-02** - Image-to-video with prompt, first_frame_image, duration, resolution
2. **Google Veo-3-Fast** - Image-to-video with prompt, image, resolution
3. **ByteDance Seedance-1-Pro** - Image-to-video with comprehensive options
4. **Minimax Video-01** - Image-to-video with prompt, first_frame_image, subject_reference
5. **Kwaigi Kling-v2.1** - Image-to-video with prompt, start_image (required), mode, duration

## API Endpoints

### Base URL: `/services`

#### 1. Create Service
```http
POST /services
Content-Type: application/json

{
  "type": "image-to-video",
  "model": "google",
  "model_version": "veo-3",
  "fields": {
    "prompt": {
      "required": true,
      "type": "string",
      "desc": "Text description for video generation"
    },
    "duration": {
      "required": false,
      "type": "enum",
      "values": ["5", "10"],
      "desc": "Video duration in seconds"
    }
  }
}
```

#### 2. Get All Services (Paginated)
```http
GET /services?page=1&limit=10&type=image-to-video&model=google
```

#### 3. Get Service by ID
```http
GET /services/{id}
```

#### 4. Get Services by Model
```http
GET /services/model/{model}
```

#### 5. Update Service
```http
PATCH /services/{id}
Content-Type: application/json

{
  "fields": {
    "prompt": {
      "required": true,
      "type": "string",
      "desc": "Updated description"
    }
  }
}
```

#### 6. Delete Service
```http
DELETE /services/{id}
```

## Field Configuration Schema

Each service's `fields` property follows this structure:

```typescript
{
  "field_name": {
    "required": boolean,           // Whether the field is required
    "type": "string" | "enum" | "boolean",  // Field data type
    "values"?: string[],          // For enum types only
    "default"?: string | boolean, // Default value (optional)
    "desc": string               // Human-readable description
  }
}
```

### Example Field Configurations

#### String Field
```json
{
  "prompt": {
    "required": true,
    "type": "string",
    "desc": "Text description for video generation"
  }
}
```

#### Enum Field
```json
{
  "resolution": {
    "required": false,
    "type": "enum",
    "values": ["720p", "1080p", "4K"],
    "desc": "Output video resolution"
  }
}
```

#### Boolean Field
```json
{
  "camera_fixed": {
    "required": false,
    "type": "boolean",
    "default": false,
    "desc": "Whether camera position is fixed"
  }
}
```

## Model-Version Associations

The system enforces valid model-version combinations:

- **Google**: `veo-3`, `veo-3-fast`
- **Kwaigi**: `kling-v2.1`
- **Minimax**: `hailuo-02`, `video-01`
- **ByteDance**: `seedance-1-pro`
- **Wan-Video**: No specific versions
- **WaveSpeedAI**: No specific versions

## Validation Rules

### Service Creation/Update
- Model and version must be valid associations
- No duplicate model-version combinations
- Fields must follow the required schema structure
- Required fields: `type`, `model`, `fields`

### Field Schema Validation
- `required` must be boolean
- `type` must be one of: `string`, `enum`, `boolean`
- `desc` must be a non-empty string
- Enum types must include `values` array
- All field configurations must be objects

## Error Handling

The API provides comprehensive error responses:

- **400 Bad Request**: Invalid input data or field validation
- **404 Not Found**: Service not found
- **409 Conflict**: Duplicate model-version combination

## Testing

Run the test suite:

```bash
# Unit tests
npm run test

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

## Database Management

### Create New Migration
```bash
npm run migration:create -- MigrationName
```

### Revert Last Migration
```bash
npm run migration:revert
```

### Re-run Seeds
```bash
npm run seed
```

## File Structure

```
src/modules/services/
├── dto/
│   ├── create-service.dto.ts
│   ├── update-service.dto.ts
│   ├── service-response.dto.ts
│   ├── query-service.dto.ts
│   └── index.ts
├── entities/
│   ├── service.entity.ts
│   └── index.ts
├── enums/
│   ├── service-type.enum.ts
│   ├── service-model.enum.ts
│   ├── model-version.enum.ts
│   └── index.ts
├── __tests__/
│   ├── services.service.spec.ts
│   └── services.controller.spec.ts
├── services.controller.ts
├── services.service.ts
├── services.repository.ts
├── services.module.ts
└── index.ts
```

## Usage Examples

### Creating a Custom Service

```typescript
const customService = {
  type: 'text-to-image',
  model: 'google',
  model_version: null, // No version for this model
  fields: {
    prompt: {
      required: true,
      type: 'string',
      desc: 'Text prompt for image generation'
    },
    style: {
      required: false,
      type: 'enum',
      values: ['realistic', 'cartoon', 'abstract'],
      default: 'realistic',
      desc: 'Image generation style'
    },
    high_quality: {
      required: false,
      type: 'boolean',
      default: true,
      desc: 'Generate high quality image'
    }
  }
};
```

### Querying Services

```typescript
// Get all video generation services
GET /services?type=image-to-video

// Get all Google services
GET /services?model=google

// Get specific model versions
GET /services?model=minimax&model_version=hailuo-02
```

## Best Practices

1. **Always validate field schemas** before creating services
2. **Use descriptive field descriptions** for better API documentation
3. **Follow enum naming conventions** (lowercase with hyphens)
4. **Test model-version associations** before deployment
5. **Use pagination** when fetching large datasets
6. **Handle errors gracefully** in your client applications

## Troubleshooting

### Common Issues

1. **Migration fails**: Ensure PostgreSQL is running and credentials are correct
2. **Seeding fails**: Run migrations first, check database connection
3. **Validation errors**: Verify field schema structure matches requirements
4. **Model-version conflicts**: Check allowed combinations in the service class

### Debug Mode

Set `NODE_ENV=development` to enable detailed logging and error messages.