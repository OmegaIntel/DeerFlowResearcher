# AWS Migration Steps - Complete Guide

## Current Status
- ✅ Migration scripts created
- ✅ Docker configurations ready
- ❌ AWS credentials not configured
- ❌ ElastiCache not created
- ❌ Database not migrated

## Step-by-Step Instructions

### Step 1: Configure AWS Credentials

1. **Edit the .env.aws file**:
   ```bash
   nano .env.aws
   ```

2. **Replace the placeholder values** with your actual credentials:
   - `AWS_ACCESS_KEY_ID`: Your AWS access key
   - `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
   - `AWS_RDS_USERNAME`: Your RDS MySQL username
   - `AWS_RDS_PASSWORD`: Your RDS MySQL password
   - All API keys (OPENBB_PAT, ALPHA_VANTAGE_API_KEY, etc.)

3. **Save the file** (Ctrl+X, then Y, then Enter)

### Step 2: Run the Quick Setup

```bash
cd aws-migration
./quick-setup.sh
```

This script will:
- Configure AWS CLI
- Test RDS connection
- Create ElastiCache cluster
- Wait for it to be ready
- Migrate your data
- Start the application

### Alternative: Manual Steps

If the quick setup fails, run these commands manually:

1. **Setup AWS credentials**:
   ```bash
   cd aws-migration
   ./setup-aws-credentials.sh
   ```

2. **Test RDS connection**:
   ```bash
   ./check-rds-connection.sh
   ```
   
   If this fails:
   - Check your RDS credentials
   - Ensure RDS security group allows your IP
   - Your IP is: `curl -s ifconfig.me`

3. **Create ElastiCache**:
   ```bash
   ./setup-elasticache.sh
   ```

4. **Wait for ElastiCache** (5-10 minutes):
   ```bash
   # Check status every minute
   ./check-elasticache-status.sh
   ```

5. **Run database migration**:
   ```bash
   cd ..
   python3 aws-migration/migrate-sqlite-to-mysql.py
   ```

6. **Start application**:
   ```bash
   cp .env.aws .env
   docker-compose -f docker-compose.aws.yml up -d
   ```

### Step 3: Test the Application

Run the test script:
```bash
cd /root/openBB
./test-aws-migration.sh
```

Or test manually:
- Backend API: http://localhost:8000/docs
- Frontend: http://localhost:3000
- Health check: `curl http://localhost:8000/health`

### Troubleshooting

1. **RDS Connection Issues**:
   ```bash
   # Add your IP to RDS security group
   aws ec2 authorize-security-group-ingress \
     --group-id <your-rds-sg-id> \
     --protocol tcp \
     --port 3306 \
     --cidr $(curl -s ifconfig.me)/32
   ```

2. **ElastiCache Issues**:
   ```bash
   # Check cluster status
   aws elasticache describe-cache-clusters \
     --cache-cluster-id openbb-redis \
     --show-cache-node-info
   ```

3. **Application Issues**:
   ```bash
   # View logs
   docker-compose -f docker-compose.aws.yml logs -f backend
   
   # Restart services
   docker-compose -f docker-compose.aws.yml restart
   ```

### Required Information

Before starting, ensure you have:
- [ ] AWS Access Key ID
- [ ] AWS Secret Access Key
- [ ] RDS MySQL endpoint: `omega-intelligence.cfggauukayly.us-east-1.rds.amazonaws.com`
- [ ] RDS MySQL username
- [ ] RDS MySQL password
- [ ] API keys for OpenBB services

### Cost Estimate
- ElastiCache (cache.t3.micro): ~$12-15/month
- RDS: Using existing instance (no additional cost)
- Total additional cost: ~$12-15/month

### Security Notes
- Never commit .env.aws to git
- Keep your AWS credentials secure
- Regularly rotate access keys
- Monitor AWS billing dashboard