"""
RAL Color System Constants
Manufacturing-grade color definitions for ColorWerkz
"""

import numpy as np
from typing import Dict, Tuple

# RAL Color System - RGB values (0-255)
# Source: RAL Classic color chart
RAL_COLORS: Dict[str, Tuple[int, int, int]] = {
    # Blues
    "RAL 5015": (0, 99, 166),     # Sky blue
    "RAL 5012": (0, 117, 179),    # Light blue
    "RAL 5024": (75, 146, 179),   # Pastel blue

    # Grays
    "RAL 7016": (41, 49, 51),     # Anthracite grey (dark)
    "RAL 7035": (211, 218, 224),  # Light grey
    "RAL 7040": (150, 153, 157),  # Window grey
    "RAL 7047": (211, 214, 217),  # Telegrey 4

    # Whites
    "RAL 9001": (245, 242, 233),  # Cream white
    "RAL 9002": (232, 232, 230),  # Grey white
    "RAL 9003": (247, 247, 247),  # Signal white
    "RAL 9010": (250, 249, 245),  # Pure white
    "RAL 9016": (252, 252, 252),  # Traffic white

    # Blacks
    "RAL 9004": (40, 40, 40),     # Signal black
    "RAL 9005": (10, 10, 10),     # Jet black

    # Browns
    "RAL 8014": (56, 44, 37),     # Sepia brown
    "RAL 8019": (64, 58, 58),     # Grey brown

    # Greens
    "RAL 6005": (0, 56, 55),      # Moss green
    "RAL 6021": (137, 166, 131),  # Pale green

    # Reds
    "RAL 3000": (165, 32, 25),    # Flame red
    "RAL 3003": (165, 32, 25),    # Ruby red
}


def rgb_to_lab(rgb: np.ndarray) -> np.ndarray:
    """
    Convert RGB to LAB color space

    Args:
        rgb: RGB array (3,) or (H, W, 3) with values 0-255

    Returns:
        LAB array with same shape, L: 0-100, a,b: -128 to 127
    """
    import cv2

    # Normalize to 0-1
    rgb_norm = rgb.astype(np.float32) / 255.0

    # Handle both single colors and images
    if rgb_norm.ndim == 1:
        # Single color: reshape to (1, 1, 3)
        rgb_norm = rgb_norm.reshape(1, 1, 3)
        lab = cv2.cvtColor(rgb_norm, cv2.COLOR_RGB2LAB)
        return lab.reshape(3)
    else:
        # Image: (H, W, 3)
        return cv2.cvtColor(rgb_norm, cv2.COLOR_RGB2LAB)


def lab_to_rgb(lab: np.ndarray) -> np.ndarray:
    """
    Convert LAB to RGB color space

    Args:
        lab: LAB array (3,) or (H, W, 3)

    Returns:
        RGB array with values 0-255
    """
    import cv2

    # Handle both single colors and images
    if lab.ndim == 1:
        # Single color: reshape to (1, 1, 3)
        lab_reshaped = lab.reshape(1, 1, 3)
        rgb_norm = cv2.cvtColor(lab_reshaped, cv2.COLOR_LAB2RGB)
        rgb = (rgb_norm * 255).astype(np.uint8)
        return rgb.reshape(3)
    else:
        # Image: (H, W, 3)
        rgb_norm = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
        return (rgb_norm * 255).astype(np.uint8)


def get_ral_lab(ral_code: str) -> np.ndarray:
    """
    Get LAB values for a RAL color code

    Args:
        ral_code: RAL color code (e.g., "RAL 5015")

    Returns:
        LAB array (3,)
    """
    if ral_code not in RAL_COLORS:
        raise ValueError(f"Unknown RAL code: {ral_code}. Available: {list(RAL_COLORS.keys())}")

    rgb = np.array(RAL_COLORS[ral_code], dtype=np.uint8)
    return rgb_to_lab(rgb)


def calculate_delta_e(lab1: np.ndarray, lab2: np.ndarray) -> float:
    """
    Calculate Delta E (CIE76) color difference

    Args:
        lab1: LAB color 1
        lab2: LAB color 2

    Returns:
        Delta E value (0 = identical, <2 = manufacturing acceptable)
    """
    return float(np.sqrt(np.sum((lab1 - lab2) ** 2)))


# Pre-compute LAB values for all RAL colors
RAL_COLORS_LAB: Dict[str, np.ndarray] = {
    code: get_ral_lab(code) for code in RAL_COLORS.keys()
}


if __name__ == "__main__":
    # Test the color conversion
    print("RAL Color System - LAB Conversion Test")
    print("=" * 60)

    for ral_code in list(RAL_COLORS.keys())[:5]:
        rgb = RAL_COLORS[ral_code]
        lab = RAL_COLORS_LAB[ral_code]
        print(f"{ral_code:12} RGB{rgb}  →  LAB[L:{lab[0]:.1f}, a:{lab[1]:.1f}, b:{lab[2]:.1f}]")

    # Test Delta E calculation
    print("\nDelta E Test:")
    lab_white = RAL_COLORS_LAB["RAL 9010"]
    lab_black = RAL_COLORS_LAB["RAL 9005"]
    delta_e = calculate_delta_e(lab_white, lab_black)
    print(f"RAL 9010 (white) vs RAL 9005 (black): Delta E = {delta_e:.2f}")
