#!/bin/sh
set -e

echo "Waiting for MinIO to be ready..."
sleep 8

mc alias set local http://minio:9000 ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD}

echo "Creating buckets..."
mc mb local/evidence-packages --ignore-existing
mc mb local/reports --ignore-existing
mc mb local/raw-data --ignore-existing

echo "Setting bucket policies..."
mc anonymous set download local/reports

echo "✅ MinIO buckets initialized successfully"
mc ls local
