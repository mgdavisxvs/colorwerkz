/**
 * ColorWerkz Main Application
 * Modern Minimal Design - Manufacturing-Grade Color Transfer
 *
 * Council Review:
 * - Knuth: Simple state machine (upload → configure → process → results)
 * - Graham: Efficient data flow from input to output
 * - Torvalds: Minimal re-renders, no unnecessary abstraction
 * - Wolfram: State transitions as simple local rules
 * - Ritchie: Composition of simple components
 */

import { useState } from 'react';
import { ImageUpload } from './components/ImageUpload';
import { ColorPicker } from './components/ColorPicker';
import { ResultsView } from './components/ResultsView';
import { api } from './utils/api';
import type { TargetColors, TransferResult, ColorTransferMethod } from './types/api';
import './App.css';

type AppState = 'upload' | 'configure' | 'processing' | 'results';

export function App() {
  const [state, setState] = useState<AppState>('upload');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [drawerColor, setDrawerColor] = useState<string | null>(null);
  const [frameColor, setFrameColor] = useState<string | null>(null);
  const [method, setMethod] = useState<ColorTransferMethod>('production');
  const [result, setResult] = useState<TransferResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string>('');

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
    setState('configure');

    // Create preview URL
    if (files[0]) {
      const url = URL.createObjectURL(files[0]);
      setOriginalImageUrl(url);
    }
  };

  const handleTransfer = async () => {
    if (!selectedFiles[0] || !drawerColor || !frameColor) {
      setError('Please select an image and both colors');
      return;
    }

    setState('processing');
    setError(null);

    try {
      const targetColors: TargetColors = {
        drawer: drawerColor,
        frame: frameColor,
      };

      const result = await api.transferImage(
        selectedFiles[0],
        targetColors,
        method
      );

      setResult(result);
      setState('results');
    } catch (err) {
      console.error('Transfer error:', err);
      setError(err instanceof Error ? err.message : 'Transfer failed');
      setState('configure');
    }
  };

  const handleReset = () => {
    setSelectedFiles([]);
    setDrawerColor(null);
    setFrameColor(null);
    setResult(null);
    setError(null);
    setState('upload');
    if (originalImageUrl) {
      URL.revokeObjectURL(originalImageUrl);
      setOriginalImageUrl('');
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="container">
          <h1 className="app-title">
            Color<span className="app-title-accent">Werkz</span>
          </h1>
          <p className="app-subtitle">
            Manufacturing-Grade Color Transfer • Delta E &lt; 2.0
          </p>
        </div>
      </header>

      <main className="app-main">
        <div className="container">
          {state === 'upload' && (
            <section className="section">
              <h2 className="section-title">Upload Cabinet Image</h2>
              <ImageUpload
                onFilesSelected={handleFilesSelected}
                multiple={false}
                maxFiles={1}
              />
            </section>
          )}

          {state === 'configure' && (
            <section className="section">
              <div className="config-layout">
                <div className="config-sidebar">
                  <div className="preview-card card">
                    <h3>Selected Image</h3>
                    {originalImageUrl && (
                      <img
                        src={originalImageUrl}
                        alt="Selected"
                        className="preview-image"
                      />
                    )}
                  </div>

                  <div className="method-selector card">
                    <h3>Transfer Method</h3>
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value as ColorTransferMethod)}
                      className="method-select"
                    >
                      <option value="production">Production (Accurate)</option>
                      <option value="opencv">OpenCV (Fast)</option>
                      <option value="i2i">I2I GAN (Experimental)</option>
                    </select>
                  </div>

                  <div className="action-buttons">
                    <button onClick={handleReset} className="btn btn-secondary">
                      ← Back
                    </button>
                    <button
                      onClick={handleTransfer}
                      className="btn btn-primary"
                      disabled={!drawerColor || !frameColor}
                    >
                      Transform →
                    </button>
                  </div>
                </div>

                <div className="config-colors">
                  <ColorPicker
                    selectedColor={drawerColor}
                    onColorSelect={setDrawerColor}
                    label="Drawer Color"
                  />

                  <ColorPicker
                    selectedColor={frameColor}
                    onColorSelect={setFrameColor}
                    label="Frame Color"
                  />
                </div>
              </div>

              {error && (
                <div className="error-message">
                  <strong>Error:</strong> {error}
                </div>
              )}
            </section>
          )}

          {state === 'processing' && (
            <section className="section text-center">
              <div className="processing-spinner">
                <div className="spinner"></div>
                <h2>Processing Image...</h2>
                <p className="text-sm">
                  Applying {method} color transfer algorithm
                </p>
              </div>
            </section>
          )}

          {state === 'results' && result && (
            <section className="section">
              <ResultsView originalImage={originalImageUrl} result={result} />

              <div className="action-buttons mt-8">
                <button onClick={handleReset} className="btn btn-primary">
                  Transform Another Image
                </button>
              </div>
            </section>
          )}
        </div>
      </main>

      <footer className="app-footer">
        <div className="container text-center">
          <p className="text-sm">
            ColorWerkz v2.0 • Built with React + TypeScript • API: Delta E &lt; 0.065
          </p>
        </div>
      </footer>
    </div>
  );
}
