---
description: Release a staged package to the public creative-liberation-engine repo
---

# `/release-public <feature-id>`

Moves a staged package from `DRIP_MANIFEST.json` into `released`, bumps the version, runs the full scrub-export pipeline, generates the changelog, and pushes to the public GitHub repo.

// turbo-all

## Steps

1. Navigate to the brainchild-v5 root:

```powershell
cd "C:\\Creative-Liberation-Engine"
```

2. Dry run first â€” verify what will be exported and scrubbed:

```powershell
npx ts-node scripts/drip/scrub-export.ts --release <feature-id> --dry-run
```

3. If the dry run looks correct, run the changelog generator:

```powershell
npx ts-node scripts/drip/generate-changelog.ts --dry-run
```

4. Full release â€” move to released, bump version, export, push:

```powershell
npx ts-node scripts/drip/scrub-export.ts --release <feature-id> --push
```

5. Generate and prepend the changelog:

```powershell
npx ts-node scripts/drip/generate-changelog.ts
```

6. The push will trigger the `create-release.yml` GitHub Action on the public repo, which auto-creates the GitHub Release with the changelog as the body.

## Scheduling a future drop instead of releasing now

```powershell
npx ts-node scripts/drip/scrub-export.ts --schedule <feature-id> --date YYYY-MM-DD
```

## Checking what's staged vs released

```powershell
Get-Content scripts/drip/DRIP_MANIFEST.json | ConvertFrom-Json | Select-Object version, released, @{n='staged_ids';e={$_.staged | Select-Object id, trigger, release_date}}
```
