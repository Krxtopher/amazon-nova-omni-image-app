#!/usr/bin/env python3
"""
Setup script for icon embedding generation.
Installs required dependencies and verifies AWS configuration.
"""

import subprocess
import sys
import os


def install_requirements():
    """Install required Python packages."""
    print("Checking required packages...")
    try:
        # Check if packages are already installed
        import boto3
        import dotenv

        print("✓ Required packages are already installed")
        return True
    except ImportError as e:
        print(f"Installing missing packages: {e}")
        try:
            subprocess.check_call(
                [sys.executable, "-m", "pip", "install", "-r", "requirements.txt"]
            )
            print("✓ Successfully installed requirements")
            return True
        except subprocess.CalledProcessError as e:
            print(f"✗ Failed to install requirements: {e}")
            return False


def check_aws_config():
    """Check if AWS configuration is available."""
    print("\nChecking AWS configuration...")

    # Check for .env file
    env_file = "../.env"
    if os.path.exists(env_file):
        print("✓ Found .env file")

        # Check if required variables are set
        with open(env_file, "r") as f:
            content = f.read()

        required_vars = [
            "VITE_AWS_ACCESS_KEY_ID",
            "VITE_AWS_SECRET_ACCESS_KEY",
            "VITE_AWS_REGION",
        ]
        missing_vars = []

        for var in required_vars:
            if (
                f"{var}=" not in content
                or f"{var}=" in content
                and content.split(f"{var}=")[1].split("\n")[0].strip() == ""
            ):
                missing_vars.append(var)

        if missing_vars:
            print(
                f"✗ Missing or empty AWS configuration variables: {', '.join(missing_vars)}"
            )
            print("Please update the .env file with your AWS credentials")
            return False
        else:
            print("✓ AWS configuration variables found")
            return True
    else:
        print("✗ .env file not found")
        print("Please create a .env file with your AWS credentials")
        return False


def main():
    """Main setup function."""
    print("Setting up icon embedding generation environment...\n")

    # Install requirements
    if not install_requirements():
        return False

    # Check AWS configuration
    if not check_aws_config():
        return False

    print("\n✓ Setup completed successfully!")
    print("You can now run: python icon_embedding_generator.py")
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
