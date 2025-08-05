# Generations API Usage

## Overview

The Generations API provides video generation capabilities through integration with the Replicate API. It supports dynamic validation based on service configurations stored in the database.

## API Endpoint

```
POST /api/generations/create
```

## Features

- ✅ Dynamic field validation based on service configuration
- ✅ Support for multiple AI models (Kling, Minimax, Google Veo, etc.)
- ✅ Comprehensive error handling
- ✅ Swagger documentation
- ✅ TypeScript type safety
- ✅ Full test coverage

## Request Format

```json
{
  "model": "kwaigi",
  "model_version": "kling-v2.1",
  "input": {
    "prompt": "a woman takes her hands out her pockets and gestures to the words with both hands, she is excited, behind her it is raining",
    "start_image": "https://replicate.delivery/xezq/rfKExHkg7L2UAyYNJj3p1YrW1M3ZROTQQXupJSOyM5RkwQcKA/tmpowaafuyw.png"
  }
}
```

## Response Format

```json
{
  "id": "pred_c28lcme55c7629mcj7g6vkjzvw",
  "status": "starting",
  "input": {
    "prompt": "a woman takes her hands out her pockets and gestures to the words with both hands, she is excited, behind her it is raining",
    "start_image": "https://replicate.delivery/xezq/rfKExHkg7L2UAyYNJj3p1YrW1M3ZROTQQXupJSOyM5RkwQcKA/tmpowaafuyw.png"
  },
  "created_at": "2024-08-05T10:30:00.000Z",
  "model": "kwaivgi/kling-v2.1"
}
```

## Supported Models

### Kling (Kwaigi)
- **Model**: `kwaigi`
- **Version**: `kling-v2.1`
- **Replicate Endpoint**: `kwaivgi/kling-v2.1`

### Minimax
- **Model**: `minimax`
- **Versions**: `hailuo-02`, `video-01`
- **Replicate Endpoints**: `minimax/hailuo-02`, `minimax/video-01`

### Google Veo
- **Model**: `google`
- **Versions**: `veo-3`, `veo-3-fast`
- **Replicate Endpoints**: `google-deepmind/veo-3`, `google-deepmind/veo-3-fast`

### ByteDance
- **Model**: `bytedance`
- **Version**: `seedance-1-pro`
- **Replicate Endpoint**: `bytedance/seedance-1-pro`

## Dynamic Validation

The API validates input fields against service configurations stored in the database. Each service configuration defines:

- **Required fields**: Fields that must be provided
- **Field types**: `string`, `enum`, `boolean`
- **Enum values**: Valid options for enum fields
- **Field descriptions**: Documentation for each field

## Example Service Configuration

```json
{
  "model": "kwaigi",
  "model_version": "kling-v2.1",
  "fields": {
    "prompt": {
      "required": true,
      "type": "string",
      "desc": "Text description of the video to generate"
    },
    "start_image": {
      "required": false,
      "type": "string",
      "desc": "URL of the starting image"
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

## Error Responses

### Validation Error (400)
```json
{
  "statusCode": 400,
  "message": "Validation failed: prompt: Field 'prompt' is required; duration: Field 'duration' must be one of: 5, 10",
  "error": "Bad Request"
}
```

### Service Not Found (404)
```json
{
  "statusCode": 404,
  "message": "No service configuration found for model 'kwaigi' with version 'kling-v2.1'",
  "error": "Not Found"
}
```

### Replicate API Error (500)
```json
{
  "statusCode": 500,
  "message": "Failed to communicate with Replicate API",
  "error": "Internal Server Error"
}
```

## Usage Examples

### Basic Video Generation
```bash
curl -X POST http://localhost:3000/api/generations/create \
  -H "Content-Type: application/json" \
  -d '{
    "model": "kwaigi",
    "model_version": "kling-v2.1",
    "input": {
      "prompt": "A person walking in the rain"
    }
  }'
```

### Video Generation with Start Image
```bash
curl -X POST http://localhost:3000/api/generations/create \
  -H "Content-Type: application/json" \
  -d '{
    "model": "kwaigi",
    "model_version": "kling-v2.1",
    "input": {
      "prompt": "A person walking in the rain",
      "start_image": "https://example.com/start.jpg"
    }
  }'
```

### Using Minimax Model
```bash
curl -X POST http://localhost:3000/api/generations/create \
  -H "Content-Type: application/json" \
  -d '{
    "model": "minimax",
    "model_version": "hailuo-02",
    "input": {
      "prompt": "A beautiful sunset over mountains"
    }
  }'
```

## Environment Configuration

Make sure to set the following environment variable:

```bash
REPLICATE_API_TOKEN=your_replicate_api_token_here
```

## API Documentation

Interactive API documentation is available at:
```
http://localhost:3000/api/docs
```

## Implementation Details

### Architecture
- **Controller**: Handles HTTP requests and responses
- **Service**: Business logic and Replicate API integration
- **DTOs**: Request/response validation and documentation
- **Interfaces**: Type definitions for API responses
- **Repository Pattern**: Service configuration management through existing Services module

### Security
- ✅ Input validation and sanitization
- ✅ Proper error handling without information leakage
- ✅ Rate limiting handled by Replicate API
- ✅ Secure token management

### Performance
- ✅ HTTP timeout configuration (60 seconds)
- ✅ Efficient database queries
- ✅ Proper error handling and logging
- ✅ Optimized service mapping

### Testing
- ✅ Comprehensive unit tests for service and controller
- ✅ Mock implementations for external dependencies
- ✅ Error case coverage
- ✅ Validation testing