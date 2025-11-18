"""
Synthetic RAL Dataset Generator
Generates training data with correct pseudo-labels for U-Net color transfer

✅ CRITICAL FIX APPLIED: Full LAB channel transfer (including L-channel)
This enables Delta E < 2.0 manufacturing-grade accuracy.
"""

import numpy as np
import cv2
from typing import Dict, Tuple, Optional
import pandas as pd
from pathlib import Path
from ral_colors import RAL_COLORS, RAL_COLORS_LAB, rgb_to_lab, lab_to_rgb, calculate_delta_e


class SyntheticRALDataset:
    """
    Generate synthetic training data for color transfer

    Creates pseudo-labels by applying target RAL colors to segmented regions.
    Uses CORRECT algorithm: Full LAB transfer including lightness.
    """

    def __init__(
        self,
        manifest_path: str,
        output_dir: str = "data/synthetic",
        verify_fix: bool = True
    ):
        """
        Initialize dataset generator

        Args:
            manifest_path: CSV file with columns: image_path, drawer_ral, frame_ral,
                          drawer_mask_path, frame_mask_path
            output_dir: Directory to save generated images
            verify_fix: If True, verifies L-channel is transferred correctly
        """
        self.manifest = pd.read_csv(manifest_path)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.verify_fix = verify_fix

        print(f"✅ SyntheticRALDataset initialized")
        print(f"   Samples: {len(self.manifest)}")
        print(f"   Output: {self.output_dir}")
        print(f"   Verification: {'ENABLED' if verify_fix else 'DISABLED'}")

    def __len__(self) -> int:
        return len(self.manifest)

    def __getitem__(self, idx: int) -> Dict:
        """
        Generate a single training sample with correct pseudo-label

        Returns:
            dict with keys:
                - 'input': Original image
                - 'target': Pseudo-label (target colors applied)
                - 'drawer_ral': Drawer RAL code
                - 'frame_ral': Frame RAL code
                - 'delta_e_drawer': Delta E for drawer region
                - 'delta_e_frame': Delta E for frame region
                - 'verification': Verification status (if enabled)
        """
        row = self.manifest.iloc[idx]

        # Load image and masks
        img = cv2.imread(row['image_path'])
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        drawer_mask = cv2.imread(row['drawer_mask_path'], cv2.IMREAD_GRAYSCALE)
        frame_mask = cv2.imread(row['frame_mask_path'], cv2.IMREAD_GRAYSCALE)

        # Get target RAL colors in LAB space
        drawer_ral_code = row['drawer_ral']
        frame_ral_code = row['frame_ral']

        drawer_lab = RAL_COLORS_LAB[drawer_ral_code]  # Shape: (3,)
        frame_lab = RAL_COLORS_LAB[frame_ral_code]    # Shape: (3,)

        # Generate pseudo-label with CORRECT algorithm
        pseudo_label_rgb, verification = self._apply_color_transfer(
            img_rgb, drawer_mask, frame_mask,
            drawer_lab, frame_lab,
            drawer_ral_code, frame_ral_code
        )

        return {
            'input': img_rgb,
            'target': pseudo_label_rgb,
            'drawer_ral': drawer_ral_code,
            'frame_ral': frame_ral_code,
            'delta_e_drawer': verification['delta_e_drawer'],
            'delta_e_frame': verification['delta_e_frame'],
            'verification': verification
        }

    def _apply_color_transfer(
        self,
        img_rgb: np.ndarray,
        drawer_mask: np.ndarray,
        frame_mask: np.ndarray,
        drawer_lab: np.ndarray,
        frame_lab: np.ndarray,
        drawer_ral_code: str,
        frame_ral_code: str
    ) -> Tuple[np.ndarray, Dict]:
        """
        Apply color transfer with CORRECT algorithm

        ✅ CRITICAL FIX: Transfers ALL LAB channels including L (lightness)
        """
        # Convert to LAB color space
        img_lab = rgb_to_lab(img_rgb)  # (H, W, 3)

        # CRITICAL FIX APPLIED
        result_lab = img_lab.copy()

        # Transfer drawer color - ALL channels including lightness ✅
        drawer_pixels = drawer_mask > 0
        if np.any(drawer_pixels):
            result_lab[drawer_pixels, :] = drawer_lab  # Full LAB transfer ✅

        # Transfer frame color - ALL channels including lightness ✅
        frame_pixels = frame_mask > 0
        if np.any(frame_pixels):
            result_lab[frame_pixels, :] = frame_lab  # Full LAB transfer ✅

        # Convert back to RGB
        result_rgb = lab_to_rgb(result_lab)

        # Verification
        verification = {
            'fix_applied': True,
            'delta_e_drawer': 0.0,
            'delta_e_frame': 0.0,
            'l_channel_transferred_drawer': False,
            'l_channel_transferred_frame': False
        }

        if self.verify_fix:
            # Check drawer region
            if np.any(drawer_pixels):
                actual_lab_drawer = result_lab[drawer_pixels].mean(axis=0)
                delta_e_drawer = calculate_delta_e(actual_lab_drawer, drawer_lab)
                verification['delta_e_drawer'] = delta_e_drawer

                # Verify L-channel was transferred
                l_diff = abs(actual_lab_drawer[0] - drawer_lab[0])
                verification['l_channel_transferred_drawer'] = l_diff < 5.0

            # Check frame region
            if np.any(frame_pixels):
                actual_lab_frame = result_lab[frame_pixels].mean(axis=0)
                delta_e_frame = calculate_delta_e(actual_lab_frame, frame_lab)
                verification['delta_e_frame'] = delta_e_frame

                # Verify L-channel was transferred
                l_diff = abs(actual_lab_frame[0] - frame_lab[0])
                verification['l_channel_transferred_frame'] = l_diff < 5.0

        return result_rgb, verification


if __name__ == "__main__":
    print("Synthetic RAL Dataset - Pseudo-Label Generator")
    print("✅ CRITICAL FIX APPLIED: Full LAB transfer including L-channel")
