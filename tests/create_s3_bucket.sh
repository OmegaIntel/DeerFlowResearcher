#!/bin/bash

# AWS S3 bucket creation script for clean company data

BUCKET_NAME="clean-company-data"
REGION="us-east-1"

echo "Creating S3 bucket: $BUCKET_NAME in region $REGION"

# Create the bucket
aws s3api create-bucket \
    --bucket $BUCKET_NAME \
    --region $REGION \
    --acl private

# Enable versioning for data backup
aws s3api put-bucket-versioning \
    --bucket $BUCKET_NAME \
    --versioning-configuration Status=Enabled

# Create lifecycle policy to move old versions to Glacier after 30 days
cat > /tmp/lifecycle-policy.json << EOF
{
    "Rules": [
        {
            "ID": "Archive old versions",
            "Status": "Enabled",
            "NoncurrentVersionTransitions": [
                {
                    "NoncurrentDays": 30,
                    "StorageClass": "GLACIER"
                }
            ],
            "NoncurrentVersionExpiration": {
                "NoncurrentDays": 365
            }
        }
    ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
    --bucket $BUCKET_NAME \
    --lifecycle-configuration file:///tmp/lifecycle-policy.json

# Add bucket policy for secure access
cat > /tmp/bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "DenyInsecureConnections",
            "Effect": "Deny",
            "Principal": "*",
            "Action": "s3:*",
            "Resource": [
                "arn:aws:s3:::$BUCKET_NAME/*",
                "arn:aws:s3:::$BUCKET_NAME"
            ],
            "Condition": {
                "Bool": {
                    "aws:SecureTransport": "false"
                }
            }
        }
    ]
}
EOF

aws s3api put-bucket-policy \
    --bucket $BUCKET_NAME \
    --policy file:///tmp/bucket-policy.json

# Create folder structure
aws s3api put-object --bucket $BUCKET_NAME --key original-data/
aws s3api put-object --bucket $BUCKET_NAME --key cleaned-data/
aws s3api put-object --bucket $BUCKET_NAME --key reports/
aws s3api put-object --bucket $BUCKET_NAME --key intermediate/

echo "S3 bucket $BUCKET_NAME created successfully!"
echo "Folders created:"
echo "  - original-data/ : For backing up original Non-PPP data"
echo "  - cleaned-data/  : For storing cleaned datasets"
echo "  - reports/       : For data quality and cleaning reports"
echo "  - intermediate/  : For batch processing checkpoints"

# Clean up temp files
rm -f /tmp/lifecycle-policy.json /tmp/bucket-policy.json