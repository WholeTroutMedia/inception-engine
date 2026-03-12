/**
 * run_omnimedia.ts — OmniMedia V2 Entry Point
 *
 * The single command to activate the God Node.
 * Calls OmniMediaOrchestratorFlow, then spawns v2_full_assembler.py
 * to physically build the Resolve timeline.
 *
 * Usage:
 *   npx tsx run_omnimedia.ts
 *   npx tsx run_omnimedia.ts --folder "B:\MyEvent" --duration 20 --format vertical --prompt "Fast cuts, neon, Berlin rave energy"
 */

import { kgenmediaFlow } from './src/flows/omnimedia-orchestrator.js';
import { spawn } from 'child_process';
import path from 'path';
import { parseArgs } from 'util';
import 'dotenv/config';

// ─────────────────────────────────────────────────────────────────────────────
// ARG PARSING
// ─────────────────────────────────────────────────────────────────────────────

const { values: args } = parseArgs({
    options: {
        folder: { type: 'string', short: 'f' },
        prompt: { type: 'string', short: 'p' },
        duration: { type: 'string', short: 'd' },
        format: { type: 'string' },
        'no-resolve': { type: 'boolean' },
    },
    allowPositionals: true,
});

// Defaults — edit these for your current shoot
const NAS_FOLDER = args.folder || String.raw`B:\Barnstorm 2026 Media\Content_to_Publish\Event_Originals\REALSLX_RAOS_SB2026`;
const MASTER_PROMPT = args.prompt || "Create a 20-second hype reel. Cinematic, documentary style, focused on the band and the energy of the event. Vertical for Instagram.";
const DURATION = parseInt(args.duration || '20', 10);
const FORMAT = (args.format || 'vertical') as 'vertical' | 'landscape' | 'square';
const SKIP_RESOLVE = args['no-resolve'] ?? false;

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
    console.log('\n' + '█'.repeat(60));
    console.log('  OMNIMEDIA V2 — GOD NODE ACTIVATED');
    console.log('█'.repeat(60));
    console.log(`  Folder  : ${NAS_FOLDER}`);
    console.log(`  Prompt  : ${MASTER_PROMPT}`);
    console.log(`  Duration: ${DURATION}s`);
    console.log(`  Format  : ${FORMAT}`);
    console.log('█'.repeat(60) + '\n');

    // ── Step 1: Run OmniMedia God Node Orchestrator ──────────────────────
    let result;
    try {
        result = await kgenmediaFlow({
            masterPrompt: MASTER_PROMPT,
            nasFolder: NAS_FOLDER,
            targetDuration: DURATION,
            format: FORMAT,
        });
    } catch (e) {
        console.error('\n❌ OmniMedia Orchestrator failed:', e);
        process.exit(1);
    }

    console.log('\n✅ Orchestrator finished. Assembly payload at:', result.assemblyPayloadPath);
    console.log('\nBranch summary:');
    console.log(`  kruled    : ${result.branchStatus.kruled}`);
    console.log(`  GenMedia  : ${result.branchStatus.genMedia}`);
    console.log(`  VFX       : ${result.branchStatus.vfx}`);
    console.log(`  Blender   : ${result.branchStatus.blender}`);

    if (SKIP_RESOLVE) {
        console.log('\n⚠️  --no-resolve flag set. Skipping DaVinci Resolve assembly.');
        console.log(`   To assemble manually: python v2_full_assembler.py --payload "${result.assemblyPayloadPath}"`);
        return;
    }

    // ── Step 2: Spawn Python Resolve Assembler ───────────────────────────
    console.log('\n' + '─'.repeat(60));
    console.log('🎚️  Launching DaVinci Resolve Assembler (v2_full_assembler.py)...');
    console.log('   Ensure DaVinci Resolve Studio is open on the Edit page!');
    console.log('─'.repeat(60) + '\n');

    await new Promise<void>((resolve_p, reject) => {
        const assemblerScript = path.join(process.cwd(), 'v2_full_assembler.py');
        const proc = spawn('python', [
            assemblerScript,
            '--payload', result.assemblyPayloadPath,
        ], { stdio: 'inherit' });

        proc.on('close', (code) => {
            if (code === 0) {
                console.log('\n✅ Resolve assembler complete.');
                resolve_p();
            } else {
                console.error(`\n❌ Resolve assembler exited with code ${code}`);
                reject(new Error(`v2_full_assembler.py exited ${code}`));
            }
        });

        proc.on('error', (e) => {
            console.error('\n❌ Failed to spawn v2_full_assembler.py:', e);
            reject(e);
        });
    });

    // ── Step 3: Final Summary ─────────────────────────────────────────────
    console.log('\n' + '█'.repeat(60));
    console.log('  OMNIMEDIA V2 COMPLETE');
    console.log('█'.repeat(60));
    console.log(`  Session  : ${result.sessionId}`);
    console.log(`  Title    : "${result.titleText}"`);
    console.log(`  EDL cuts : ${result.edl?.length ?? 0}`);
    console.log(`  B-roll   : ${result.generatedBroll.length} AI clips`);
    console.log(`  VFX      : ${result.vfxOverlayPath ? '✅' : '—'}`);
    console.log(`  Blender  : ${result.blenderTitleCardPath ? '✅' : '—'}`);
    console.log(`  Audio    : ${result.audioRecommendation?.genre} @ ${result.audioRecommendation?.bpm} BPM`);
    console.log('█'.repeat(60));
}

main().catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
});
