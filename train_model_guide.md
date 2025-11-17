# How to Train the Model with Your Photos

## Step 1: Prepare Your Images

1. **Add your workbench photos** to the `training_images/` folder
   - Supported formats: `.jpg`, `.jpeg`, `.png`
   - Recommended: At least 20-50 images for good results
   - Include various color combinations

2. **Naming convention** (optional but helpful):
   ```
   workbench_blue_white_001.jpg  (drawer_frame_number)
   workbench_red_black_002.jpg
   workbench_green_red_003.jpg
   ```

## Step 2: Create Annotations

Edit the `training_annotations.json` file to specify colors for each image:

```json
{
  "workbench_blue_white_001.jpg": {
    "drawer_ral": "RAL 5015",  // Blue
    "frame_ral": "RAL 9002"    // White
  },
  "workbench_red_black_002.jpg": {
    "drawer_ral": "RAL 3000",  // Red
    "frame_ral": "RAL 9005"    // Black
  }
}
```

## Step 3: Run the Training

Simply run the training script:

```bash
python server/simple_train.py
```

The script will:
- Load your images automatically
- Train for 50 epochs (takes 10-30 minutes)
- Save the model to `models/workbench_model.pth`
- Show training progress

## Step 4: Use the Trained Model

The model will automatically be used by the Image Analysis page once training is complete.

## Available RAL Colors for Training

- RAL 3000 - Flame Red
- RAL 3020 - Traffic Red  
- RAL 5002 - Ultramarine Blue
- RAL 5015 - Sky Blue
- RAL 6018 - Yellow Green
- RAL 7016 - Anthracite Grey
- RAL 7035 - Light Grey
- RAL 9002 - Grey White
- RAL 9005 - Jet Black
- RAL 9010 - Pure White
- RAL 1023 - Traffic Yellow
- RAL 2004 - Pure Orange
- RAL 4010 - Telemagenta
- RAL 6029 - Mint Green

## Tips for Best Results

1. **Diverse angles**: Include photos from different angles
2. **Consistent lighting**: Use similar lighting conditions
3. **Clear images**: Avoid blurry or dark photos
4. **Balanced dataset**: Include equal numbers of each color combination
5. **Background variety**: Include different backgrounds if possible

## Adding More Images Later

You can add more images anytime and retrain:
1. Add new images to `training_images/`
2. Update `training_annotations.json`
3. Run `python server/simple_train.py` again

The model will improve with more training data!