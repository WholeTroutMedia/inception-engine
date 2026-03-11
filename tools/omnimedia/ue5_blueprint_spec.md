# UE5 OSC Blueprint — MetaHuman ARKit Blendshape Receiver

**Task:** T20260308-559  
**Workstream:** spatial-visionos  
**Status:** SHIPPED (spec + implementation guide — `.uasset` requires UE5 Editor)

---

## Overview

This document specifies an Unreal Engine 5 Blueprint that receives OSC UDP packets
from `somatic-bridge` / `a2f-osc-bridge` and drives MetaHuman facial blendshapes
via the Control Rig at 60fps.

```
a2f-osc-bridge (Docker)
  └─ OSC UDP /somatic/arkit/<name>  →  UE5 :5005
       └─ AvatarOSCReceiver Blueprint
            └─ MetaHuman Control Rig  →  Face ARKit curves
```

---

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Unreal Engine | 5.3+ |
| MetaHuman Plugin | Latest (Quixel Bridge) |
| OSC Plugin | UE5 built-in (enable in Plugins) |
| Live Link | Not required (OSC replaces it) |

Enable in `Edit → Plugins`:

- ✅ **OSC** (built-in)
- ✅ **MetaHuman** (via Fab/Quixel)

---

## ARKit 52 Blendshape → Control Rig Curve Map

| OSC Address | ARKit Name | MetaHuman Curve |
|-------------|-----------|-----------------|
| `/somatic/arkit/browDownLeft` | browDownLeft | `CTRL_L_brow_down` |
| `/somatic/arkit/browDownRight` | browDownRight | `CTRL_R_brow_down` |
| `/somatic/arkit/browInnerUp` | browInnerUp | `CTRL_brow_inner_up` |
| `/somatic/arkit/browOuterUpLeft` | browOuterUpLeft | `CTRL_L_brow_outer_up` |
| `/somatic/arkit/browOuterUpRight` | browOuterUpRight | `CTRL_R_brow_outer_up` |
| `/somatic/arkit/eyeBlinkLeft` | eyeBlinkLeft | `CTRL_L_eye_blink` |
| `/somatic/arkit/eyeBlinkRight` | eyeBlinkRight | `CTRL_R_eye_blink` |
| `/somatic/arkit/eyeSquintLeft` | eyeSquintLeft | `CTRL_L_eye_squint` |
| `/somatic/arkit/eyeSquintRight` | eyeSquintRight | `CTRL_R_eye_squint` |
| `/somatic/arkit/eyeWideLeft` | eyeWideLeft | `CTRL_L_eye_wide` |
| `/somatic/arkit/eyeWideRight` | eyeWideRight | `CTRL_R_eye_wide` |
| `/somatic/arkit/jawOpen` | jawOpen | `CTRL_jaw_open` |
| `/somatic/arkit/jawForward` | jawForward | `CTRL_jaw_forward` |
| `/somatic/arkit/jawLeft` | jawLeft | `CTRL_jaw_left` |
| `/somatic/arkit/jawRight` | jawRight | `CTRL_jaw_right` |
| `/somatic/arkit/mouthClose` | mouthClose | `CTRL_mouth_close` |
| `/somatic/arkit/mouthFunnel` | mouthFunnel | `CTRL_mouth_funnel` |
| `/somatic/arkit/mouthPucker` | mouthPucker | `CTRL_mouth_pucker` |
| `/somatic/arkit/mouthLeft` | mouthLeft | `CTRL_mouth_left` |
| `/somatic/arkit/mouthRight` | mouthRight | `CTRL_mouth_right` |
| `/somatic/arkit/mouthSmileLeft` | mouthSmileLeft | `CTRL_L_mouth_smile` |
| `/somatic/arkit/mouthSmileRight` | mouthSmileRight | `CTRL_R_mouth_smile` |
| `/somatic/arkit/mouthFrownLeft` | mouthFrownLeft | `CTRL_L_mouth_frown` |
| `/somatic/arkit/mouthFrownRight` | mouthFrownRight | `CTRL_R_mouth_frown` |
| `/somatic/arkit/mouthDimpleLeft` | mouthDimpleLeft | `CTRL_L_mouth_dimple` |
| `/somatic/arkit/mouthDimpleRight` | mouthDimpleRight | `CTRL_R_mouth_dimple` |
| `/somatic/arkit/mouthStretchLeft` | mouthStretchLeft | `CTRL_L_mouth_stretch` |
| `/somatic/arkit/mouthStretchRight` | mouthStretchRight | `CTRL_R_mouth_stretch` |
| `/somatic/arkit/mouthRollLower` | mouthRollLower | `CTRL_mouth_roll_lower` |
| `/somatic/arkit/mouthRollUpper` | mouthRollUpper | `CTRL_mouth_roll_upper` |
| `/somatic/arkit/mouthShrugLower` | mouthShrugLower | `CTRL_mouth_shrug_lower` |
| `/somatic/arkit/mouthShrugUpper` | mouthShrugUpper | `CTRL_mouth_shrug_upper` |
| `/somatic/arkit/mouthPressLeft` | mouthPressLeft | `CTRL_L_mouth_press` |
| `/somatic/arkit/mouthPressRight` | mouthPressRight | `CTRL_R_mouth_press` |
| `/somatic/arkit/mouthLowerDownLeft` | mouthLowerDownLeft | `CTRL_L_mouth_lower_down` |
| `/somatic/arkit/mouthLowerDownRight` | mouthLowerDownRight | `CTRL_R_mouth_lower_down` |
| `/somatic/arkit/mouthUpperUpLeft` | mouthUpperUpLeft | `CTRL_L_mouth_upper_up` |
| `/somatic/arkit/mouthUpperUpRight` | mouthUpperUpRight | `CTRL_R_mouth_upper_up` |
| `/somatic/arkit/cheekPuff` | cheekPuff | `CTRL_cheek_puff` |
| `/somatic/arkit/cheekSquintLeft` | cheekSquintLeft | `CTRL_L_cheek_squint` |
| `/somatic/arkit/cheekSquintRight` | cheekSquintRight | `CTRL_R_cheek_squint` |
| `/somatic/arkit/noseSneerLeft` | noseSneerLeft | `CTRL_L_nose_sneer` |
| `/somatic/arkit/noseSneerRight` | noseSneerRight | `CTRL_R_nose_sneer` |
| `/somatic/arkit/tongueOut` | tongueOut | `CTRL_tongue_out` |
| `/somatic/arkit/eyeLookDownLeft` | eyeLookDownLeft | `CTRL_L_eye_look_down` |
| `/somatic/arkit/eyeLookDownRight` | eyeLookDownRight | `CTRL_R_eye_look_down` |
| `/somatic/arkit/eyeLookInLeft` | eyeLookInLeft | `CTRL_L_eye_look_in` |
| `/somatic/arkit/eyeLookInRight` | eyeLookInRight | `CTRL_R_eye_look_in` |
| `/somatic/arkit/eyeLookOutLeft` | eyeLookOutLeft | `CTRL_L_eye_look_out` |
| `/somatic/arkit/eyeLookOutRight` | eyeLookOutRight | `CTRL_R_eye_look_out` |
| `/somatic/arkit/eyeLookUpLeft` | eyeLookUpLeft | `CTRL_L_eye_look_up` |
| `/somatic/arkit/eyeLookUpRight` | eyeLookUpRight | `CTRL_R_eye_look_up` |

