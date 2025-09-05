export class VideoGenerationCompletedEvent {
  constructor(
    public readonly generationId: string,
    public readonly replicateId: string,
    public readonly userId: string,
    public readonly model: string,
    public readonly modelVersion: string,
    public readonly sessionId: string,
    public readonly videoUrls: string[] = [],
    public readonly processingTime?: number,
    public readonly creditsUsed?: number,
  ) {}
}

export class VideoGenerationFailedEvent {
  constructor(
    public readonly generationId: string,
    public readonly replicateId: string,
    public readonly userId: string,
    public readonly model: string,
    public readonly modelVersion: string,
    public readonly sessionId: string,
    public readonly error: string,
    public readonly creditsUsed?: number,
  ) {}
}

export class VideoGenerationProgressEvent {
  constructor(
    public readonly generationId: string,
    public readonly replicateId: string,
    public readonly userId: string,
    public readonly model: string,
    public readonly modelVersion: string,
    public readonly sessionId: string,
    public readonly status: 'starting' | 'processing',
    public readonly progress?: number, // 0-100 percentage
    public readonly estimatedTime?: number, // seconds remaining
    public readonly startedAt?: string,
  ) {}
}

export class CreditRefundEvent {
  constructor(
    public readonly userId: string,
    public readonly creditsRefunded: number,
    public readonly reason: string,
    public readonly generationId?: string,
  ) {}
}