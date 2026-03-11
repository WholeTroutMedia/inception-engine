import { ingestHardwareSpec } from '../index.js';

const targetBlueprints = [
    "Husqvarna Automower 450X (Robotic Mower)",
    "Roborock S8 Pro Ultra (Robotic Vacuum)",
    "Toro SnowMaster 824 QXE (Snowblower)",
    "Breville Oracle Touch (Smart Espresso Machine)",
    "AC Infinity Advance Grow System (Automated Grow Tent)"
];

async function runMassIngestion() {
    console.log('================================================');
    console.log('[Spatial-Codex] Commencing Mass Hardware Ingestion');
    console.log('================================================');

    for (const target of targetBlueprints) {
        try {
            console.log(`\n-> Queuing Ingestion: ${target}`);
            const result = await ingestHardwareSpec(target);
            console.log(`   [Success] Saved ${result.deviceClass} blueprint.`);
        } catch (error) {
            console.error(`   [Error] Failed to ingest ${target}:`, error instanceof Error ? error.message : error);
        }
    }

    console.log('\n================================================');
    console.log('[Spatial-Codex] Hardware Library Population Complete');
}

runMassIngestion().catch(console.error);
