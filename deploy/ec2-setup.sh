#!/bin/bash
set -euo pipefail

# ─── EC2 Instance Setup for HPT Agent ─────────────────────
# Run on a fresh Amazon Linux 2023 t3.small instance.
#
# Prerequisites:
#   - SSH access, .env file uploaded to ~/
#   - EC2 instance must have IAM Instance Profile with the policy:
#     {
#       "Version": "2012-10-17",
#       "Statement": [{
#         "Effect": "Allow",
#         "Action": [
#           "logs:CreateLogGroup",
#           "logs:CreateLogStream",
#           "logs:PutLogEvents",
#           "logs:DescribeLogStreams"
#         ],
#         "Resource": "arn:aws:logs:*:*:log-group:/hpt/agent*"
#       }]
#     }
#   - Attach the instance profile BEFORE running this script

echo "=== Installing Docker and Git ==="
sudo dnf update -y
sudo dnf install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user

# Apply group change without logout/login
echo "=== Cloning repo and building Docker image ==="
sudo -u ec2-user bash -c '
  cd ~
  git clone https://github.com/pranjalashutosh/HoneywellAnthem_PilotTraining_Sol.git hpt-agent
  cd hpt-agent
  docker build -t hpt-agent .
'

echo "=== Starting agent container with CloudWatch logging ==="
# Expects ~/.env with: LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET,
#   OPENAI_API_KEY, DEEPGRAM_API_KEY, ELEVEN_API_KEY
sudo -u ec2-user bash -c '
  # ─── Auto-detect AWS region from instance metadata (IMDSv2) ───
  TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
    -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
  AWS_REGION=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
    http://169.254.169.254/latest/meta-data/placement/region)
  INSTANCE_ID=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
    http://169.254.169.254/latest/meta-data/instance-id)

  docker run -d \
    --name hpt-agent \
    --restart unless-stopped \
    --env-file ~/.env \
    --log-driver=awslogs \
    --log-opt awslogs-region="${AWS_REGION}" \
    --log-opt awslogs-group="/hpt/agent" \
    --log-opt awslogs-stream="hpt-agent-${INSTANCE_ID}" \
    --log-opt awslogs-create-group=true \
    hpt-agent
'

echo "=== Done! ==="
echo "Check local container status: docker ps"
echo "Check CloudWatch logs: AWS Console → CloudWatch → Log groups → /hpt/agent"
echo "Or via CLI: aws logs tail /hpt/agent --follow"
