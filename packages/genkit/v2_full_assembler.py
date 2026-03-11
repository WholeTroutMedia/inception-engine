"""
v2_full_assembler.py — OmniMedia V2 Multi-Track Resolve Assembler

Consumes the edl_output_v2.json payload from OmniMediaOrchestrator and
builds a 4-track DaVinci Resolve timeline:

  Track 1 (Primary): Raw footage cuts from ATHENA's EDL
  Track 2 (B-Roll):  AI-generated video clips (Veo/Wan) at AI-selected timestamps
  Track 3 (VFX):     TouchDesigner audio-reactive overlay (Screen blend mode)
  Track 4 (Title):   MotionVFX title via GenkitFusionBridge OR Blender title card

After assembly, triggers a Resolve render job to export the finished video.

Usage:
    python v2_full_assembler.py
    python v2_full_assembler.py --payload path/to/edl_output_v2.json
"""

import sys
import os
import json
import traceback
import argparse
from pathlib import Path

# ─────────────────────────────────────────────────────────────────────────────
# RESOLVE API BOOTSTRAP
# ─────────────────────────────────────────────────────────────────────────────

resolve_api = os.path.expandvars(
    "%PROGRAMDATA%\\Blackmagic Design\\DaVinci Resolve\\Support\\Developer\\Scripting\\Modules"
)
os.environ['RESOLVE_SCRIPT_API'] = os.path.expandvars(
    "%PROGRAMDATA%\\Blackmagic Design\\DaVinci Resolve\\Support\\Developer\\Scripting"
)
os.environ['RESOLVE_SCRIPT_LIB'] = r"C:\Program Files\Blackmagic Design\DaVinci Resolve\fusionscript.dll"
os.environ['PYTHONPATH'] = os.environ.get('PYTHONPATH', '') + ";" + resolve_api

try:
    import DaVinciResolveScript as dvr_script
    resolve = dvr_script.scriptapp("Resolve")
except ImportError as e:
    print(f"❌ DaVinciResolveScript not found. Is DaVinci Resolve Studio running? {e}")
    sys.exit(1)

if not resolve:
    print("❌ Could not connect to DaVinci Resolve. Enable External Scripting in Preferences > General.")
    sys.exit(1)

project_manager = resolve.GetProjectManager()
project = project_manager.GetCurrentProject()
media_pool = project.GetMediaPool()

if not project:
    print("❌ No active project in Resolve. Open a project before running assembler.")
    sys.exit(1)

print(f"✅ Connected to Resolve project: {project.GetName()}")

# ─────────────────────────────────────────────────────────────────────────────
# ARGUMENT PARSING
# ─────────────────────────────────────────────────────────────────────────────

parser = argparse.ArgumentParser(description="OmniMedia V2 Multi-Track Resolve Assembler")
parser.add_argument(
    '--payload', default=r"d:\Google Creative Liberation Engine\tmp_proxy\edl_output_v2.json",
    help='Path to edl_output_v2.json'
)
parser.add_argument(
    '--no-render', action='store_true',
    help='Skip automatic render queue (assemble only)'
)
args = parser.parse_args()

# ─────────────────────────────────────────────────────────────────────────────
# LOAD PAYLOAD
# ─────────────────────────────────────────────────────────────────────────────

try:
    with open(args.payload, 'r') as f:
        payload = json.load(f)
except Exception as e:
    print(f"❌ Failed to load payload: {e}")
    sys.exit(1)

session_id      = payload.get("sessionId", "omni_session")
edl             = payload.get("edl", [])
title_text      = payload.get("titleText", "").strip()
audio_rec       = payload.get("audioRecommendation", {})
generated_broll = payload.get("generatedBroll", [])
vfx_overlay     = payload.get("vfxOverlayPath")
blender_title   = payload.get("blenderTitleCardPath")
style           = payload.get("style", "cinematic")
mood            = payload.get("mood", "hype")
format_type     = payload.get("format", "vertical")

fps_setting = project.GetSetting("timelineFrameRate")
FPS = float(fps_setting) if fps_setting else 24.0
print(f"📽️  Timeline FPS: {FPS}")

print(f"\n📋 V2 Payload Summary:")
print(f"   Session   : {session_id}")
print(f"   EDL cuts  : {len(edl)}")
print(f"   B-roll    : {len(generated_broll)} AI clips")
print(f"   VFX       : {vfx_overlay or 'None (skipped)'}")
print(f"   Title     : {title_text or 'None'}")
print(f"   Audio BPM : {audio_rec.get('bpm', '?')}")

