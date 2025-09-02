# Replicate Webhook System Testing Guide

## Overview
This guide explains how to test the newly implemented Replicate webhook system for handling video generation callbacks.

## Environment Variables

Add these environment variables to your `.env` file:

```env
# Required for webhook functionality
WEBHOOK_BASE_URL=https://your-domain.com/api  # Your API base URL
REPLICATE_WEBHOOK_SECRET=your_webhook_secret_here  # Optional: for signature verification

# Existing required variables
REPLICATE_API_TOKEN=your_replicate_token
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Webhook Endpoints

### Main Webhook Endpoint
- **URL**: `POST /api/webhooks/replicate`
- **Purpose**: Handles video generation completion callbacks from Replicate
- **Headers**: 
  - `replicate-signature` (optional): HMAC signature for verification
  - `replicate-timestamp` (optional): Unix timestamp
  - `Content-Type: application/json`

### Test Endpoint
- **URL**: `POST /api/webhooks/replicate/test`
- **Purpose**: Development endpoint to test webhook payload structure
- **Authentication**: None (public endpoint)

## Video Models Supported

The webhook system handles these video models:
- `KLING_V2_1` (kwaivgi/kling-v2.1)
- `HAILUO_02` (minimax/hailuo-02)
- `VIDEO_01` (minimax/video-01)
- `SEEDANCE_1_PRO` (bytedance/seedance-1-pro)
- `VEO_3` (google-deepmind/veo-3)
- `VEO_3_FAST` (google-deepmind/veo-3-fast)

## How It Works

1. **Video Generation Request**: When a video model is requested via the API, the system:
   - Deducts credits upfront
   - Adds webhook URL to Replicate API call
   - Saves generation with "processing" status
   - Returns response immediately

2. **Webhook Processing**: When Replicate completes the generation:
   - Webhook receives the callback
   - Verifies signature (if configured)
   - Downloads and uploads video files to Supabase
   - Updates generation status to "completed" or "failed"
   - Refunds credits if generation failed

## Testing Steps

### 1. Test the Webhook Endpoint (Development)

```bash
curl -X POST http://localhost:3000/api/webhooks/replicate/test \
  -H "Content-Type: application/json" \
  -H "replicate-signature: test-signature" \
  -H "replicate-timestamp: 1705123456" \
  -d '{
    "id": "test-prediction-123",
    "model": "bytedance/seedance-1-pro",
    "status": "succeeded",
    "output": ["https://replicate.delivery/test-video.mp4"],
    "created_at": "2025-01-15T10:30:00.000Z",
    "completed_at": "2025-01-15T10:32:00.000Z"
  }'
```

### 2. Create a Video Generation

```bash
curl -X POST http://localhost:3000/api/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "model": "BYTEDANCE",
    "model_version": "SEEDANCE_1_PRO",
    "session_id": 1,
    "input": {
      "prompt": "A beautiful sunset over mountains",
      "duration": 5
    }
  }'
```

### 3. Simulate Webhook Callback

```bash
curl -X POST http://localhost:3000/api/webhooks/replicate \
  -H "Content-Type: application/json" \
  -d '{
    "id": "your-replicate-prediction-id",
    "model": "bytedance/seedance-1-pro",
    "version": "latest",
    "status": "succeeded",
    "input": {
      "prompt": "A beautiful sunset over mountains",
      "duration": 5
    },
    "output": [
      "https://replicate.delivery/example-video.mp4"
    ],
    "created_at": "2025-01-15T10:30:00.000Z",
    "started_at": "2025-01-15T10:30:05.000Z",
    "completed_at": "2025-01-15T10:32:00.000Z",
    "metrics": {
      "predict_time": 115.23
    }
  }'
```

## Features Implemented

### ✅ Webhook Security
- HMAC-SHA256 signature verification
- Timestamp validation to prevent replay attacks
- Graceful handling when security is not configured

### ✅ Error Handling & Retry
- Exponential backoff retry (3 attempts: 1s, 3s, 9s delays)
- Comprehensive error logging
- Credit refunds for failed generations
- Duplicate webhook detection

### ✅ Video Processing
- Automatic video file download and upload to Supabase
- Processing time calculation
- Status tracking (processing → completed/failed)
- Metadata preservation

### ✅ Credit Management
- Automatic credit refunds for failed generations
- Package usage counter adjustments
- Detailed transaction logging

### ✅ Integration
- Seamless integration with existing generations system
- Backwards compatibility with image models
- Status-based conditional logic

## Monitoring & Logs

The webhook system provides comprehensive logging:

```
[WebhooksController] Received Replicate webhook: abc123def456
[ReplicateWebhookService] Processing webhook for prediction: abc123def456
[ReplicateWebhookService] Processing 1 video files for generation 789
[StorageService] Successfully uploaded 1 videos to Supabase
[ReplicateWebhookService] Generation 789 marked as completed with 1 videos
[WebhooksController] Webhook processed successfully for prediction: abc123def456 in 2341ms
```

## Error Scenarios Handled

1. **Invalid webhook signature**: Returns 401 Unauthorized
2. **Malformed payload**: Returns 400 Bad Request with validation errors
3. **Generation not found**: Logs warning, returns success (idempotent)
4. **File upload failure**: Continues processing, logs error
5. **Credit refund failure**: Logs error, doesn't fail the webhook
6. **Database update failure**: Retries with exponential backoff
7. **Duplicate webhooks**: Detected and ignored gracefully

## Production Deployment Checklist

1. ✅ Set `WEBHOOK_BASE_URL` to your production domain
2. ✅ Configure `REPLICATE_WEBHOOK_SECRET` for security
3. ✅ Ensure webhook endpoint is accessible from Replicate
4. ✅ Monitor webhook logs for any issues
5. ✅ Test with a few video generations
6. ✅ Verify credit refunds work correctly
7. ✅ Check Supabase storage uploads

## Troubleshooting

### Webhook Not Triggering
- Verify `WEBHOOK_BASE_URL` is set and accessible
- Check Replicate dashboard for webhook failures
- Ensure video model is being used (not image model)

### Signature Verification Failing
- Check `REPLICATE_WEBHOOK_SECRET` matches Replicate configuration
- Verify timestamp headers are being sent correctly

### Files Not Uploading
- Check Supabase configuration and permissions
- Verify network connectivity to Replicate delivery URLs
- Check file size limits

### Credits Not Being Refunded
- Check credit management service is working
- Verify user has sufficient credit balance for refund
- Check package usage counters are updating correctly