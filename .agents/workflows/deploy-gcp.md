---
description: Deploy Creative Liberation Engine to Cloud Run via MCP — builds, pushes, and deploys the engine
---

# /deploy-gcp

Automates the deployment of the Creative Liberation Engine to Google Cloud Run. This executes the entire pipeline: building the `Dockerfile.cle` container, pushing it to Google Artifact Registry, and deploying it as a serverless Cloud Run instance.

**Activates on:**

- `/deploy-gcp`
- "Deploy to GCP"
- "Push to Cloud Run"

---

## Steps

// turbo-all

### Step 1 — Verify Environment

Ensure the target GCP Project ID and Region are passed or available in the `.env` file. Falls back to defaults.

```powershell
# Fallback to defaults if missing
$GCP_PROJECT = $env:GCP_PROJECT_ID
$GCP_REGION = $env:GCP_REGION
if (!$GCP_PROJECT) { $GCP_PROJECT = "creative-liberation-engine-production" }
if (!$GCP_REGION) { $GCP_REGION = "us-central1" }

Write-Host "Deploying to Project: $GCP_PROJECT | Region: $GCP_REGION"
```

### Step 2 — Build and Push Container

Build the Docker image locally and push it to Google Cloud Artifact Registry. Ensure you are authenticated with `gcloud`.

```powershell
# Authenticate with Google Cloud registry
gcloud auth configure-docker $GCP_REGION-docker.pkg.dev --quiet

# Build and push the image using the GCP Cloud Run Dockerfile
$IMAGE_TAG = "$GCP_REGION-docker.pkg.dev/$GCP_PROJECT/inception-repo/cle:latest"

docker build -t $IMAGE_TAG -f Dockerfile.cle .
docker push $IMAGE_TAG
```

### Step 3 — Deploy to Cloud Run

Deploy the container as a serverless instance. Wires up `GEMINI_API_KEY` from Google Cloud Secret Manager so the container can boot securely.

```powershell
# Deploy the container to Cloud Run
gcloud run deploy cle-server `
    --image $IMAGE_TAG `
    --region $GCP_REGION `
    --project $GCP_PROJECT `
    --allow-unauthenticated `
    --set-secrets="GEMINI_API_KEY=gemini-api-key:latest" `
    --port 4100 `
    --max-instances 10 `
    --memory 1Gi

$SERVICE_URL = (gcloud run services describe cle-server --region $GCP_REGION --project $GCP_PROJECT --format="value(status.url)")
Write-Host "✅ Deployed successfully to Cloud Run. Service URL: $SERVICE_URL"
```
