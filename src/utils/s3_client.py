import boto3
import os
import logging
from typing import Optional, Dict, Any
from botocore.exceptions import ClientError, NoCredentialsError
from datetime import datetime, timedelta
import uuid

logger = logging.getLogger(__name__)


class S3Client:
    def __init__(self):
        self.bucket_name = os.getenv("AWS_S3_BUCKET", "deer-flow-documents")
        self.region = os.getenv("AWS_REGION", "us-east-1")
        
        try:
            # Initialize S3 client
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
                aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
                region_name=self.region
            )
            
            # Test connection
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            logger.info(f"S3 client initialized successfully for bucket: {self.bucket_name}")
            
        except NoCredentialsError:
            logger.error("AWS credentials not found")
            self.s3_client = None
        except ClientError as e:
            logger.error(f"Error initializing S3 client: {e}")
            self.s3_client = None
        except Exception as e:
            logger.error(f"Unexpected error initializing S3: {e}")
            self.s3_client = None

    def is_available(self) -> bool:
        """Check if S3 client is available"""
        return self.s3_client is not None

    def generate_file_key(self, user_id: str, filename: str) -> str:
        """Generate a unique S3 key for a file"""
        timestamp = datetime.utcnow().strftime("%Y/%m/%d")
        file_uuid = str(uuid.uuid4())
        # Sanitize filename
        safe_filename = "".join(c for c in filename if c.isalnum() or c in "._-")
        return f"documents/{user_id}/{timestamp}/{file_uuid}_{safe_filename}"

    def upload_file(self, file_content: bytes, file_key: str, content_type: str, 
                   metadata: Optional[Dict[str, str]] = None) -> bool:
        """Upload file to S3"""
        if not self.is_available():
            logger.error("S3 client not available")
            return False

        try:
            extra_args = {
                'ContentType': content_type,
                'ServerSideEncryption': 'AES256'
            }
            
            if metadata:
                extra_args['Metadata'] = metadata

            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=file_key,
                Body=file_content,
                **extra_args
            )
            
            logger.info(f"File uploaded successfully: {file_key}")
            return True

        except ClientError as e:
            logger.error(f"Error uploading file to S3: {e}")
            return False

    def generate_presigned_url(self, file_key: str, expiration: int = 3600) -> Optional[str]:
        """Generate a presigned URL for file download"""
        if not self.is_available():
            logger.error("S3 client not available")
            return None

        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': file_key},
                ExpiresIn=expiration
            )
            return url

        except ClientError as e:
            logger.error(f"Error generating presigned URL: {e}")
            return None

    def delete_file(self, file_key: str) -> bool:
        """Delete file from S3"""
        if not self.is_available():
            logger.error("S3 client not available")
            return False

        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=file_key)
            logger.info(f"File deleted successfully: {file_key}")
            return True

        except ClientError as e:
            logger.error(f"Error deleting file from S3: {e}")
            return False

    def get_file_info(self, file_key: str) -> Optional[Dict[str, Any]]:
        """Get file metadata from S3"""
        if not self.is_available():
            logger.error("S3 client not available")
            return None

        try:
            response = self.s3_client.head_object(Bucket=self.bucket_name, Key=file_key)
            return {
                'size': response.get('ContentLength'),
                'last_modified': response.get('LastModified'),
                'content_type': response.get('ContentType'),
                'metadata': response.get('Metadata', {})
            }

        except ClientError as e:
            logger.error(f"Error getting file info from S3: {e}")
            return None


# Global S3 client instance
s3_client = S3Client()