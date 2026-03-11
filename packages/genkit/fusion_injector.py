"""
fusion_injector.py — GenkitFusionBridge

Wraps the MotionVFX template pre-injection logic into a reusable class
that integrates with the build_timeline.py pipeline.

Two strategies to bypass DaVinci Resolve's startup template cache:

  Strategy A — inject_and_restart():
    Patch the .drfx in-place → print instructions for user to restart Resolve.
    Simple, but requires a manual app restart between runs.

  Strategy B — import_as_comp() [RECOMMENDED]:
    Extract the patched .setting file, import it directly into the Media Pool
    as a Fusion Comp via mediaPool.ImportFusionComp(). This bypasses the
    template cache entirely — no restart needed.

Usage (standalone):
    python fusion_injector.py
    python fusion_injector.py --restore

Usage (from build_timeline.py):
    bridge = GenkitFusionBridge(resolve, mediaPool, timeline)
    bridge.import_as_comp("OMNIMEDIA V2 GENERATOR", video_track=2)
"""

import zipfile
import shutil
import os
import re
import tempfile
from pathlib import Path
from typing import Optional

# ─────────────────────────────────────────────────────────────────────────────
# DEFAULT CONFIG
# ─────────────────────────────────────────────────────────────────────────────

DRFX_PATH = Path(
    r"C:\Users\jahar\AppData\Roaming\Blackmagic Design\DaVinci Resolve\Support\Fusion\Templates"
    r"\mLogo Cinematic 2.drfx"
)

TEMPLATE_NAME = "mLogo Cinematic 2 17"
SETTING_INNER_PATH = (
    "Edit/Titles/MotionVFX/mLogo Cinematic 2/mLogo Cinematic 2 17.setting"
)

DEFAULT_TEXT = "OMNIMEDIA V2 GENERATOR"


# ─────────────────────────────────────────────────────────────────────────────
# PURE UTILITY FUNCTIONS (module-level, for standalone use)
# ─────────────────────────────────────────────────────────────────────────────

def patch_setting_content(content: str, new_text: str) -> str:
    """
    Replace the StyledText default value inside a Fusion .setting file.
    """
    patched = re.sub(
        r'(StyledText\s*=\s*Input\s*\{\s*Value\s*=\s*)".*?"',
        rf'\g<1>"{new_text}"',
        content
    )
    return patched


