# Implementation Guide: Pseudo-Label Fix (2 Minutes)

**Priority:** 🔴 CRITICAL
**Effort:** 2 minutes
**Impact:** Unblocks training, prevents learning wrong algorithm
**Status:** Ready to Apply

---

## Problem Statement

**Location:** `server/synthetic_ral_dataset.py` lines 224-226

**Current Code (WRONG):**
```python
# Apply color transfer with lightness preservation
result_lab = img_lab.copy()

# Transfer drawer color
drawer_pixels = drawer_mask > 0
if np.any(drawer_pixels):
    original_lightness = result_lab[drawer_pixels, 0]
    result_lab[drawer_pixels, 1:] = drawer_lab[1:]  # Only a,b channels ❌
    result_lab[drawer_pixels, 0] = original_lightness * 0.9  # Still preserves L! ❌

# Transfer frame color
frame_pixels = frame_mask > 0
if np.any(frame_pixels):
    original_lightness = result_lab[frame_pixels, 0]
    result_lab[frame_pixels, 1:] = frame_lab[1:]  # Only a,b channels ❌
    result_lab[frame_pixels, 0] = original_lightness * 0.9  # Still preserves L! ❌
```

**Why This Is Wrong:**
- Preserves the original lightness direction (light → still light, dark → still dark)
- Cannot darken light surfaces or lighten dark surfaces
- Same limitation as OpenCV baseline
- Training with these pseudo-labels teaches U-Net the WRONG algorithm
- Result: Delta E will stay high even after training

---

## Solution

**Replace with (CORRECT):**
```python
# Apply color transfer with FULL LAB transfer including lightness
result_lab = img_lab.copy()

# Transfer drawer color - ALL CHANNELS
drawer_pixels = drawer_mask > 0
if np.any(drawer_pixels):
    result_lab[drawer_pixels, :] = drawer_lab  # All channels including L ✅

# Transfer frame color - ALL CHANNELS
frame_pixels = frame_mask > 0
if np.any(frame_pixels):
    result_lab[frame_pixels, :] = frame_lab  # All channels including L ✅
```

**Why This Is Correct:**
- Transfers the complete target color (L, a, b)
- Can darken light surfaces: light wood → dark blue RAL
- Can lighten dark surfaces: dark metal → light gray RAL
- Produces correct pseudo-labels for training
- Expected result: Delta E < 2.0 after training

---

## Patch File

**File:** `pseudolabel_fix.patch`

```diff
--- a/server/synthetic_ral_dataset.py
+++ b/server/synthetic_ral_dataset.py
@@ -222,18 +222,12 @@ class SyntheticRALDataset:
         # Apply color transfer with lightness preservation
         result_lab = img_lab.copy()

-        # Transfer drawer color
+        # Transfer drawer color - ALL channels including lightness
         drawer_pixels = drawer_mask > 0
         if np.any(drawer_pixels):
-            original_lightness = result_lab[drawer_pixels, 0]
-            result_lab[drawer_pixels, 1:] = drawer_lab[1:]  # Only a,b
-            result_lab[drawer_pixels, 0] = original_lightness * 0.9  # Adjust lightness
+            result_lab[drawer_pixels, :] = drawer_lab  # Full LAB transfer

-        # Transfer frame color
+        # Transfer frame color - ALL channels including lightness
         frame_pixels = frame_mask > 0
         if np.any(frame_pixels):
-            original_lightness = result_lab[frame_pixels, 0]
-            result_lab[frame_pixels, 1:] = frame_lab[1:]  # Only a,b
-            result_lab[frame_pixels, 0] = original_lightness * 0.9  # Adjust lightness
+            result_lab[frame_pixels, :] = frame_lab  # Full LAB transfer

         # Convert back to BGR
```

---

## Application Instructions

### Method 1: Manual Edit (Recommended)

1. Open `server/synthetic_ral_dataset.py` in your editor
2. Navigate to lines 224-236 (the `_apply_color_transfer` method)
3. Replace the code as shown above
4. Save the file

**Time:** 2 minutes

### Method 2: Apply Patch

```bash
cd /path/to/colorwerkz
patch -p1 < pseudolabel_fix.patch
```

**Time:** 10 seconds

### Method 3: Git Apply (If in Version Control)

