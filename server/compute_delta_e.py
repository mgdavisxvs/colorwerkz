#!/usr/bin/env python3
"""
Delta E Color Difference Computation
Calculates CIE76 Delta E between image colors and target RAL colors
"""

import sys
import json
import argparse
import numpy as np
import cv2

from ral_colors import RAL_COLORS_LAB, rgb_to_lab, calculate_delta_e


def compute_delta_e(
    image_path: str,
    target_drawer: str,
    target_frame: str
) -> dict:
    """
    Compute Delta E color difference

    Args:
        image_path: Path to transformed image
        target_drawer: Target RAL code for drawer
        target_frame: Target RAL code for frame

    Returns:
        dict with delta_e, delta_e_drawer, delta_e_frame
    """
    # Load image
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Failed to load image: {image_path}")

    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img_lab = rgb_to_lab(img_rgb)

    # Get target colors
    drawer_lab = RAL_COLORS_LAB[target_drawer]
    frame_lab = RAL_COLORS_LAB[target_frame]

    # Simple segmentation (top half = frame, bottom half = drawer)
    height = img_lab.shape[0]

    drawer_region_lab = img_lab[height//2:, :, :].mean(axis=(0, 1))
    frame_region_lab = img_lab[:height//2, :, :].mean(axis=(0, 1))

    # Calculate Delta E
    delta_e_drawer = calculate_delta_e(drawer_region_lab, drawer_lab)
    delta_e_frame = calculate_delta_e(frame_region_lab, frame_lab)
    delta_e_avg = (delta_e_drawer + delta_e_frame) / 2.0

    return {
        'delta_e': float(delta_e_avg),
        'delta_e_drawer': float(delta_e_drawer),
        'delta_e_frame': float(delta_e_frame),
        'manufacturing_ready': delta_e_avg < 2.0
    }


def main():
    parser = argparse.ArgumentParser(description='Compute Delta E color difference')
    parser.add_argument('--args', type=str, required=True, help='JSON arguments')
    args = parser.parse_args()

    # Parse JSON arguments
    try:
        params = json.loads(args.args)
    except json.JSONDecodeError as e:
        print(json.dumps({'error': f'Invalid JSON: {e}'}), file=sys.stderr)
        sys.exit(1)

    # Compute Delta E
    try:
        result = compute_delta_e(
            image_path=params['image_path'],
            target_drawer=params['target_drawer'],
            target_frame=params['target_frame']
        )

        # Output JSON to stdout
        print(json.dumps(result))
        sys.exit(0)

    except Exception as e:
        error_result = {
            'error': str(e),
            'error_type': type(e).__name__
        }
        print(json.dumps(error_result), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
