-- ═══════════════════════════════════════════════════════════════════════════
-- ColorWerkz Database Schema
-- PostgreSQL database schema for color combinations and processing results
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ───────────────────────────────────────────────────────────────────────────
-- Color Combinations Table
-- Stores processed images with color transfer results
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS color_combinations (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Color information
    frame_color VARCHAR(20) NOT NULL,  -- e.g., "RAL 7016"
    drawer_color VARCHAR(20) NOT NULL, -- e.g., "RAL 5015"

    -- Quality metrics
    delta_e DECIMAL(6, 2) NOT NULL,    -- Color accuracy (target: < 2.0)

    -- File paths
    source_image_path TEXT NOT NULL,
    transformed_image_path TEXT NOT NULL,

    -- Processing information
    method_used VARCHAR(20) NOT NULL,   -- 'opencv', 'pytorch', 'i2i'
    processing_time_ms INTEGER NOT NULL,

    -- Metadata (JSONB for flexibility)
    metadata JSONB DEFAULT '{}'::jsonb,
    -- Example metadata structure:
    -- {
    --   "manufacturing_status": "ready" | "pending" | "failed",
    --   "batch_id": "uuid",
    --   "gpu_used": true | false,
    --   "quality_score": 0.95,
    --   "validated_by": "user_id",
    --   "notes": "Custom notes"
    -- }

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT chk_delta_e CHECK (delta_e >= 0 AND delta_e <= 100),
    CONSTRAINT chk_method CHECK (method_used IN ('opencv', 'pytorch', 'i2i', 'production', 'fast', 'accurate'))
);

-- ───────────────────────────────────────────────────────────────────────────
-- Training Samples Table
-- Stores training data for model training
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS training_samples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Image paths
    source_image_path TEXT NOT NULL,
    pseudo_label_path TEXT NOT NULL,
    drawer_mask_path TEXT NOT NULL,
    frame_mask_path TEXT NOT NULL,

    -- Target colors
    drawer_ral VARCHAR(20) NOT NULL,
    frame_ral VARCHAR(20) NOT NULL,

    -- Quality metrics
    pseudo_label_delta_e DECIMAL(6, 2),

    -- Split assignment
    split VARCHAR(10) NOT NULL, -- 'train', 'val', 'test'

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_split CHECK (split IN ('train', 'val', 'test'))
);

-- ───────────────────────────────────────────────────────────────────────────
-- Model Checkpoints Table
-- Tracks model training progress and checkpoints
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS model_checkpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Model information
    model_name VARCHAR(100) NOT NULL,
    checkpoint_path TEXT NOT NULL,

    -- Training metrics
    epoch INTEGER NOT NULL,
    train_loss DECIMAL(10, 6),
    val_loss DECIMAL(10, 6),
    val_delta_e DECIMAL(6, 2),

    -- Best model tracking
    is_best BOOLEAN DEFAULT FALSE,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    -- Example: {"learning_rate": 0.0001, "batch_size": 8, "optimizer": "adam"}

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_epoch CHECK (epoch >= 0)
);

-- ───────────────────────────────────────────────────────────────────────────
-- Processing Jobs Table
-- Tracks batch processing jobs
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS processing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Job information
    status VARCHAR(20) NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
    job_type VARCHAR(50) NOT NULL, -- 'single', 'batch', 'training'

    -- Processing details
    total_images INTEGER NOT NULL DEFAULT 1,
    processed_images INTEGER NOT NULL DEFAULT 0,
    failed_images INTEGER NOT NULL DEFAULT 0,

    -- Results summary
    avg_delta_e DECIMAL(6, 2),
    total_processing_time_ms INTEGER,

    -- Job parameters
    parameters JSONB DEFAULT '{}'::jsonb,
    -- Example: {"method": "pytorch", "target_colors": {"drawer": "RAL 5015", ...}}

    -- Error tracking
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT chk_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- ───────────────────────────────────────────────────────────────────────────
-- Update Trigger for updated_at
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_color_combinations_updated_at
    BEFORE UPDATE ON color_combinations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ───────────────────────────────────────────────────────────────────────────
-- Comments for documentation
-- ───────────────────────────────────────────────────────────────────────────

COMMENT ON TABLE color_combinations IS 'Stores color transfer results with quality metrics';
COMMENT ON COLUMN color_combinations.delta_e IS 'Color accuracy metric (CIE76). Target < 2.0 for manufacturing grade';
COMMENT ON COLUMN color_combinations.metadata IS 'Flexible JSON storage for manufacturing status, validation, notes, etc.';

COMMENT ON TABLE training_samples IS 'Training data for U-Net model with pseudo-labels';
COMMENT ON TABLE model_checkpoints IS 'Model training checkpoints and metrics';
COMMENT ON TABLE processing_jobs IS 'Batch processing job tracking and status';
