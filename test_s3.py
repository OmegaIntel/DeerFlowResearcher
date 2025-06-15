#!/usr/bin/env python3
import os
import boto3
from botocore.exceptions import ClientError

# Load environment variables
bucket_name = os.getenv('S3_BUCKET_NAME', 'omegaintel-docs-b0308be5')
aws_access_key = os.getenv('AWS_ACCESS_KEY_ID')
aws_secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
aws_region = os.getenv('AWS_REGION', 'us-east-1')

print(f"Testing S3 connectivity...")
print(f"Bucket: {bucket_name}")
print(f"Region: {aws_region}")
print(f"Access Key exists: {bool(aws_access_key)}")
print(f"Secret Key exists: {bool(aws_secret_key)}")

if not aws_access_key or not aws_secret_key:
    print("ERROR: AWS credentials not found in environment variables")
    exit(1)

try:
    # Initialize S3 client
    s3_client = boto3.client(
        's3',
        aws_access_key_id=aws_access_key,
        aws_secret_access_key=aws_secret_key,
        region_name=aws_region
    )
    
    # Test 1: Check if bucket exists
    print("\nTest 1: Checking if bucket exists...")
    try:
        s3_client.head_bucket(Bucket=bucket_name)
        print(f"✓ Bucket '{bucket_name}' exists and is accessible")
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == '404':
            print(f"✗ Bucket '{bucket_name}' does not exist")
        elif error_code == '403':
            print(f"✗ Access denied to bucket '{bucket_name}'")
        else:
            print(f"✗ Error accessing bucket: {error_code}")
    
    # Test 2: List files in bucket
    print("\nTest 2: Listing files in bucket...")
    try:
        response = s3_client.list_objects_v2(Bucket=bucket_name, MaxKeys=5)
        if 'Contents' in response:
            print(f"✓ Found {response['KeyCount']} files (showing first 5):")
            for obj in response['Contents'][:5]:
                print(f"  - {obj['Key']} ({obj['Size']} bytes)")
        else:
            print("✓ Bucket is accessible but empty")
    except ClientError as e:
        print(f"✗ Error listing objects: {e}")
    
    # Test 3: Generate a presigned URL for a test file
    print("\nTest 3: Testing presigned URL generation...")
    test_key = "test/test-file.txt"
    try:
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': test_key},
            ExpiresIn=3600
        )
        print(f"✓ Generated presigned URL: {url[:100]}...")
    except ClientError as e:
        print(f"✗ Error generating presigned URL: {e}")
        
except Exception as e:
    print(f"\nERROR: Failed to initialize S3 client: {e}")