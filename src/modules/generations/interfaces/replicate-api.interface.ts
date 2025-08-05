export interface ReplicateRequest {
  input: Record<string, any>;
}

export interface ReplicateResponse {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  logs?: Record<string, any>;
  completed_at?: string;
  created_at: string;
  started_at?: string;
  model: string;
  version?: string;
  metrics?: Record<string, any>;
  urls?: Record<string, any>;
}

export interface ReplicateErrorResponse {
  detail: string;
  status?: number;
  title?: string;
  type?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}