# ─────────────────────────────────────────────────────────────────────────────
# CREATE TIMELINE
# ─────────────────────────────────────────────────────────────────────────────

timeline_name = f"OmniMedia_{session_id}"
print(f"\n🎚️  Creating timeline: {timeline_name}")
timeline = media_pool.CreateEmptyTimeline(timeline_name)

if not timeline:
    print("❌ Failed to create timeline. Switch to Edit page in DaVinci Resolve.")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────────────────────
# TRACK 1: RAW FOOTAGE CUTS (ATHENA EDL)
# ─────────────────────────────────────────────────────────────────────────────

print("\n" + "─" * 50)
print("🎬 TRACK 1: Importing raw footage from ATHENA EDL...")

unique_files = list(set([cut.get("filePath", "") for cut in edl if cut.get("filePath")]))
media_items = media_pool.ImportMedia(unique_files) if unique_files else []
item_map = {}
for item in (media_items or []):
    raw = item.GetClipProperty("File Path")
    item_map[os.path.normcase(os.path.abspath(raw))] = item

track1_clips = []
for idx, cut in enumerate(edl):
    fp = os.path.normcase(os.path.abspath(cut.get("filePath", "")))
    mi = item_map.get(fp)
    if not mi:
        print(f"   ⚠️  Missing media: {cut.get('filePath')}")
        continue
    sf = int(float(cut.get("startTime", 0)) * FPS)
    ef = int(float(cut.get("endTime", 0)) * FPS)
    track1_clips.append({"mediaPoolItem": mi, "startFrame": sf, "endFrame": ef})
    print(f"   ✅ Cut {idx+1}: {os.path.basename(cut.get('filePath',''))} [{sf}-{ef}]")

if track1_clips:
    media_pool.AppendToTimeline(track1_clips)
    print(f"✅ Track 1: {len(track1_clips)} cuts assembled")
else:
    print("❌ Track 1: No clips assembled. Check file paths in EDL.")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────────────────────
# TRACK 2: AI-GENERATED B-ROLL (Veo/Wan clips)
# ─────────────────────────────────────────────────────────────────────────────

print("\n" + "─" * 50)
print("🎨 TRACK 2: Placing AI-generated B-roll overlays...")

if generated_broll:
    broll_media = media_pool.ImportMedia(generated_broll) or []
    if broll_media:
        # Distribute B-roll evenly across the timeline
        total_frames = sum(c["endFrame"] - c["startFrame"] for c in track1_clips)
        segment_size = total_frames // len(broll_media)

        track2_clips = []
        for i, broll_item in enumerate(broll_media):
            record_start = i * segment_size
            track2_clips.append({
                "mediaPoolItem": broll_item,
                "startFrame": 0,
                "endFrame": min(segment_size, int(FPS * 4)),  # max 4s each
                "trackIndex": 2,
                "recordFrame": record_start,
            })
            print(f"   ✅ B-roll {i+1}: {broll_item.GetName()} @ frame {record_start}")

        media_pool.AppendToTimeline(track2_clips)
        print(f"✅ Track 2: {len(broll_media)} AI B-roll clips placed")
    else:
        print("⚠️  Track 2: B-roll import failed")
else:
    print("ℹ️  Track 2: No AI B-roll generated (FAL_API_KEY not set or branch failed). Skipping.")

# ─────────────────────────────────────────────────────────────────────────────
# TRACK 3: TOUCHDESIGNER VFX OVERLAY (Screen blend mode)
# ─────────────────────────────────────────────────────────────────────────────

print("\n" + "─" * 50)
print("✨ TRACK 3: Placing TouchDesigner VFX overlay...")

if vfx_overlay and os.path.exists(vfx_overlay):
    vfx_items = media_pool.ImportMedia([vfx_overlay]) or []
    if vfx_items:
        vfx_item = vfx_items[0]
        vfx_clip = {
            "mediaPoolItem": vfx_item,
            "startFrame": 0,
            "endFrame": int(payload.get("targetDuration", 20) * FPS),
            "trackIndex": 3,
            "recordFrame": 0,
        }
        result = media_pool.AppendToTimeline([vfx_clip])
        if result:
            # Set Screen blend mode on the VFX clip
            try:
                clips_on_track = timeline.GetItemListInTrack("video", 3)
                if clips_on_track:
                    clips_on_track[0].SetProperty("Composite Mode", "Screen")
                    print(f"✅ Track 3: VFX overlay placed + Screen blend mode set")
                else:
                    print(f"✅ Track 3: VFX overlay placed (blend mode set manually)")
            except Exception as blend_err:
                print(f"✅ Track 3: VFX overlay placed (set blend mode manually: {blend_err})")
        else:
            print("⚠️  Track 3: AppendToTimeline failed for VFX overlay")
    else:
        print(f"⚠️  Track 3: Could not import VFX overlay from {vfx_overlay}")
