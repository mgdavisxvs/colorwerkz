/**
 * RAL Color Definitions
 * Synchronized with server/ral_colors.py
 *
 * Philosophy (Stephen Wolfram): Simple data structures, local rules
 */

export interface RALColor {
  code: string;
  rgb: [number, number, number];
  hex: string;
  category?: string;
}

export const RAL_COLORS: RALColor[] = [
  { code: 'RAL 3000', rgb: [175, 45, 25], hex: '#AF2D19', category: 'Red' },
  { code: 'RAL 3003', rgb: [155, 25, 20], hex: '#9B1914', category: 'Red' },
  { code: 'RAL 5012', rgb: [0, 115, 175], hex: '#0073AF', category: 'Blue' },
  { code: 'RAL 5015', rgb: [0, 99, 166], hex: '#0063A6', category: 'Blue' },
  { code: 'RAL 5024', rgb: [75, 145, 195], hex: '#4B91C3', category: 'Blue' },
  { code: 'RAL 6005', rgb: [0, 70, 50], hex: '#004632', category: 'Green' },
  { code: 'RAL 6021', rgb: [135, 165, 125], hex: '#87A57D', category: 'Green' },
  { code: 'RAL 7016', rgb: [41, 49, 51], hex: '#293133', category: 'Gray' },
  { code: 'RAL 7035', rgb: [205, 210, 215], hex: '#CDD2D7', category: 'Gray' },
  { code: 'RAL 7040', rgb: [155, 160, 170], hex: '#9BA0AA', category: 'Gray' },
  { code: 'RAL 7047', rgb: [210, 215, 215], hex: '#D2D7D7', category: 'Gray' },
  { code: 'RAL 8014', rgb: [70, 50, 35], hex: '#463223', category: 'Brown' },
  { code: 'RAL 8019', rgb: [65, 55, 50], hex: '#413732', category: 'Brown' },
  { code: 'RAL 9001', rgb: [240, 235, 220], hex: '#F0EBDC', category: 'White' },
  { code: 'RAL 9002', rgb: [230, 230, 225], hex: '#E6E6E1', category: 'White' },
  { code: 'RAL 9003', rgb: [245, 245, 245], hex: '#F5F5F5', category: 'White' },
  { code: 'RAL 9004', rgb: [40, 40, 40], hex: '#282828', category: 'Black' },
  { code: 'RAL 9005', rgb: [10, 10, 10], hex: '#0A0A0A', category: 'Black' },
  { code: 'RAL 9010', rgb: [250, 249, 245], hex: '#FAF9F5', category: 'White' },
  { code: 'RAL 9016', rgb: [250, 250, 250], hex: '#FAFAFA', category: 'White' },
];

export function getRALColor(code: string): RALColor | undefined {
  return RAL_COLORS.find((color) => color.code === code);
}

export function getRALsByCategory(): Record<string, RALColor[]> {
  const byCategory: Record<string, RALColor[]> = {};

  RAL_COLORS.forEach((color) => {
    const category = color.category || 'Other';
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(color);
  });

  return byCategory;
}
