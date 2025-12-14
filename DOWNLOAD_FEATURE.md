# Enhanced Download Feature

## Overview

The download functionality has been enhanced to include the original Converse API request parameters alongside the generated image. This allows users to recreate or understand exactly how each image was generated.

## What's New

When you click the download button on any generated image, you now get:

1. **The image file** (as before) - `image-{id}.{extension}`
2. **A JSON file** with the Converse API parameters - `image-{id}-converse-params.json`

## JSON File Contents

The JSON file contains the exact parameters that were sent to the Amazon Bedrock Converse API:

### For Text-to-Image Generation
```json
{
  "modelId": "us.amazon.nova-2-omni-v1:0",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "text": "A beautiful sunset over mountains"
        }
      ]
    }
  ]
}
```

### For Image Editing
```json
{
  "modelId": "us.amazon.nova-2-omni-v1:0",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "image": {
            "format": "jpeg",
            "source": {
              "_base64": "base64-encoded-source-image-data"
            }
          }
        },
        {
          "text": "Make it more colorful"
        }
      ]
    }
  ]
}
```

## Key Features

- **Complete API Recreation**: The JSON contains all parameters needed to recreate the exact API call
- **Base64 Source Images**: For image editing scenarios, the original source image is included as base64 data
- **Automatic Detection**: The system automatically detects image formats and creates appropriate file extensions
- **Backward Compatibility**: Images generated before this feature won't have JSON files, but the download still works

## Technical Implementation

- **Type Safety**: New `ConverseRequestParams` type ensures proper structure
- **Database Storage**: Parameters are stored in SQLite alongside image metadata
- **Memory Efficient**: Source images are converted to base64 only when needed for storage


## Use Cases

1. **API Learning**: Understand exactly how to structure Converse API calls
2. **Batch Processing**: Use the parameters to recreate similar images programmatically
3. **Debugging**: Troubleshoot generation issues by examining the exact parameters used
4. **Documentation**: Keep records of successful prompts and configurations
5. **Sharing**: Share both the result and the method with others

## File Naming Convention

- Image: `image-{unique-id}.{png|jpg|gif|webp}`
- JSON: `image-{unique-id}-converse-params.json`

Both files use the same unique ID, making it easy to match them together.

## Troubleshooting



### Missing JSON Downloads

- **New Images**: Only images generated after this update will have JSON files
- **Old Images**: Images created before this feature will only download the image file (no JSON)
- **Check Console**: Any download errors will be logged to the browser console

### Performance


- **Storage**: JSON files are small (typically 1-5KB) but will increase overall storage usage slightly