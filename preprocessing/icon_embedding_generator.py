#!/usr/bin/env python3
"""
Icon Embedding Generator

This script loads the lucide-icons.json file and generates embeddings for each icon
using Amazon Bedrock's Nova Multimodal Embeddings model. The embeddings are saved
to icon-index-embeddings.json for use in icon search functionality.
"""

import json
import boto3
import os
from typing import List, Dict, Any
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


def load_icons_data(file_path: str) -> List[Dict[str, Any]]:
    """Load the lucide icons data from JSON file."""
    try:
        with open(file_path, "r", encoding="utf-8") as file:
            return json.load(file)
    except FileNotFoundError:
        print(f"Error: Could not find {file_path}")
        return []
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {file_path}: {e}")
        return []


def create_bedrock_client():
    """Create and configure the Bedrock Runtime client."""
    # Get AWS credentials from environment variables
    aws_access_key_id = os.getenv("VITE_AWS_ACCESS_KEY_ID")
    aws_secret_access_key = os.getenv("VITE_AWS_SECRET_ACCESS_KEY")
    aws_region = os.getenv("VITE_AWS_REGION", "us-east-1")

    if not aws_access_key_id or not aws_secret_access_key:
        print("Error: AWS credentials not found in environment variables")
        print("Please set VITE_AWS_ACCESS_KEY_ID and VITE_AWS_SECRET_ACCESS_KEY")
        return None

    try:
        client = boto3.client(
            service_name="bedrock-runtime",
            region_name=aws_region,
            aws_access_key_id=aws_access_key_id,
            aws_secret_access_key=aws_secret_access_key,
        )
        return client
    except Exception as e:
        print(f"Error creating Bedrock client: {e}")
        return None


def generate_embedding(client, text: str) -> List[float]:
    """Generate embedding for the given text using Nova Multimodal Embeddings."""
    request_body = {
        "taskType": "SINGLE_EMBEDDING",
        "singleEmbeddingParams": {
            "embeddingPurpose": "GENERIC_INDEX",
            "embeddingDimension": 3072,  # Using 1024 for balance of accuracy and storage
            "text": {"truncationMode": "END", "value": text},
        },
    }

    try:
        response = client.invoke_model(
            body=json.dumps(request_body),
            modelId="amazon.nova-2-multimodal-embeddings-v1:0",
            accept="application/json",
            contentType="application/json",
        )

        response_body = json.loads(response.get("body").read())

        # Extract the embedding from the response
        if "embeddings" in response_body and len(response_body["embeddings"]) > 0:
            return response_body["embeddings"][0]["embedding"]
        else:
            print(f"Error: No embeddings found in response for text: {text}")
            return []

    except Exception as e:
        print(f"Error generating embedding for text '{text}': {e}")
        return []


def format_icon_text(icon_id: str, concepts: List[str]) -> str:
    """Format the icon data into the required string format."""
    concepts_str = ", ".join(concepts)
    return f"Use the {icon_id} to represent any of the following artistic concepts: {concepts_str}"


def save_embeddings(embeddings_data: List[Dict[str, Any]], output_file: str):
    """Save the embeddings data to a JSON file."""
    try:
        with open(output_file, "w", encoding="utf-8") as file:
            json.dump(embeddings_data, file, indent=2, ensure_ascii=False)
        print(f"Successfully saved {len(embeddings_data)} embeddings to {output_file}")
    except Exception as e:
        print(f"Error saving embeddings to {output_file}: {e}")


def main():
    """Main function to generate embeddings for all icons."""
    print("Starting icon embedding generation...")

    # Load icons data
    icons_data = load_icons_data("lucide-icons.json")
    if not icons_data:
        print("No icons data loaded. Exiting.")
        return

    print(f"Loaded {len(icons_data)} icons")

    # Create Bedrock client
    bedrock_client = create_bedrock_client()
    if not bedrock_client:
        print("Failed to create Bedrock client. Exiting.")
        return

    # Generate embeddings for each icon
    embeddings_data = []
    total_icons = len(icons_data)

    for i, icon in enumerate(icons_data, 1):
        icon_id = icon.get("iconId", "")
        concepts = icon.get("concepts", [])

        if not icon_id or not concepts:
            print(f"Skipping icon {i}: Missing iconId or concepts")
            continue

        # Format the text for embedding
        text_input = format_icon_text(icon_id, concepts)

        print(f"Processing {i}/{total_icons}: {icon_id}")

        # Generate embedding
        embedding = generate_embedding(bedrock_client, text_input)

        if embedding:
            embeddings_data.append({"iconId": icon_id, "embedding": embedding})
            print(f"  ✓ Generated embedding with {len(embedding)} dimensions")
        else:
            print(f"  ✗ Failed to generate embedding for {icon_id}")

    # Save results
    if embeddings_data:
        save_embeddings(embeddings_data, "icon-index-embeddings.json")
        print(
            f"\nCompleted! Generated embeddings for {len(embeddings_data)}/{total_icons} icons"
        )
    else:
        print("No embeddings were generated successfully.")


if __name__ == "__main__":
    main()