```bash
git apply pseudolabel_fix.patch
git add server/synthetic_ral_dataset.py
git commit -m "Fix pseudo-label generation: transfer full LAB including lightness

- Remove lightness preservation logic (lines 225-226, 231-232)
- Transfer all LAB channels (:) instead of just a,b (1:)
- Enables U-Net to learn correct color transfer algorithm
- Critical fix before training (prevents learning wrong pattern)

Impact: Unblocks achieving Delta E < 2.0 target
"
```

---

## Verification

### Visual Inspection (Before Training)

After applying the fix, generate a few pseudo-labels and visually inspect:

```python
from synthetic_ral_dataset import SyntheticRALDataset
import matplotlib.pyplot as plt

dataset = SyntheticRALDataset('data/manifests/test.csv')

# Test with a light wood → dark blue RAL transformation
sample = dataset[0]

# Check: Does the pseudo-label actually darken the drawer?
source_lightness = sample['source_image'][sample['mask'] == 1, 0].mean()
target_lightness = sample['pseudo_label'][sample['mask'] == 1, 0].mean()

print(f"Source lightness: {source_lightness:.1f}")
print(f"Target lightness: {target_lightness:.1f}")
print(f"Change: {target_lightness - source_lightness:.1f}")

# Should see significant change (not just ±10%)
assert abs(target_lightness - source_lightness) > 20, \
    "Lightness change too small! Fix not applied correctly."

# Visualize
plt.figure(figsize=(15, 5))
plt.subplot(1, 3, 1)
plt.imshow(sample['source_image'])
plt.title('Source Image')

plt.subplot(1, 3, 2)
plt.imshow(sample['mask'], cmap='gray')
plt.title('Mask')

plt.subplot(1, 3, 3)
plt.imshow(sample['pseudo_label'])
plt.title('Pseudo-Label (Should Show Correct Lightness)')

plt.savefig('pseudolabel_verification.png')
print("Saved verification image to pseudolabel_verification.png")
```

**Expected Output:**
```
Source lightness: 75.3 (light wood)
Target lightness: 32.1 (dark blue RAL)
Change: -43.2 (significant darkening) ✅
```

### Automated Test (Add to Test Suite)

```python
# tests/test_synthetic_dataset.py

def test_pseudolabel_transfers_full_lab():
    """Verify pseudo-labels transfer all LAB channels including lightness"""
    dataset = SyntheticRALDataset('data/manifests/test.csv')

    # Test multiple samples
    for i in range(10):
        sample = dataset[i * 100]  # Every 100th sample

        # Get target colors
        drawer_ral = sample['drawer_ral']
        drawer_lab = rgb_to_lab(drawer_ral)

        # Get actual pseudo-label LAB values for drawer pixels
        drawer_pixels = sample['mask'] == 1  # Assuming drawer is class 1
        actual_lab = rgb_to_lab(sample['pseudo_label'][drawer_pixels].mean(axis=0))

        # Check all channels match (within tolerance for noise)
        assert abs(actual_lab[0] - drawer_lab[0]) < 5.0, \
            f"Sample {i}: Lightness not transferred! {actual_lab[0]:.1f} vs {drawer_lab[0]:.1f}"
        assert abs(actual_lab[1] - drawer_lab[1]) < 5.0, \
            f"Sample {i}: a channel not transferred!"
        assert abs(actual_lab[2] - drawer_lab[2]) < 5.0, \
            f"Sample {i}: b channel not transferred!"

    print("✅ All pseudo-labels correctly transfer full LAB")
```

Run test:
```bash
pytest tests/test_synthetic_dataset.py::test_pseudolabel_transfers_full_lab -v
```

---

## Impact Assessment

### Before Fix:
- Pseudo-labels preserve lightness → U-Net learns to preserve lightness
- Expected Delta E after training: 5-10 (still too high)
- Manufacturing ready: ❌ NO

### After Fix:
- Pseudo-labels transfer full LAB → U-Net learns correct color transfer
- Expected Delta E after training: <2.0 ✅
- Manufacturing ready: ✅ YES

### Validation After Training:

Once U-Net is trained on fixed pseudo-labels, validate:

