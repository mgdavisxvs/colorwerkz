// ai-training domain schemas (placeholder)
export interface TrainingJob { id: string; modelId: string; startedAt: string; status: 'queued' | 'running' | 'succeeded' | 'failed'; }
