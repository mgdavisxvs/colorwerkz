#!/usr/bin/env python3
"""
OpenCV Baseline Color Transfer
Fast but inaccurate method for prototyping only

⚠️ WARNING: Known accuracy issues (Delta E ~25)
- Preserves lightness (L-channel) - cannot darken/lighten surfaces
- Only transfers a,b channels
- NOT suitable for production manufacturing
- Use only for quick previews
"""

import sys
import json
import argparse
import time
from pathlib import Path
import numpy as np
import cv2

# Import RAL colors module
from ral_colors import RAL_COLORS_LAB, rgb_to_lab, lab_to_rgb, calculate_delta_e


def opencv_transfer(
    source_image: str,
    frame_color: str,
    drawer_color: str,
    output_path: str
) -> dict:
    """
    OpenCV baseline color transfer

    ⚠️ WRONG ALGORITHM: Only transfers a,b channels (preserves lightness)
    This is intentionally kept for comparison purposes.

    Args:
        source_image: Path to source cabinet image
        frame_color: Target RAL code for frame (e.g., "RAL 7016")
        drawer_color: Target RAL code for drawer (e.g., "RAL 5015")
        output_path: Path to save transformed image

    Returns:
        dict with output_image, delta_e, processing_time
    """
    start_time = time.time()

    # Load image
    img = cv2.imread(source_image)
    if img is None:
        raise ValueError(f"Failed to load image: {source_image}")

    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img_lab = rgb_to_lab(img_rgb)

    # Get target colors in LAB space
    drawer_lab = RAL_COLORS_LAB[drawer_color]
    frame_lab = RAL_COLORS_LAB[frame_color]

    # Simple segmentation (naive approach - top half = frame, bottom half = drawer)
    height, width = img_lab.shape[:2]

    # WRONG ALGORITHM: Only transfer a,b channels (preserves L)
    result_lab = img_lab.copy()

    # Top half = frame (WRONG: only a,b channels)
    result_lab[:height//2, :, 1] = frame_lab[1]  # a channel only
    result_lab[:height//2, :, 2] = frame_lab[2]  # b channel only

    # Bottom half = drawer (WRONG: only a,b channels)
    result_lab[height//2:, :, 1] = drawer_lab[1]  # a channel only
    result_lab[height//2:, :, 2] = drawer_lab[2]  # b channel only

    # Convert back to RGB
    result_rgb = lab_to_rgb(result_lab)
    result_bgr = cv2.cvtColor((result_rgb * 255).astype(np.uint8), cv2.COLOR_RGB2BGR)

    # Save output
    output_dir = Path(output_path).parent
    output_dir.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(output_path, result_bgr)

    # Calculate Delta E (will be high due to wrong algorithm)
    drawer_region_lab = result_lab[height//2:, :, :].mean(axis=(0, 1))
    frame_region_lab = result_lab[:height//2, :, :].mean(axis=(0, 1))

    delta_e_drawer = calculate_delta_e(drawer_region_lab, drawer_lab)
    delta_e_frame = calculate_delta_e(frame_region_lab, frame_lab)
    delta_e_avg = (delta_e_drawer + delta_e_frame) / 2.0

    processing_time = time.time() - start_time

    return {
        'output_image': output_path,
        'delta_e': float(delta_e_avg),
        'delta_e_drawer': float(delta_e_drawer),
        'delta_e_frame': float(delta_e_frame),
        'processing_time': processing_time,
        'image_size': img.shape[:2],
        'color_accuracy': 'low',
        'method': 'opencv_baseline',
        'warning': 'Not suitable for manufacturing - Delta E > 2.0 expected'
    }


def main():
    parser = argparse.ArgumentParser(description='OpenCV baseline color transfer')
    parser.add_argument('--args', type=str, required=True, help='JSON arguments')
    args = parser.parse_args()

    # Parse JSON arguments
    try:
        params = json.loads(args.args)
    except json.JSONDecodeError as e:
        print(json.dumps({'error': f'Invalid JSON: {e}'}), file=sys.stderr)
        sys.exit(1)

    # Execute transfer
    try:
        result = opencv_transfer(
            source_image=params['source_image'],
            frame_color=params['frame_color'],
            drawer_color=params['drawer_color'],
            output_path=params['output_path']
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
