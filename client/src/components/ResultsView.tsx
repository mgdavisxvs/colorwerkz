/**
 * Results View Component
 * Before/after comparison with Delta E metrics
 *
 * Philosophy (Donald Knuth): Display results with precision and clarity
 * UX (Modern Minimal): Clean visual comparison
 */

import type { TransferResult } from '../types/api';
import './ResultsView.css';

interface ResultsViewProps {
  originalImage: string;
  result: TransferResult;
}

export function ResultsView({ originalImage, result }: ResultsViewProps) {
  const getDeltaEBadge = (deltaE: number) => {
    if (deltaE < 2.0) {
      return { class: 'badge-success', text: '✓ Manufacturing Ready' };
    } else if (deltaE < 10.0) {
      return { class: 'badge-warning', text: '⚠ Moderate Accuracy' };
    } else {
      return { class: 'badge-error', text: '✗ Low Accuracy' };
    }
  };

  const badge = getDeltaEBadge(result.delta_e);

  return (
    <div className="results-view">
      <div className="results-header">
        <h2>Color Transfer Results</h2>
        <span className={`badge ${badge.class}`}>{badge.text}</span>
      </div>

      <div className="comparison-grid">
        <div className="comparison-item">
          <h3 className="comparison-label">Original</h3>
          <div className="image-container">
            <img src={originalImage} alt="Original" />
          </div>
        </div>

        <div className="comparison-arrow">
          <svg
            width="32"
            height="32"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </div>

        <div className="comparison-item">
          <h3 className="comparison-label">Transformed</h3>
          <div className="image-container">
            <img src={result.image} alt="Transformed" />
          </div>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard
          label="Delta E"
          value={result.delta_e.toFixed(3)}
          description="Color accuracy (target: < 2.0)"
          highlight={result.delta_e < 2.0}
        />

        <MetricCard
          label="Processing Time"
          value={`${result.processing_time.toFixed(0)}ms`}
          description="Server processing duration"
        />

        <MetricCard
          label="Method"
          value={result.method_used}
          description="Color transfer algorithm used"
        />

        {result.metadata?.imageSize && (
          <MetricCard
            label="Resolution"
            value={`${result.metadata.imageSize[0]}×${result.metadata.imageSize[1]}`}
            description="Image dimensions"
          />
        )}
      </div>

      {result.manufacturing_ready && (
        <div className="manufacturing-notice">
          <svg
            className="notice-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h4>Manufacturing Ready</h4>
            <p>
              This result meets manufacturing quality standards (Delta E &lt; 2.0).
              Ready for production use.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  description?: string;
  highlight?: boolean;
}

function MetricCard({ label, value, description, highlight }: MetricCardProps) {
  return (
    <div className={`metric-card ${highlight ? 'highlight' : ''}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {description && <div className="metric-description">{description}</div>}
    </div>
  );
}
