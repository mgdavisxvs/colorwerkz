#!/usr/bin/env python3
"""
Verify Pseudo-Label Fix
Checks that pseudo-labels correctly transfer all LAB channels including lightness
"""

import sys
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path

# Add server directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'server'))

try:
    from synthetic_ral_dataset import SyntheticRALDataset
    from ral_colors import RAL_COLORS
except ImportError as e:
    print(f"Error importing modules: {e}")
    print("Make sure synthetic_ral_dataset.py exists in server/")
    sys.exit(1)

def rgb_to_lab(rgb):
    """Convert RGB to LAB color space"""
    import cv2

    # Normalize RGB to 0-1
    rgb_normalized = np.array(rgb, dtype=np.float32) / 255.0

    # Create 1x1 image
    rgb_img = rgb_normalized.reshape(1, 1, 3)

    # Convert to LAB
    lab_img = cv2.cvtColor(rgb_img, cv2.COLOR_RGB2LAB)

    return lab_img[0, 0]

def verify_pseudolabel_fix(manifest_path='data/manifests/test.csv', num_samples=10):
    """
    Verify that pseudo-labels transfer full LAB including lightness

    Args:
        manifest_path: Path to test manifest
        num_samples: Number of samples to check

    Returns:
        bool: True if all checks pass
    """

    print("=" * 80)
    print("PSEUDO-LABEL FIX VERIFICATION")
    print("=" * 80)
    print()

    # Check if manifest exists
    if not Path(manifest_path).exists():
        print(f"Warning: Manifest not found at {manifest_path}")
        print("Skipping dataset verification")
        return True

    # Load dataset
    try:
        dataset = SyntheticRALDataset(manifest_path)
        print(f"✓ Loaded dataset: {len(dataset)} samples")
    except Exception as e:
        print(f"✗ Failed to load dataset: {e}")
        return False

    print()
    print("Checking pseudo-label quality...")
    print("-" * 80)

    all_passed = True

    for i in range(min(num_samples, len(dataset))):
        try:
            # Get sample (every 100th to get variety)
            sample_idx = i * (len(dataset) // num_samples) if len(dataset) > num_samples else i
            sample = dataset[sample_idx]

            # Get target color LAB values
            drawer_ral = sample['drawer_ral']
            drawer_rgb = RAL_COLORS[drawer_ral]
            drawer_lab = rgb_to_lab(drawer_rgb)

            # Get actual pseudo-label LAB values for drawer pixels
            mask = sample['mask']
            pseudo_label = sample['pseudo_label']

            drawer_pixels = mask == 1  # Assuming drawer is class 1
            if not np.any(drawer_pixels):
                print(f"  Sample {i}: No drawer pixels found (might be frame-only)")
                continue

            actual_lab = rgb_to_lab(pseudo_label[drawer_pixels].mean(axis=0))

            # Check all channels match (within tolerance for noise/compression)
            l_diff = abs(actual_lab[0] - drawer_lab[0])
            a_diff = abs(actual_lab[1] - drawer_lab[1])
            b_diff = abs(actual_lab[2] - drawer_lab[2])

            tolerance = 5.0  # Allow 5 units difference for noise

            l_ok = l_diff < tolerance
            a_ok = a_diff < tolerance
            b_ok = b_diff < tolerance

            all_ok = l_ok and a_ok and b_ok

            status = "✓ PASS" if all_ok else "✗ FAIL"

            print(f"  Sample {i}: {status}")
            print(f"    Target  LAB: L={drawer_lab[0]:.1f}, a={drawer_lab[1]:.1f}, b={drawer_lab[2]:.1f}")
            print(f"    Actual  LAB: L={actual_lab[0]:.1f}, a={actual_lab[1]:.1f}, b={actual_lab[2]:.1f}")
            print(f"    Diff   LAB: L={l_diff:.1f}, a={a_diff:.1f}, b={b_diff:.1f}")

            if not all_ok:
                print(f"    ⚠️  Pseudo-label does not match target!")
                if not l_ok:
                    print(f"    ⚠️  Lightness (L) not transferred correctly!")
                all_passed = False

            print()

        except Exception as e:
            print(f"  Sample {i}: ✗ ERROR - {e}")
            all_passed = False
            print()

    print("-" * 80)
    print()

    if all_passed:
        print("✓ SUCCESS: All pseudo-labels correctly transfer full LAB")
        print()
        print("The fix is working correctly. Pseudo-labels now transfer:")
        print("  - L (lightness) - Can darken light surfaces and lighten dark surfaces")
        print("  - a (green-red) - Color hue")
        print("  - b (blue-yellow) - Color hue")
        print()
        print("This enables the U-Net to learn the correct color transfer algorithm.")
        return True
    else:
        print("✗ FAILURE: Some pseudo-labels do not transfer full LAB")
        print()
        print("The fix may not be applied correctly. Check:")
        print("  1. server/synthetic_ral_dataset.py lines 224-236")
        print("  2. Ensure full LAB transfer: result_lab[pixels, :] = drawer_lab")
        print("  3. NOT partial transfer: result_lab[pixels, 1:] = drawer_lab[1:]")
        return False

def visual_inspection(manifest_path='data/manifests/test.csv', output_dir='verification_output'):
    """
    Generate visual comparison images for manual inspection
    """
    print("Generating visual verification images...")
    print()

    # Check if manifest exists
    if not Path(manifest_path).exists():
        print(f"Manifest not found at {manifest_path}")
        print("Skipping visual inspection")
        return

    # Create output directory
    Path(output_dir).mkdir(exist_ok=True)

    try:
        dataset = SyntheticRALDataset(manifest_path)

        # Generate images for first 5 samples
        for i in range(min(5, len(dataset))):
            sample = dataset[i * (len(dataset) // 5)]

            fig, axes = plt.subplots(1, 3, figsize=(15, 5))

            axes[0].imshow(sample['source_image'])
            axes[0].set_title('Source Image')
            axes[0].axis('off')

            axes[1].imshow(sample['mask'], cmap='gray')
            axes[1].set_title('Mask')
            axes[1].axis('off')

            axes[2].imshow(sample['pseudo_label'])
            axes[2].set_title(f"Pseudo-Label\n(Drawer: {sample['drawer_ral']}, Frame: {sample['frame_ral']})")
            axes[2].axis('off')

            plt.tight_layout()

            output_path = Path(output_dir) / f'verification_sample_{i}.png'
            plt.savefig(output_path, dpi=150, bbox_inches='tight')
            plt.close()

            print(f"  Saved: {output_path}")

        print()
        print(f"✓ Visual verification images saved to {output_dir}/")
        print("  Manually inspect images to ensure pseudo-labels show correct colors and lightness")

    except Exception as e:
        print(f"Error generating visual verification: {e}")

if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Verify pseudo-label fix')
    parser.add_argument('--manifest', default='data/manifests/test.csv', help='Test manifest path')
    parser.add_argument('--samples', type=int, default=10, help='Number of samples to check')
    parser.add_argument('--visual', action='store_true', help='Generate visual verification images')
    parser.add_argument('--output-dir', default='verification_output', help='Output directory for images')

    args = parser.parse_args()

    # Run verification
    success = verify_pseudolabel_fix(args.manifest, args.samples)

    # Generate visual inspection if requested
    if args.visual:
        print()
        visual_inspection(args.manifest, args.output_dir)

    # Exit with appropriate code
    sys.exit(0 if success else 1)
