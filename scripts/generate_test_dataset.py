#!/usr/bin/env python3
"""
Generate Test Image Dataset
Creates synthetic cabinet images with segmentation masks for testing

Generates 3 color palettes:
- Modern: RAL 7016 (anthracite) + RAL 9010 (white)
- Bold: RAL 5015 (sky blue) + RAL 9005 (black)
- Warm: RAL 9001 (cream) + RAL 8014 (brown)

Output:
- data/test/images/ - Test images
- data/test/masks/ - Segmentation masks
- data/manifests/test.csv - Test manifest
"""

import sys
import numpy as np
import cv2
from pathlib import Path
import pandas as pd
from typing import Tuple, List
import argparse

# Add server directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'server'))

try:
    from ral_colors import RAL_COLORS
except ImportError:
    print("Error: Could not import ral_colors module")
    print("Make sure server/ral_colors.py exists")
    sys.exit(1)


class CabinetImageGenerator:
    """Generate synthetic cabinet images with masks"""

    def __init__(self, output_dir: str = "data/test"):
        self.output_dir = Path(output_dir)
        self.images_dir = self.output_dir / "images"
        self.masks_dir = self.output_dir / "masks"

        # Create directories
        self.images_dir.mkdir(parents=True, exist_ok=True)
        self.masks_dir.mkdir(parents=True, exist_ok=True)

        print(f"Output directory: {self.output_dir}")

    def generate_cabinet_image(
        self,
        width: int = 512,
        height: int = 512,
        drawer_ratio: float = 0.4
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Generate synthetic cabinet image with masks

        Args:
            width: Image width
            height: Image height
            drawer_ratio: Ratio of drawer area to image height

        Returns:
            (image, drawer_mask, frame_mask)
        """
        # Create base image with gradient
        image = np.zeros((height, width, 3), dtype=np.uint8)

        # Gradient background (light to dark)
        for y in range(height):
            intensity = int(200 - (y / height) * 50)
            image[y, :] = [intensity, intensity, intensity]

        # Add texture noise
        noise = np.random.randint(-20, 20, (height, width, 3), dtype=np.int16)
        image = np.clip(image.astype(np.int16) + noise, 0, 255).astype(np.uint8)

        # Create drawer region (center rectangle)
        drawer_h = int(height * drawer_ratio)
        drawer_w = int(width * 0.6)
        drawer_y = (height - drawer_h) // 2
        drawer_x = (width - drawer_w) // 2

        # Create masks
        drawer_mask = np.zeros((height, width), dtype=np.uint8)
        frame_mask = np.zeros((height, width), dtype=np.uint8)

        # Drawer mask (inner rectangle)
        drawer_mask[drawer_y:drawer_y+drawer_h, drawer_x:drawer_x+drawer_w] = 255

        # Frame mask (border around drawer)
        border_width = 40
        frame_y1 = max(0, drawer_y - border_width)
        frame_y2 = min(height, drawer_y + drawer_h + border_width)
        frame_x1 = max(0, drawer_x - border_width)
        frame_x2 = min(width, drawer_x + drawer_w + border_width)

        # Frame is border area (not including drawer)
        frame_mask[frame_y1:frame_y2, frame_x1:frame_x2] = 255
        frame_mask[drawer_y:drawer_y+drawer_h, drawer_x:drawer_x+drawer_w] = 0

        # Add some realistic details
        # Drawer handle (small rectangle)
        handle_h = 10
        handle_w = 60
        handle_y = drawer_y + drawer_h // 2 - handle_h // 2
        handle_x = drawer_x + drawer_w // 2 - handle_w // 2
        cv2.rectangle(image, (handle_x, handle_y), (handle_x + handle_w, handle_y + handle_h),
                     (50, 50, 50), -1)

        # Frame edges (darker lines)
        cv2.rectangle(image, (frame_x1, frame_y1), (frame_x2, frame_y2), (80, 80, 80), 2)
        cv2.rectangle(image, (drawer_x, drawer_y), (drawer_x + drawer_w, drawer_y + drawer_h),
                     (60, 60, 60), 2)

        return image, drawer_mask, frame_mask

    def generate_dataset(
        self,
        num_samples: int = 50,
        color_palettes: List[Tuple[str, str, str]] = None
    ) -> pd.DataFrame:
        """
        Generate complete test dataset

        Args:
            num_samples: Number of images to generate
            color_palettes: List of (name, drawer_ral, frame_ral) tuples

        Returns:
            DataFrame with manifest
        """
        if color_palettes is None:
            color_palettes = [
                ("modern", "RAL 7016", "RAL 9010"),  # Anthracite + White
                ("bold", "RAL 5015", "RAL 9005"),    # Sky blue + Black
                ("warm", "RAL 9001", "RAL 8014"),    # Cream + Brown
            ]

        print(f"\nGenerating {num_samples} test images...")
        print(f"Color palettes: {len(color_palettes)}")
        print("")

        manifest_data = []

        for i in range(num_samples):
            # Select palette
            palette_idx = i % len(color_palettes)
            palette_name, drawer_ral, frame_ral = color_palettes[palette_idx]

            # Vary image dimensions
            size = 512 if i % 2 == 0 else 640
            drawer_ratio = 0.3 + (i % 5) * 0.05  # Vary drawer size

            # Generate image and masks
            image, drawer_mask, frame_mask = self.generate_cabinet_image(
                width=size,
                height=size,
                drawer_ratio=drawer_ratio
            )

            # Save files
            img_filename = f"cabinet_{i:04d}_{palette_name}.png"
            drawer_mask_filename = f"drawer_mask_{i:04d}.png"
            frame_mask_filename = f"frame_mask_{i:04d}.png"

            img_path = self.images_dir / img_filename
            drawer_mask_path = self.masks_dir / drawer_mask_filename
            frame_mask_path = self.masks_dir / frame_mask_filename

            cv2.imwrite(str(img_path), image)
            cv2.imwrite(str(drawer_mask_path), drawer_mask)
            cv2.imwrite(str(frame_mask_path), frame_mask)

            # Add to manifest
            manifest_data.append({
                'image_path': str(img_path),
                'drawer_mask_path': str(drawer_mask_path),
                'frame_mask_path': str(frame_mask_path),
                'drawer_ral': drawer_ral,
                'frame_ral': frame_ral,
                'palette': palette_name
            })

            if (i + 1) % 10 == 0:
                print(f"  Generated {i + 1}/{num_samples} images")

        print(f"\n✓ Generated {num_samples} images successfully")

        # Create DataFrame
        manifest_df = pd.DataFrame(manifest_data)
        return manifest_df

    def save_manifest(self, manifest_df: pd.DataFrame, output_path: str = None):
        """Save manifest to CSV"""
        if output_path is None:
            output_path = self.output_dir.parent / "manifests" / "test.csv"

        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        manifest_df.to_csv(output_path, index=False)
        print(f"\n✓ Manifest saved to: {output_path}")
        print(f"  Rows: {len(manifest_df)}")


def main():
    parser = argparse.ArgumentParser(description='Generate test image dataset')
    parser.add_argument('--num-samples', type=int, default=50,
                       help='Number of images to generate (default: 50)')
    parser.add_argument('--output-dir', default='data/test',
                       help='Output directory (default: data/test)')
    args = parser.parse_args()

    print("=" * 70)
    print("Test Image Dataset Generator")
    print("=" * 70)

    # Color palettes
    palettes = [
        ("modern", "RAL 7016", "RAL 9010"),  # Anthracite + White
        ("bold", "RAL 5015", "RAL 9005"),    # Sky blue + Black
        ("warm", "RAL 9001", "RAL 8014"),    # Cream + Brown
        ("classic", "RAL 9016", "RAL 7016"), # White + Anthracite
        ("nature", "RAL 6005", "RAL 9001"),  # Green + Cream
    ]

    # Generate dataset
    generator = CabinetImageGenerator(output_dir=args.output_dir)
    manifest_df = generator.generate_dataset(
        num_samples=args.num_samples,
        color_palettes=palettes
    )

    # Save manifest
    generator.save_manifest(manifest_df)

    # Print summary
    print("\n" + "=" * 70)
    print("Dataset Generation Complete!")
    print("=" * 70)
    print(f"\nImages: {args.num_samples}")
    print(f"Palettes: {len(palettes)}")
    print(f"\nOutput:")
    print(f"  Images: {generator.images_dir}")
    print(f"  Masks:  {generator.masks_dir}")
    print(f"  Manifest: data/manifests/test.csv")
    print("\nPalette breakdown:")

    for palette_name, drawer, frame in palettes:
        count = len(manifest_df[manifest_df['palette'] == palette_name])
        print(f"  {palette_name:10}: {count:2} images  ({drawer} + {frame})")

    print("\n" + "=" * 70)


if __name__ == '__main__':
    main()
