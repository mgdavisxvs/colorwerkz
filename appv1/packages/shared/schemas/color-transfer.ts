// color-transfer domain schemas (placeholder)
export interface ColorTransferRequest { image: string; method?: string; }
export interface ColorTransferResponse { image: string; deltaE: number; processingTimeMs: number; }
