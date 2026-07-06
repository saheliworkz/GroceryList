#!/bin/sh
set -eu
dnf update -y
dnf install -y docker git
systemctl enable --now docker
usermod -aG docker ec2-user
# After launch:
# git clone https://github.com/YOUR_USER/YOUR_REPO.git /opt/basketwise
# cd /opt/basketwise
# cp .env.example .env && edit approved integration credentials
# docker compose up -d --build
