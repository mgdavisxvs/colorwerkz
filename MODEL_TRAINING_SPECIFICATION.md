# Model Training Specification for ColorWerkz Compatibility

## Overview
This specification defines the requirements and guidelines for training machine learning models in external systems that will be compatible with the ColorWerkz Model Management System. Following these specifications ensures seamless integration, testing, and deployment of your trained models.

## Table of Contents
1. [Supported Model Formats](#supported-model-formats)
2. [Task Types and Requirements](#task-types-and-requirements)
3. [Input/Output Specifications](#inputoutput-specifications)
4. [Training Guidelines](#training-guidelines)
5. [Export Instructions](#export-instructions)
6. [Validation Checklist](#validation-checklist)
7. [Example Training Scripts](#example-training-scripts)

## Supported Model Formats

### 1. ONNX (Recommended)
**File Extensions:** `.onnx`
**Advantages:** 
- Cross-platform compatibility
- Optimized inference
- Framework agnostic
- Best performance in production

**Requirements:**
- ONNX opset version 10-17
- Input/output tensor names must be clearly defined
- Dynamic axes should be specified for batch size flexibility

### 2. PyTorch
**File Extensions:** `.pt`, `.pth`
**Advantages:**
- Native Python integration
- Full model flexibility
- Easy debugging

**Requirements:**
- PyTorch version 1.9.0 or higher
- Models must be saved with `torch.save()`
- Include model architecture or use TorchScript for self-contained models

### 3. TorchScript
**File Extensions:** `.pt` (scripted/traced)
**Advantages:**
- Optimized inference
- No Python dependency at runtime
- Production ready

**Requirements:**
- Use `torch.jit.script()` or `torch.jit.trace()`
- Ensure all operations are TorchScript compatible
- Test with sample inputs before export

### 4. TensorFlow
**File Extensions:** `.pb`, `.h5`
**Advantages:**
- Wide ecosystem support
- Mobile deployment options

**Requirements:**
- TensorFlow 2.x
- SavedModel format preferred
- Include signature definitions

## Task Types and Requirements

### 1. Segmentation
**Purpose:** Identify and segment furniture components (drawer, frame, handle)

**Model Requirements:**
- **Input:** RGB image tensor `[batch, 3, height, width]`
- **Output:** Segmentation mask `[batch, num_classes, height, width]`
- **Classes:** 
  - 0: Background
  - 1: Drawer
  - 2: Frame
  - 3: Handle
  - 4: Surface
  - 5: Other

**Metrics Tracked:**
- IoU (Intersection over Union)
- Pixel accuracy
- Class-wise precision/recall

### 2. Color Transfer
**Purpose:** Transfer RAL colors between furniture images

**Model Requirements:**
- **Input:** 
  - Source image: `[batch, 3, height, width]`
  - Target colors: `[batch, num_regions, 3]` (RGB values)
- **Output:** Transformed image `[batch, 3, height, width]`

**Metrics Tracked:**
- Color accuracy (Delta E)
- Structural similarity (SSIM)
- RAL compliance score

### 3. Classification
**Purpose:** Classify furniture types or quality levels

**Model Requirements:**
- **Input:** RGB image `[batch, 3, height, width]`
- **Output:** Class probabilities `[batch, num_classes]`

**Metrics Tracked:**
- Accuracy
- Precision/Recall per class
- Confusion matrix

### 4. Detection
**Purpose:** Detect specific furniture components or defects

**Model Requirements:**
- **Input:** RGB image `[batch, 3, height, width]`
- **Output:** 
  - Bounding boxes: `[num_detections, 4]` (x1, y1, x2, y2)
  - Class labels: `[num_detections]`
  - Confidence scores: `[num_detections]`

**Metrics Tracked:**
- mAP (mean Average Precision)
- Precision/Recall curves
- F1 score

## Input/Output Specifications

### Standard Input Dimensions
```python
# Recommended input sizes for optimal performance
STANDARD_SIZES = {
    'small': (256, 256),
    'medium': (512, 512),
    'large': (1024, 1024)
}

# Input normalization
NORMALIZATION = {
    'mean': [0.485, 0.456, 0.406],  # ImageNet standard
    'std': [0.229, 0.224, 0.225]
}
```

### Color Space Requirements
- **Input:** RGB color space (0-255 or normalized 0-1)
- **RAL Colors:** Must map to official RAL color codes
- **Output:** Same color space as input

### Data Type Requirements
- **Float32** preferred for inference
- **Float16** supported for optimized models
- **INT8** quantization supported with calibration

## Training Guidelines

### 1. Dataset Preparation
```python
# Required dataset structure
dataset/
├── images/
│   ├── train/
│   ├── val/
│   └── test/
├── annotations/
│   ├── train.json  # COCO format preferred
│   ├── val.json
│   └── test.json
└── metadata.json   # Dataset statistics
```

### 2. Augmentation Strategy
**Recommended augmentations for furniture images:**
- Rotation: ±15 degrees
- Scale: 0.8-1.2x
- Brightness: ±20%
- Color jitter: ±10%
- Horizontal flip: 50% probability
- RAL color variations (for color transfer tasks)

### 3. Loss Functions
**Segmentation:**
```python
loss = CrossEntropyLoss + 0.5 * DiceLoss
```

**Color Transfer:**
```python
loss = L1Loss + 0.1 * PerceptualLoss + 0.01 * StyleLoss
```

**Classification/Detection:**
```python
loss = CrossEntropyLoss  # or FocalLoss for imbalanced data
```

### 4. Training Parameters
```python
TRAINING_CONFIG = {
    'batch_size': 16,
    'learning_rate': 1e-4,
    'optimizer': 'AdamW',
    'scheduler': 'CosineAnnealingLR',
    'epochs': 100,
    'early_stopping_patience': 10,
    'gradient_clip_val': 1.0
}
```

## Export Instructions

### PyTorch to ONNX
```python
import torch
import torch.onnx

# Load your trained model
model = YourModel()
model.load_state_dict(torch.load('model.pth'))
model.eval()

# Create dummy input
dummy_input = torch.randn(1, 3, 256, 256)

# Export to ONNX
torch.onnx.export(
    model,
    dummy_input,
    "model.onnx",
    export_params=True,
    opset_version=11,
    do_constant_folding=True,
    input_names=['input'],
    output_names=['output'],
    dynamic_axes={
        'input': {0: 'batch_size'},
        'output': {0: 'batch_size'}
    }
)
```

### TensorFlow to SavedModel
```python
import tensorflow as tf

# Save the model
model.save('model_savedmodel', save_format='tf')

# Or for Keras H5
model.save('model.h5')
```

### TorchScript Export
```python
import torch

# Method 1: Scripting (preferred for models with control flow)
scripted_model = torch.jit.script(model)
scripted_model.save("model_scripted.pt")

# Method 2: Tracing (for simple feed-forward models)
example_input = torch.rand(1, 3, 256, 256)
traced_model = torch.jit.trace(model, example_input)
traced_model.save("model_traced.pt")
```

## Validation Checklist

### Pre-Export Validation
- [ ] Model achieves target metrics on validation set
- [ ] Input/output shapes match specification
- [ ] Model runs without errors on sample inputs
- [ ] Memory usage is within acceptable limits (<2GB)
- [ ] Inference time meets requirements (<100ms for real-time)

### Post-Export Validation
- [ ] Exported model loads successfully
- [ ] Output matches original model (within tolerance)
- [ ] File size is reasonable (<500MB)
- [ ] Model metadata includes version and description

### Integration Testing
```python
# Test script for ColorWerkz compatibility
def test_model_compatibility(model_path):
    """Test if model is compatible with ColorWerkz"""
    
    # 1. Load model
    if model_path.endswith('.onnx'):
        import onnxruntime as ort
        session = ort.InferenceSession(model_path)
        
    # 2. Check input/output specs
    inputs = session.get_inputs()
    outputs = session.get_outputs()
    
    # 3. Run inference test
    test_input = np.random.randn(1, 3, 256, 256).astype(np.float32)
    result = session.run(None, {inputs[0].name: test_input})
    
    # 4. Validate output shape
    assert result[0].shape[0] == 1  # Batch dimension
    
    print("✅ Model is compatible with ColorWerkz")
    return True
```

## Example Training Scripts

### 1. Segmentation Model (PyTorch)
```python
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import transforms

class FurnitureSegmentationModel(nn.Module):
    def __init__(self, num_classes=6):
        super().__init__()
        # Use pretrained backbone
        self.backbone = torch.hub.load(
            'pytorch/vision:v0.10.0', 
            'deeplabv3_resnet50', 
            pretrained=True
        )
        # Modify for furniture classes
        self.backbone.classifier[4] = nn.Conv2d(256, num_classes, 1)
        
    def forward(self, x):
        return self.backbone(x)['out']

# Training loop
def train_segmentation_model(train_loader, val_loader, epochs=50):
    model = FurnitureSegmentationModel()
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4)
    criterion = nn.CrossEntropyLoss()
    
    for epoch in range(epochs):
        model.train()
        for batch in train_loader:
            images, masks = batch
            
            # Forward pass
            outputs = model(images)
            loss = criterion(outputs, masks)
            
            # Backward pass
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
        
        # Validation
        model.eval()
        with torch.no_grad():
            # Calculate metrics
            pass
    
    return model
```

### 2. Color Transfer Model (PyTorch)
```python
class ColorTransferModel(nn.Module):
    def __init__(self):
        super().__init__()
        # Encoder
        self.encoder = nn.Sequential(
            nn.Conv2d(3, 64, 3, padding=1),
            nn.ReLU(),
            nn.Conv2d(64, 128, 3, stride=2, padding=1),
            nn.ReLU(),
        )
        
        # Color injection
        self.color_transform = nn.Linear(6, 128)  # 2 RAL colors (RGB each)
        
        # Decoder
        self.decoder = nn.Sequential(
            nn.ConvTranspose2d(256, 64, 3, stride=2, padding=1, output_padding=1),
            nn.ReLU(),
            nn.Conv2d(64, 3, 3, padding=1),
            nn.Sigmoid()
        )
    
    def forward(self, image, target_colors):
        # Encode image
        features = self.encoder(image)
        
        # Process colors
        color_features = self.color_transform(target_colors)
        color_features = color_features.unsqueeze(2).unsqueeze(3)
        color_features = color_features.expand(-1, -1, features.size(2), features.size(3))
        
        # Combine and decode
        combined = torch.cat([features, color_features], dim=1)
        output = self.decoder(combined)
        
        return output
```

## Testing with ColorWerkz

### Upload Process
1. Navigate to Color Transfer page → Model Manager tab
2. Click "Upload Model"
3. Select your exported model file
4. Choose appropriate task type
5. Add descriptive name and version
6. Upload and wait for validation

### Testing Process
1. Select uploaded model from library
2. Click "Test" button
3. Choose test dataset (or use default)
4. Review metrics:
   - Accuracy
   - Precision/Recall
   - F1 Score
   - Inference time
   - Memory usage

### Comparison Process
1. Select 2+ models for comparison
2. Click "Compare Models"
3. System will test on same dataset
4. Review ranking and best performer

## Common Issues and Solutions

### Issue: Model fails to load
**Solution:** Ensure ONNX opset version ≤17, or use minimal providers

### Issue: Input shape mismatch
**Solution:** Use dynamic axes in ONNX export, or standardize to 256x256

### Issue: Poor performance metrics
**Solution:** Check normalization, ensure training data matches ColorWerkz format

### Issue: Slow inference
**Solution:** Use TorchScript or ONNX, enable optimization flags

### Issue: Memory errors
**Solution:** Reduce model size, use quantization, or batch size = 1

## Support and Resources

### Documentation
- ONNX Export Guide: https://pytorch.org/docs/stable/onnx.html
- TorchScript Tutorial: https://pytorch.org/tutorials/advanced/cpp_export.html
- TensorFlow SavedModel: https://www.tensorflow.org/guide/saved_model

### RAL Color Standards
- Official RAL colors are defined in `server/ral_colors.json`
- Use exact RGB values for training
- Test with ColorWerkz validation panel

### Contact
For integration support or custom requirements, consult the ColorWerkz development team.

---

**Version:** 1.0
**Last Updated:** 2025-08-20
**Status:** Production Ready