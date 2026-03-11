import sys
import os
import json

print("Initializing DaVinci Resolve Python Bridge...")

# Resolve Python API path for Windows
import traceback
resolve_script_api = os.path.expandvars("%PROGRAMDATA%\\Blackmagic Design\\DaVinci Resolve\\Support\\Developer\\Scripting\\Modules")
os.environ['RESOLVE_SCRIPT_API'] = os.path.expandvars("%PROGRAMDATA%\\Blackmagic Design\\DaVinci Resolve\\Support\\Developer\\Scripting")
os.environ['RESOLVE_SCRIPT_LIB'] = r"C:\Program Files\Blackmagic Design\DaVinci Resolve\fusionscript.dll"
os.environ['PYTHONPATH'] = os.environ.get('PYTHONPATH', '') + ";" + resolve_script_api
if 'resolve' not in locals() and 'resolve' not in globals():
    try:
        import DaVinciResolveScript as dvr_script
        resolve = dvr_script.scriptapp("Resolve")
    except ImportError as e:
        print(f"Critical Error: Could not find DaVinciResolveScript. Is DaVinci Resolve Studio running? Details: {e}")
        traceback.print_exc()
        sys.exit(1)
    except Exception as e:
        print(f"Unknown Error during import: {e}")
        traceback.print_exc()
        sys.exit(1)

    if not resolve:
        print("Critical Error: Resolve object could not be created. Ensure External Scripting is enabled in DaVinci Resolve Settings.")
        sys.exit(1)


projectManager = resolve.GetProjectManager()
project = projectManager.GetCurrentProject()
mediaPool = project.GetMediaPool()

if not project:
    print("No active project loaded in Resolve.")
    sys.exit(1)

print(f"Connected to Project: {project.GetName()}")

timeline_name = "Genkit_Viral_Recap_V1"
print(f"Creating new timeline '{timeline_name}'...")
timeline = mediaPool.CreateEmptyTimeline(timeline_name)
if not timeline:
    print("Failed to create timeline. Please switch to the Edit page in DaVinci Resolve.")
    sys.exit(1)

fps_setting = project.GetSetting("timelineFrameRate")
fps = float(fps_setting) if fps_setting else 24.0
print(f"Detected Timeline Framerate: {fps} FPS")

edl_path = r"d:\Google Creative Liberation Engine\tmp_proxy\edl_output.json"
try:
    with open(edl_path, 'r') as f:
        payload = json.load(f)
        edl = payload.get("edl", [])
except Exception as e:
    print(f"Failed to load EDL JSON payload: {e}")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────────────────────
# STEP 1: Import all unique files to Media Pool
# ─────────────────────────────────────────────────────────────────────────────
print("Importing raw footage into Media Pool...")
unique_files = list(set([cut["filePath"] for cut in edl]))
media_items = mediaPool.ImportMedia(unique_files)

if not media_items:
    print("Failed to import media items. Check file paths.")
    sys.exit(1)

# Create a mapping from filepath string to MediaPoolItem object
item_map = {}
for item in media_items:
    item_path = item.GetClipProperty("File Path")
    norm_path = os.path.normcase(os.path.abspath(item_path))
    item_map[norm_path] = item

# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: Build the Timeline (Track 1 — Raw Cuts)
# ─────────────────────────────────────────────────────────────────────────────
print("Injecting cuts into the timeline...")
clip_info_list = []
for idx, cut in enumerate(edl):
    path = os.path.normcase(os.path.abspath(cut["filePath"]))
    media_item = item_map.get(path)

    if not media_item:
        print(f"Warning: File not found in Media Pool mapping: {path}")
        continue

    start_sec = float(cut["startTime"])
    end_sec = float(cut["endTime"])

    start_frame = int(start_sec * fps)
    end_frame = int(end_sec * fps)

    clip_info = {
        "mediaPoolItem": media_item,
        "startFrame": start_frame,
        "endFrame": end_frame
    }
    print(f"   -> Cut {idx+1}: {os.path.basename(path)} ({start_sec}s - {end_sec}s) | Frames: {start_frame}-{end_frame}")
    clip_info_list.append(clip_info)

result = mediaPool.AppendToTimeline(clip_info_list)

if result:
    print("SUCCESS: Timeline physically populated with Genkit logic.")
    audio_rec = payload.get("audioRecommendation", {})
    print("Recommended Audio Settings:")
    print(json.dumps(audio_rec, indent=2))
else:
    print("Failed to append clips to timeline.")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────────────────────
# STEP 3: MotionVFX Title Injection (Track 2) via GenkitFusionBridge
# Triggered when ATHENA's EDL payload includes a `titleText` field.
# ─────────────────────────────────────────────────────────────────────────────
title_text = payload.get("titleText", "").strip()

if title_text:
    print(f"\n🎬 titleText detected in payload: \"{title_text}\"")
    print("Initializing GenkitFusionBridge for MotionVFX title injection...")

    try:
        # Import bridge from same package directory
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from fusion_injector import GenkitFusionBridge

        bridge = GenkitFusionBridge(resolve, mediaPool, timeline)

        # Calculate title duration: first cut duration or 3 seconds (72 frames at 24fps)
        first_cut_duration = 0
        if clip_info_list:
            first_cut = clip_info_list[0]
            first_cut_duration = first_cut["endFrame"] - first_cut["startFrame"]
        title_duration = max(first_cut_duration, int(fps * 3))  # at least 3 seconds

        success = bridge.import_as_comp(
            title_text=title_text,
            video_track=2,
            position_frames=0,
            duration_frames=title_duration,
        )

        if success:
            print(f"✅ Title track complete: \"{title_text}\" on Video Track 2")
        else:
            print("⚠️  Title injection via import_as_comp failed.")
            print("   Falling back to inject_and_restart strategy.")
            bridge.inject_and_restart(title_text)

    except ImportError as e:
        print(f"⚠️  fusion_injector.py not found in current directory: {e}")
        print("   Title injection skipped.")
    except Exception as e:
        print(f"⚠️  GenkitFusionBridge error: {e}")
        traceback.print_exc()
        print("   Title injection skipped — raw footage timeline is still valid.")

else:
    print("\nℹ️  No titleText in payload — skipping MotionVFX title injection.")
    print("   To enable titles, ensure run_director.ts includes titleText in its output.")

print("\n✅ build_timeline.py complete.")
