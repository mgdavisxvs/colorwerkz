/**
 * RAL Color Picker Component
 * Select drawer and frame colors from RAL palette
 *
 * Philosophy (Ronald Graham): Efficient combinatorial selection
 * UX (Modern Minimal): Visual, tactile color selection
 */

import { RAL_COLORS, RALColor, getRALsByCategory } from '../utils/ralColors';
import './ColorPicker.css';

interface ColorPickerProps {
  selectedColor: string | null;
  onColorSelect: (colorCode: string) => void;
  label: string;
}

export function ColorPicker({
  selectedColor,
  onColorSelect,
  label,
}: ColorPickerProps) {
  const colorsByCategory = getRALsByCategory();

  return (
    <div className="color-picker">
      <label className="color-picker-label">{label}</label>

      {selectedColor && (
        <div className="selected-color-preview">
          <ColorSwatch color={RAL_COLORS.find((c) => c.code === selectedColor)!} />
          <span className="selected-color-code">{selectedColor}</span>
        </div>
      )}

      <div className="color-categories">
        {Object.entries(colorsByCategory).map(([category, colors]) => (
          <div key={category} className="color-category">
            <h4 className="category-title">{category}</h4>
            <div className="color-grid">
              {colors.map((color) => (
                <button
                  key={color.code}
                  className={`color-swatch-button ${
                    selectedColor === color.code ? 'selected' : ''
                  }`}
                  onClick={() => onColorSelect(color.code)}
                  title={`${color.code} - RGB(${color.rgb.join(', ')})`}
                >
                  <ColorSwatch color={color} />
                  <span className="color-code">{color.code}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ColorSwatch({ color }: { color: RALColor }) {
  return (
    <div
      className="color-swatch"
      style={{
        backgroundColor: color.hex,
      }}
    />
  );
}
