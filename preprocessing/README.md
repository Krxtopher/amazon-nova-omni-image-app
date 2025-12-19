# Icon Embedding Generator

This script generates embeddings for Lucide icons using Amazon Bedrock's Nova Multimodal Embeddings model. The embeddings can be used for semantic icon search functionality.

## Prerequisites

1. **Python 3.7+** installed on your system
2. **AWS Account** with access to Amazon Bedrock
3. **Nova Multimodal Embeddings model** enabled in your AWS account
4. **AWS Credentials** configured

## Setup

1. **Activate the virtual environment:**
   ```bash
   source .venv/bin/activate
   ```
   
   Note: The project uses a local `.venv` virtual environment. Make sure to activate it before running any Python commands.

2. **Install dependencies (if needed):**
   
   The required packages (boto3, python-dotenv) should already be installed in the virtual environment. If not:
   ```bash
   cd preprocessing
   pip install -r requirements.txt
   ```

2. **Configure AWS credentials:**
   
   Make sure the `.env` file in the parent directory contains your AWS credentials:
   ```
   VITE_AWS_REGION=us-east-1
   VITE_AWS_ACCESS_KEY_ID=your_access_key_here
   VITE_AWS_SECRET_ACCESS_KEY=your_secret_key_here
   ```

## Usage

Run the embedding generator:

```bash
# From the project root
source .venv/bin/activate
cd preprocessing
python icon_embedding_generator.py
```

The script will:

1. Load icon data from `lucide-icons.json`
2. Generate embeddings for each icon using the format: `"<iconId>: <comma delimited list of concepts>"`
3. Save the results to `icon-index-embeddings.json`

## Output Format

The generated `icon-index-embeddings.json` file will contain:

```json
[
  {
    "iconId": "Accessibility",
    "embedding": [0.031115104, 0.032478657, 0.10006265, ...]
  },
  {
    "iconId": "Activity", 
    "embedding": [0.045231567, 0.023456789, 0.08765432, ...]
  }
]
```

## Configuration Options

You can modify the following parameters in `icon_embedding_generator.py`:

- **Embedding Dimension**: Currently set to 1024 (balance of accuracy and storage)
  - Options: 256, 384, 1024, 3072
- **Embedding Purpose**: Set to "GENERIC_INDEX" for general search use
- **Model ID**: Uses "amazon.nova-2-multimodal-embeddings-v1:0"

## Troubleshooting

### Common Issues

1. **AWS Credentials Error**
   - Ensure your AWS credentials are correctly set in the `.env` file
   - Verify your AWS account has access to Amazon Bedrock
   - Check that the Nova Multimodal Embeddings model is enabled

2. **Model Access Error**
   - The Nova Multimodal Embeddings model must be enabled in your AWS Bedrock console
   - Ensure you're using the correct AWS region (us-east-1 recommended)

3. **Rate Limiting**
   - The script processes icons sequentially to avoid rate limits
   - If you encounter rate limiting, the script will show error messages for affected icons

### Error Messages

- `"AWS credentials not found"`: Check your `.env` file configuration
- `"No embeddings found in response"`: Verify model access and request format
- `"Error generating embedding"`: Check network connectivity and AWS permissions

## Files

- `icon_embedding_generator.py`: Main script
- `lucide-icons.json`: Input file with icon data
- `icon-index-embeddings.json`: Output file with embeddings (generated)
- `requirements.txt`: Python dependencies
- `setup.py`: Setup and verification script
- `README.md`: This documentation

## Cost Considerations

Each embedding generation request to Nova Multimodal Embeddings incurs a small cost. With ~400 icons in the Lucide set, the total cost should be minimal (typically under $1 USD).

For the latest pricing information, check the [Amazon Bedrock Pricing page](https://aws.amazon.com/bedrock/pricing/).