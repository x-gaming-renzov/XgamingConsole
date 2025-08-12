#!/usr/bin/env bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 20

set -euo pipefail

### PROJECT SETTINGS
PROJECT_ID="xg-nova-infra"
REGION="us-central1"
REPO="app-images"
SERVICE_NAME="nova-console"
TAG="${TAG:-prod}"
NOVA_BACKEND_URL="${NOVA_BACKEND_URL:-https://nova-manager-475016739432.us-central1.run.app}"

### Configure gcloud
gcloud config set project "$PROJECT_ID"
gcloud config set run/region "$REGION"

### Ensure the Artifact Registry repository exists
gcloud artifacts repositories describe "$REPO" --location="$REGION" \
  || gcloud artifacts repositories create "$REPO" \
       --location="$REGION" --repository-format=docker

### Grant Cloud Build service accounts write access
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
for SA in "$PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
          "$PROJECT_NUMBER-compute@developer.gserviceaccount.com"; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SA" --role="roles/artifactregistry.writer" --quiet || true
done

### Build and push the Docker image
FULL_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${SERVICE_NAME}:${TAG}"
# Note: Builds for linux/amd64 by default
gcloud builds submit --tag "$FULL_IMAGE"

### Deploy to Cloud Run
gcloud run deploy "$SERVICE_NAME" \
  --image="$FULL_IMAGE" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=5 \
  --cpu=1 \
  --memory=1Gi \
  --set-env-vars=NOVA_BACKEND_URL="$NOVA_BACKEND_URL"