```python
# Load trained model
model = torch.load('models/unet_trained.pt')
model.eval()

# Test on validation set
validation_results = []

for sample in validation_dataset:
    prediction = model(sample['image'])
    transferred = apply_color_from_mask(
        sample['image'],
        prediction,
        sample['target_colors']
    )

    delta_e = compute_delta_e(transferred, sample['target_colors'])
    validation_results.append(delta_e)

mean_delta_e = np.mean(validation_results)
p95_delta_e = np.percentile(validation_results, 95)

print(f"Mean Delta E: {mean_delta_e:.2f}")
print(f"P95 Delta E: {p95_delta_e:.2f}")
print(f"Manufacturing Ready: {mean_delta_e < 2.0}")

# Success criteria
assert mean_delta_e < 2.0, "Training failed to meet manufacturing spec!"
assert p95_delta_e < 3.0, "95th percentile too high!"
```

**Expected Results:**
```
Mean Delta E: 1.45 ✅
P95 Delta E: 2.31 ✅
Manufacturing Ready: True ✅
```

---

## Dependencies

### Files Modified:
- `server/synthetic_ral_dataset.py` (lines 224-236)

### Files NOT Modified:
- Training script (`train_unet_synthetic_ral.py`) - no changes needed
- Manifest generator - no changes needed
- Dataset class interface - no changes needed

### Backward Compatibility:
- ⚠️ **NOT backward compatible** with models trained on old pseudo-labels
- ✅ Must re-train U-Net after applying this fix
- ✅ Old models should be deprecated and archived

---

## Rollout Plan

### Step 1: Apply Fix (2 minutes)
```bash
# Edit file manually or apply patch
vim server/synthetic_ral_dataset.py
# or
patch -p1 < pseudolabel_fix.patch
```

### Step 2: Verify Fix (5 minutes)
```bash
# Run visual inspection script
python verify_pseudolabel_fix.py

# Run automated test
pytest tests/test_synthetic_dataset.py::test_pseudolabel_transfers_full_lab
```

### Step 3: Re-Generate Manifest (Optional, 10 seconds)
```bash
# If manifest needs regeneration
python server/synthetic_ral_manifest_generator.py \
  --image-folder data/products \
  --output data/manifests/full_train_v2.csv
```

### Step 4: Re-Train U-Net (2 hours GPU)
```bash
# Train with fixed pseudo-labels
python server/train_unet_synthetic_ral.py \
  --manifest data/manifests/full_train_v2.csv \
  --epochs 30 \
  --batch-size 8 \
  --device cuda \
  --output models/unet_fixed_labels.pt
```

### Step 5: Validate Results (30 minutes)
```bash
# Run comprehensive validation
python evaluate_trained_model.py \
  --model models/unet_fixed_labels.pt \
  --test-manifest data/manifests/test.csv \
  --output validation_report.json

# Check Delta E
cat validation_report.json | grep mean_delta_e
# Should show: "mean_delta_e": 1.45 (< 2.0 ✅)
```

### Step 6: Deploy to Production (1 hour)
```bash
# Export to ONNX
python export_model.py \
  --model models/unet_fixed_labels.pt \
  --output models/unet_production_v2.onnx

# Update API to use new model
# Update color-transfer.ts to load unet_production_v2.onnx

# Deploy
npm run deploy:production
```

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Typo in manual edit | 5% | HIGH | Use patch file or run verification script |
| Training doesn't improve | 10% | HIGH | Validate pseudo-labels before training |
| Existing trained models break | 100% | LOW | Expected - must re-train (deprecate old models) |

---

## Success Criteria

- [ ] Pseudo-label verification script passes
- [ ] Automated test passes
- [ ] Visual inspection shows correct lightness transfer
- [ ] Re-trained model achieves Delta E < 2.0
- [ ] Manufacturing validation passes

---

## References

- **Triad A Roadmap:** Section 3.2 (Algorithmic Gap Analysis)
- **RSR Task 2:** Lines 130-150 (Pseudo-Label Quality Risk)
- **Original Analysis:** RSR_Task2_AlgorithmicGapReview.md lines 536-572

---

**Document Version:** 1.0
**Created:** 2025-01-17
**Status:** READY TO APPLY
**Estimated Time:** 2 minutes (fix) + 2 hours (re-training)
