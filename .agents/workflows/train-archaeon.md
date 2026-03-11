---
description: Trigger the ARCHAEON local LoRA fine-tuning run on the workstation (3080/Unsloth)
---

# ARCHAEON Fine-Tuning Sequence (Workstation)

This workflow pulls the continuously-growing SCRIBE `baseline.jsonl` corpus and runs an Unsloth QLoRA compile on the local workstation (utilizing the 3080 GPU).

## Step 1: Validate Training Corpus

First, we ensure the corpus has enough samples and is formatted correctly.

```powershell
// turbo
Get-Content -Path "C:\\Creative-Liberation-Engine\.agents\scribe\training_corpus\baseline.jsonl" | Measure-Object -Line
```

> If lines < 100, the dataset may be too small for meaningful tuning. Proceed at your own risk.

## Step 2: Dynamic GPU Allocation & Training

We query the host OS to see if the external 3080 connected via Thunderbolt is available.

- If it is found, we map Docker to use `device=1` (the 3080) to leave the 4090 free.
- If the 3080 is not connected, the script defaults to `device=0` (the internal 4090) to ensure ARCHAEON can compile immediately today.

```powershell
// turbo-all
$gpuList = Get-CimInstance Win32_VideoController | Select-Object Name
$targetDevice = "0" # Default to 4090 (usually index 0)

if ($gpuList.Name -match "3080") {
    Write-Host "External RTX 3080 detected. Routing ARCHAEON compilation to eGPU..."
    $targetDevice = "1" # eGPU is typically enumerated after the primary internal card
} else {
    Write-Host "External 3080 not found. Defaulting to internal RTX 4090..."
}

# Run the Unsloth container targeting the dynamically selected GPU
docker run --gpus '"device=' + $targetDevice + '"' -v "C:\\Creative-Liberation-Engine\.agents\scribe\training_corpus:/workspace/data" -v "C:\\Creative-Liberation-Engine\.agents\models:/workspace/models" -it unsloth/unsloth:latest bash -c "python train.py --data_path /workspace/data/baseline.jsonl --output_dir /workspace/models/archaeon-v1 --model_name unsloth/llama-3-8b-Instruct-bnb-4bit"
```

*Note: You may need to create `train.py` in the mapped directory if using a custom Unsloth script, or use an Axolotl yaml config.*

## Step 3: Push Safetensors to NAS Ollama

Once the `.safetensors` adapter is compiled into `.agents/models/archaeon-v1/`, we load it into the local Ollama instance or push it to the NAS.

```powershell
// turbo
Write-Output "FROM llama3:8b" > .agents\models\Modelfile.archaeon
Write-Output "ADAPTER ./archaeon-v1" >> .agents\models\Modelfile.archaeon
ollama create archaeon-v1 -f .agents\models\Modelfile.archaeon
```

## Step 4: Verify Local Model

Check if the model responds using the new weights.

```powershell
// turbo
ollama run archaeon-v1 "Evaluate task T20260309-999: 'Fix CSS bug in console'. Determine next action."
```
