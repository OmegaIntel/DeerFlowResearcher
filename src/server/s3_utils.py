import os
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from datetime import datetime
import uuid
from typing import Optional, Dict, List
import logging

logger = logging.getLogger(__name__)

class S3Manager:
    def __init__(self):
        self.bucket_name = os.getenv('S3_BUCKET_NAME', 'omegaintel-docs-b0308be5')
        try:
            # Initialize S3 client with credentials from environment
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
                region_name=os.getenv('AWS_REGION', 'us-east-1')
            )
        except NoCredentialsError:
            logger.error("AWS credentials not found")
            self.s3_client = None

    def upload_file(self, file_content: bytes, filename: str, content_type: str, user_id: str = "default") -> Dict:
        """Upload a file to S3 with metadata"""
        if not self.s3_client:
            raise Exception("S3 client not initialized")
        
        # Generate unique key with user folder
        file_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        key = f"uploads/{user_id}/{file_id}/{filename}"
        
        try:
            # Upload file with metadata
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=file_content,
                ContentType=content_type,
                Metadata={
                    'original_filename': filename,
                    'user_id': user_id,
                    'upload_time': timestamp,
                    'file_id': file_id
                }
            )
            
            return {
                'file_id': file_id,
                'key': key,
                'filename': filename,
                'content_type': content_type,
                'size': len(file_content),
                'upload_time': timestamp,
                'bucket': self.bucket_name
            }
        except ClientError as e:
            logger.error(f"Failed to upload file to S3: {e}")
            raise Exception(f"Upload failed: {str(e)}")

    def generate_presigned_url(self, key: str, expiration: int = 3600) -> str:
        """Generate a presigned URL for file access"""
        if not self.s3_client:
            raise Exception("S3 client not initialized")
        
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': key},
                ExpiresIn=expiration
            )
            return url
        except ClientError as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            raise Exception(f"Failed to generate URL: {str(e)}")

    def delete_file(self, key: str) -> bool:
        """Delete a file from S3"""
        if not self.s3_client:
            raise Exception("S3 client not initialized")
        
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
            return True
        except ClientError as e:
            logger.error(f"Failed to delete file from S3: {e}")
            raise Exception(f"Delete failed: {str(e)}")

    def list_user_files(self, user_id: str = "default") -> List[Dict]:
        """List all files for a user"""
        if not self.s3_client:
            raise Exception("S3 client not initialized")
        
        prefix = f"uploads/{user_id}/"
        files = []
        
        logger.info(f"Listing files from S3 bucket: {self.bucket_name}, prefix: {prefix}")
        
        try:
            paginator = self.s3_client.get_paginator('list_objects_v2')
            pages = paginator.paginate(Bucket=self.bucket_name, Prefix=prefix)
            
            for page in pages:
                logger.info(f"Page keys: {page.keys()}")
                if 'Contents' in page:
                    logger.info(f"Found {len(page['Contents'])} objects")
                    for obj in page['Contents']:
                        # Get object metadata
                        head_response = self.s3_client.head_object(
                            Bucket=self.bucket_name,
                            Key=obj['Key']
                        )
                        metadata = head_response.get('Metadata', {})
                        
                        # Extract file info
                        files.append({
                            'key': obj['Key'],
                            'size': obj['Size'],
                            'last_modified': obj['LastModified'].isoformat(),
                            'file_id': metadata.get('file_id', ''),
                            'original_filename': metadata.get('original_filename', obj['Key'].split('/')[-1]),
                            'upload_time': metadata.get('upload_time', obj['LastModified'].isoformat()),
                            'content_type': head_response.get('ContentType', 'application/octet-stream')
                        })
            
            return files
        except ClientError as e:
            logger.error(f"Failed to list files from S3: {e}")
            raise Exception(f"List failed: {str(e)}")

# Singleton instance
s3_manager = S3Manager()