elif vfx_overlay:
    print(f"⚠️  Track 3: VFX overlay file not found: {vfx_overlay}")
else:
    print("ℹ️  Track 3: TouchDesigner was offline. Skipping VFX overlay.")

# ─────────────────────────────────────────────────────────────────────────────
# TRACK 4: TITLE — Blender Card OR MotionVFX via GenkitFusionBridge
# ─────────────────────────────────────────────────────────────────────────────

print("\n" + "─" * 50)
print("🏷️  TRACK 4: Placing title...")

title_placed = False

# Strategy A: Blender rendered title card (PNG import as still)
if blender_title and os.path.exists(blender_title):
    print(f"   Using Blender 3D title card: {blender_title}")
    title_items = media_pool.ImportMedia([blender_title]) or []
    if title_items:
        title_clip = {
            "mediaPoolItem": title_items[0],
            "startFrame": 0,
            "endFrame": int(FPS * 3),
            "trackIndex": 4,
            "recordFrame": 0,
        }
        if media_pool.AppendToTimeline([title_clip]):
            print(f"✅ Track 4: Blender title card placed")
            title_placed = True

# Strategy B: MotionVFX Fusion title via GenkitFusionBridge
if not title_placed and title_text:
    print(f"   Using GenkitFusionBridge → MotionVFX template: \"{title_text}\"")
    try:
        sys.path.insert(0, str(Path(__file__).parent))
        from fusion_injector import GenkitFusionBridge
        bridge = GenkitFusionBridge(resolve, media_pool, timeline)
        title_duration = int(FPS * 3)
        success = bridge.import_as_comp(
            title_text=title_text, video_track=4,
            position_frames=0, duration_frames=title_duration,
        )
        if success:
            print(f"✅ Track 4: MotionVFX title \"{title_text}\" placed via import_as_comp")
            title_placed = True
        else:
            print(f"⚠️  import_as_comp returned False. Using inject_and_restart fallback...")
            bridge.inject_and_restart(title_text)
    except Exception as title_err:
        print(f"⚠️  Title injection error: {title_err}")
        traceback.print_exc()

if not title_placed:
    print("ℹ️  Track 4: No title placed (no Blender card, no titleText from ATHENA).")

# ─────────────────────────────────────────────────────────────────────────────
# RENDER QUEUE
# ─────────────────────────────────────────────────────────────────────────────

print("\n" + "─" * 50)

if not args.no_render:
    print("🚀 Triggering Resolve render job...")
    export_dir = r"B:\Barnstorm 2026 Media\Exports"
    os.makedirs(export_dir, exist_ok=True)
    export_path = os.path.join(export_dir, f"{timeline_name}.mp4")

    try:
        project.SetRenderSettings({
            "SelectAllFrames": True,
            "ExportVideo": True,
            "ExportAudio": True,
            "TargetDir": export_dir,
            "CustomName": timeline_name,
            "VideoQuality": "Automatic",
        })
        project.AddRenderJob()
        project.StartRendering()
        print(f"✅ Render job queued → {export_path}")
        print("   Monitor progress in Resolve Deliver page.")
    except Exception as render_err:
        print(f"⚠️  Render trigger failed: {render_err}")
        print("   Open Resolve Deliver page and queue manually.")
else:
    print("ℹ️  --no-render flag set. Skipping render queue.")

# ─────────────────────────────────────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────────────────────────────────────

print("\n" + "=" * 60)
print("🎬 V2 FULL ASSEMBLER COMPLETE")
print("=" * 60)
print(f"✅ Track 1: {len(track1_clips)} raw cuts (ATHENA EDL)")
print(f"   Track 2: AI B-roll  ({len(generated_broll)} clips)")
print(f"   Track 3: VFX overlay ({'placed' if vfx_overlay else 'skipped'})")
print(f"   Track 4: Title       ({'placed' if title_placed else 'skipped'})")
print()
print(f"🎵 Recommended audio: {audio_rec.get('genre', '?')} @ {audio_rec.get('bpm', '?')} BPM — {audio_rec.get('vibe', '?')}")
print("=" * 60)
