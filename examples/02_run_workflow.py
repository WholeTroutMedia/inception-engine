#!/usr/bin/env python3
"""Example 02: How to Run a Simple Workflow

Demonstrates running the four-mode pipeline:
IDEATE -> PLAN -> SHIP -> VALIDATE

Runnable: Yes - uses ModeManager directly, no external deps.
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from core.mode_manager import ModeManager, ModeType, ModeStatus


def main():
    print("="*60)
    print("INCEPTION ENGINE - Workflow Execution Example")
    print("="*60)

    # Initialize the mode manager (works without config files)
    mm = ModeManager(modes_dir="__nonexistent__")
    print(f"\n[1] ModeManager initialized")
    print(f"    Configs loaded: {len(mm.configs)}")

    # --- IDEATE MODE ---
    print(f"\n{'='*40}")
    print("MODE 1: IDEATE")
    print(f"{'='*40}")

    ideate_config = mm.get_config(ModeType.IDEATE)
    print(f"    Tagline: {ideate_config.tagline}")
    print(f"    Objective: {ideate_config.objective}")

    result = mm.start_mode(ModeType.IDEATE, {"prompt": "Build an artist portfolio platform"})
    print(f"    Started session: {result['session_id']}")
    print(f"    Current mode: {mm.current_mode}")

    complete = mm.complete_mode({"vision_document": "Artist portfolio with open exports"})
    print(f"    Completed: {complete['success']}")

    # --- PLAN MODE ---
    print(f"\n{'='*40}")
    print("MODE 2: PLAN")
    print(f"{'='*40}")

    result = mm.start_mode(ModeType.PLAN, {"vision": "Artist portfolio platform"})
    print(f"    Started session: {result['session_id']}")

    complete = mm.complete_mode({"technical_specification": "Next.js + FastAPI stack"})
    print(f"    Completed: {complete['success']}")

    # --- SHIP MODE ---
    print(f"\n{'='*40}")
    print("MODE 3: SHIP")
    print(f"{'='*40}")

    result = mm.start_mode(ModeType.SHIP, {"spec": "Technical spec for portfolio"})
    print(f"    Started session: {result['session_id']}")

    complete = mm.complete_mode({
        "code_complete": True,
        "tests_passing": True,
        "deployed": True,
        "production_url": "https://portfolio.example.com"
    })
    print(f"    Completed: {complete['success']}")

    # --- VALIDATE MODE ---
    print(f"\n{'='*40}")
    print("MODE 4: VALIDATE")
    print(f"{'='*40}")

    result = mm.start_mode(ModeType.VALIDATE, {"build_output": "Production deployment"})
    print(f"    Started session: {result['session_id']}")

    complete = mm.complete_mode({"validation_passed": True, "score": 95})
    print(f"    Completed: {complete['success']}")

    # --- SUMMARY ---
    print(f"\n{'='*60}")
    print("WORKFLOW COMPLETE")
    print(f"{'='*60}")

    summary = mm.get_session_summary()
    print(f"    Total sessions: {summary['total_sessions']}")
    print(f"    Sessions by mode:")
    for mode, count in summary['sessions_by_mode'].items():
        print(f"        {mode}: {count}")

    # Show mode transitions
    print(f"\n    Standard transitions:")
    for mode in ModeType:
        next_mode = mm.transition_to_next_mode(mode)
        next_name = next_mode.value if next_mode else "END"
        print(f"        {mode.value} -> {next_name}")

    history = mm.get_mode_history()
    print(f"\n    Mode history ({len(history)} entries):")
    for entry in history:
        print(f"        {entry['mode'].value}: {entry['status']}")

    print("\n" + "="*60)
    print("Four-mode pipeline demonstrated successfully.")
    print("="*60)


if __name__ == "__main__":
    main()