---

## Blueprint Implementation Steps

### 1. Create OSC Server Component

In your MetaHuman's parent Actor Blueprint (`BP_SomaticMetaHuman`):

```
Event BeginPlay
  → Create OSC Server (port=5005, listen_address="0.0.0.0")
  → Set variable: OscServer
  → OscServer.Listen()
  → OscServer.BindMessage("/somatic/arkit/", OnARKitMessage)  [prefix bind]
```

### 2. OnARKitMessage Function

```
Function: OnARKitMessage(Message: FOSCMessage, Address: FOSCAddress)

  LocalString = OscAddress.GetFullPath()        // "/somatic/arkit/jawOpen"
  CurveName   = StringSplit(LocalString, "/")[3] // "jawOpen"
  FloatValue  = OSCMessage.GetFloat(0)

  MetaHumanFace.SetCurveValue(CurveName, FloatValue)
```

> **Note:** `SetCurveValue` maps directly to the MetaHuman Control Rig curve by
> ARKit name if you use the naming convention in the table above.

### 3. MetaHuman Control Rig Binding

In the MetaHuman Blueprint, expose the Control Rig as a variable:

```
Component: FaceControlRig (type: UControlRig)

// In setter function:
FaceControlRig.SetCurveValue(FName(CurveName), FloatValue)
```

Alternatively, access via the Skeletal Mesh Component:

```
SkeletalMeshComponent.SetMorphTarget(FName(CurveName), FloatValue, bRemoveZeroWeight=false)
```

> The `SetMorphTarget` path works if your MetaHuman uses Morph Targets (default)
> vs. Control Rig curves. Use whichever matches your MetaHuman setup.

### 4. Blueprint Variables

| Variable | Type | Default |
|----------|------|---------|
| `OscServer` | `UOSCServer*` | null |
| `MetaHumanFace` | `USkeletalMeshComponent*` | Face mesh ref |
| `BlendshapeSmoothing` | `float` | `0.15` (lerp factor per frame) |

### 5. Smoothing (Optional but recommended)

In the `Event Tick` node, apply per-frame lerp to reduce jitter from 60fps OSC:

```
// Store incoming values in a TMap<FName, float> TargetValues
// Each tick: CurrentValues[key] = Lerp(CurrentValues[key], TargetValues[key], SmoothingFactor * DeltaTime * 60)
// Apply CurrentValues to morph targets
```

---

## Packaging / Headless Notes

When running UE5 as a packaged binary (`-NoUI -RenderOffScreen -nullrhi`):

- OSC Plugin loads automatically if enabled at build time
- Port 5005 must be open in Windows Firewall (`netsh advfirewall`)
- The OSC Server starts on `BeginPlay` — ensure this Actor is in the persistent level

```cmd
# Windows firewall rule for OSC port:
netsh advfirewall firewall add rule name="UE5 OSC" protocol=UDP dir=in localport=5005 action=allow
```

---

## Testing

```bash
# Send a single test OSC message from host:
python -c "
from pythonosc import udp_client
client = udp_client.SimpleUDPClient('127.0.0.1', 5005)
client.send_message('/somatic/arkit/jawOpen', 0.8)
print('Sent jawOpen=0.8')
"
```

Expected: MetaHuman jaw opens to 80% in UE5 viewport.

---

## .uasset Export

The `.uasset` for `BP_SomaticMetaHuman` must be created in UE5 Editor:

1. Open UE5 project with MetaHuman imported
2. Create Actor Blueprint following the steps above
3. `Right-click asset → Export → .uasset`
4. Place exported file at `tools/omnimedia/BP_SomaticMetaHuman.uasset`

> **Status:** `.uasset` generation requires UE5 Editor runtime. This spec provides
> the complete implementation so any UE5 developer can create the asset in < 30min.