def inject_template_text(new_text: str, drfx_path: Path = DRFX_PATH,
                         setting_path: str = SETTING_INNER_PATH) -> Path:
    """
    Patch the .setting file inside the .drfx archive in-place.
    Creates a .drfx.bak backup and returns the patched drfx path.
    """
    backup_path = drfx_path.with_suffix(".drfx.bak")

    if not drfx_path.exists():
        raise FileNotFoundError(f"Template .drfx not found: {drfx_path}")

    if not backup_path.exists():
        print(f"📦 Backing up original → {backup_path.name}")
        shutil.copy2(drfx_path, backup_path)
    else:
        print(f"✅ Backup already exists: {backup_path.name}")

    print(f"🔓 Opening .drfx archive...")
    with zipfile.ZipFile(drfx_path, 'r') as zin:
        all_entries = zin.namelist()
        entry_data = {}
        for entry in all_entries:
            try:
                entry_data[entry] = zin.read(entry)
            except Exception:
                entry_data[entry] = b''

    if setting_path not in entry_data:
        raise KeyError(f"Setting file not found inside .drfx: {setting_path}")

    original_content = entry_data[setting_path].decode('utf-8', errors='replace')
    print(f"📝 Patching: {setting_path.split('/')[-1]}")

    patched_content = patch_setting_content(original_content, new_text)

    if patched_content == original_content:
        print("⚠️  WARNING: No replacement was made — pattern may not have matched.")
        for line in original_content.split('\n'):
            if 'StyledText' in line:
                print(f"    >>> {line.strip()}")
    else:
        print(f"✅ Patched! Injected: \"{new_text}\"")

    entry_data[setting_path] = patched_content.encode('utf-8')

    print(f"💾 Writing patched .drfx back to disk...")
    tmp_path = drfx_path.with_suffix('.drfx.tmp')
    with zipfile.ZipFile(tmp_path, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
        for entry, data in entry_data.items():
            zout.writestr(entry, data)

    os.replace(tmp_path, drfx_path)
    print(f"🎯 Template patched in-place: {drfx_path.name}")
    return drfx_path


def restore_original(drfx_path: Path = DRFX_PATH) -> bool:
    """Restore the original .drfx from backup."""
    backup_path = drfx_path.with_suffix(".drfx.bak")
    if backup_path.exists():
        shutil.copy2(backup_path, drfx_path)
        print(f"🔄 Restored original: {drfx_path.name}")
        return True
    else:
        print(f"⚠️  No backup found at: {backup_path}")
        return False


def extract_setting_to_temp(new_text: str, drfx_path: Path = DRFX_PATH,
                            setting_path: str = SETTING_INNER_PATH) -> Path:
    """
    Extract and patch the .setting file into a temp directory.
    Returns the path to the extracted .setting file.
    Used by import_as_comp() strategy.
    """
    if not drfx_path.exists():
        raise FileNotFoundError(f"Template .drfx not found: {drfx_path}")

    with zipfile.ZipFile(drfx_path, 'r') as zin:
        if setting_path not in zin.namelist():
            raise KeyError(f"Setting file not found inside .drfx: {setting_path}")
        content = zin.read(setting_path).decode('utf-8', errors='replace')

    patched = patch_setting_content(content, new_text)

    tmp_dir = Path(tempfile.mkdtemp(prefix="genkit_fusion_"))
    setting_filename = setting_path.split('/')[-1]
    out_path = tmp_dir / setting_filename
    out_path.write_text(patched, encoding='utf-8')
    print(f"📁 Patched .setting extracted to: {out_path}")
    return out_path


# ─────────────────────────────────────────────────────────────────────────────
# GENKIT FUSION BRIDGE CLASS
# ─────────────────────────────────────────────────────────────────────────────

class GenkitFusionBridge:
    """
    Manages MotionVFX Fusion Title template injection into a DaVinci Resolve
    timeline. Designed to be instantiated from build_timeline.py after the
    main EDL clips have been appended to Track 1.

    Args:
        resolve: The DaVinci Resolve script app object.
        media_pool: The active project's MediaPool object.
        timeline: The target Timeline object.
        drfx_path: Optional override for the .drfx template path.
        setting_inner_path: Optional override for the .setting path inside the archive.
    """

    def __init__(self, resolve, media_pool, timeline,
                 drfx_path: Path = DRFX_PATH,
                 setting_inner_path: str = SETTING_INNER_PATH):
        self.resolve = resolve
        self.media_pool = media_pool
        self.timeline = timeline
        self.drfx_path = drfx_path
        self.setting_inner_path = setting_inner_path

    def import_as_comp(self, title_text: str, video_track: int = 2,
                       position_frames: int = 0, duration_frames: int = 72) -> bool:
        """
        STRATEGY B (Recommended): Extract the patched .setting file and import it
        directly into the Media Pool as a Fusion Comp. This bypasses the startup
        template cache — no Resolve restart needed.

        Args:
            title_text: The text to inject into the MotionVFX template.
            video_track: Timeline video track to place the title on (default: 2).
            position_frames: Frame position on the timeline (default: 0 = start).
            duration_frames: Duration in frames (default: 72 = 3sec @ 24fps).

        Returns:
            True on success, False on failure.
        """
        print(f"\n🎬 GenkitFusionBridge.import_as_comp()")
        print(f"   Title text : \"{title_text}\"")
        print(f"   Track      : Video {video_track}")
        print(f"   Position   : Frame {position_frames}")
        print(f"   Duration   : {duration_frames} frames")

        try:
            # Extract patched .setting to temp dir
            setting_path = extract_setting_to_temp(title_text, self.drfx_path,
                                                   self.setting_inner_path)

            # Import as Fusion Comp into Media Pool
            print(f"🚀 Importing Fusion Comp into Media Pool...")
            # ImportFusionComp returns a MediaPoolItem or None
            comp_item = self.media_pool.ImportFusionComp(str(setting_path))

            if not comp_item:
                print("❌ ImportFusionComp returned None — check that DaVinci is on the Edit page.")
                return False

            print(f"✅ Comp imported: {comp_item.GetName()}")

            # Append to the target video track
            clip_info = {
                "mediaPoolItem": comp_item,
                "startFrame": 0,
                "endFrame": duration_frames,
                "trackIndex": video_track,
                "recordFrame": position_frames,
            }
            result = self.media_pool.AppendToTimeline([clip_info])

            if result:
                print(f"✅ Title \"{title_text}\" placed on Video Track {video_track}!")
                # Clean up temp file
                try:
                    setting_path.parent.rmdir() if not list(setting_path.parent.iterdir()) else None
                except Exception:
                    pass
                return True
            else:
                print("❌ AppendToTimeline failed for Fusion Comp.")
                return False

        except Exception as e:
            print(f"❌ import_as_comp failed: {e}")
            import traceback
            traceback.print_exc()
            return False

    def inject_and_restart(self, title_text: str) -> None:
        """
        STRATEGY A (Fallback): Patch the .drfx in-place and print instructions
        to restart DaVinci Resolve. Use when Strategy B is unavailable.
        """
        print(f"\n🔧 GenkitFusionBridge.inject_and_restart()")
        inject_template_text(title_text, self.drfx_path, self.setting_inner_path)
        print()
        print("=" * 55)
        print("⚠️  ACTION REQUIRED: DaVinci Resolve startup cache bypass")
        print("=" * 55)
        print()
        print("  The .drfx template has been patched with your text.")
        print("  DaVinci Resolve caches templates at application launch.")
        print()
        print("  To load the patched template:")
        print("  1. CLOSE DaVinci Resolve completely.")
        print("  2. REOPEN DaVinci Resolve.")
        print("  3. Re-run build_timeline.py.")
        print()
        print(f"  Patched text: \"{title_text}\"")


# ─────────────────────────────────────────────────────────────────────────────
# STANDALONE ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "--restore":
        print("\n🔄 Restoring original template...")
        restore_original()
        sys.exit(0)

    print("🚀 MotionVFX Fusion Template Pre-Injection Engine")
    print("=" * 55)

    try:
        inject_template_text(DEFAULT_TEXT)
        print()
        print("=" * 55)
        print("✅ Template pre-patched successfully!")
        print()
        print("NEXT STEPS:")
        print("  1. In DaVinci Resolve, go to the Edit page.")
        print("  2. Open the Workspace > Console > Py3 console.")
        print("  3. Run this one-liner to insert the template:")
        print()
        print("     fusion_clip = timeline.InsertFusionTitleIntoTimeline(\"mLogo Cinematic 2 17\")")
        print("     print(f'Inserted: {fusion_clip.GetName()}')")
        print()
        print("  4. Or run build_timeline.py with titleText in your EDL payload")
        print("     to use GenkitFusionBridge.import_as_comp() automatically.")
        print()
        print("  5. To restore template to default, run:")
        print("     python fusion_injector.py --restore")
        print()
    except Exception as e:
        print(f"❌ Pre-injection failed: {e}")
        import traceback
        traceback.print_exc()
