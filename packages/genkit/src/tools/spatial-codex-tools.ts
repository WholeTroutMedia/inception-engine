import { ai, z } from '../index.js';
import axios from 'axios';
import { ingestHardwareSpec, searchHardwareCodex } from '@cle/spatial-codex';

export const ingestHardwareSpecTool = ai.defineTool(
    {
        name: 'ingestHardwareSpec',
        description: 'Extracts a comprehensive structural hardware blueprint from the internet for a given device and saves it to the local Spatial Hardware Codex.',
        inputSchema: z.object({
            query: z.string().describe('The name or type of hardware (e.g., lawnmower, espresso machine, drone)')
        }),
        outputSchema: z.unknown()
    },
    async (input) => {
        try {
            const spec = await ingestHardwareSpec(input.query);
            return { status: 'Ingested', spec };
        } catch (error: any) {
            console.error('[spatial-codex-tools] Error ingesting codex:', error);
            return { error: error.message };
        }
    }
);

export const searchHardwareCodexTool = ai.defineTool(
    {
        name: 'searchHardwareCodex',
        description: 'Searches the offline Spatial Hardware Codex (Creative Liberation Engine) for highly detailed JSON models of physical robotics and appliances.',
        inputSchema: z.object({
            query: z.string().describe('The name or type of hardware (e.g., lawnmower, espresso machine, drone)'),
        }),
        outputSchema: z.unknown()
    },
    async (input) => {
        try {
            const results = await searchHardwareCodex(input.query);
            if (results.length === 0) {
                 return { status: 'No matching records found in local codex.', query: input.query, results: [] };
            }
            return { status: 'Success', results };
        } catch (error: any) {
            console.error('[spatial-codex-tools] Error searching codex:', error);
            return { error: error.message, results: [] };
        }
    }
);

export const deployToEonRealityTool = ai.defineTool(
    {
        name: 'deployHardwareToEonReality',
        description: 'Autonomously dispatches a known hardware blueprint from the local codex directly into the EON Reality Content Factory to generate an XR Spatial Training environment.',
        inputSchema: z.object({
            query: z.string().describe('The specific hardware target to push to EON (e.g., lawnmower, powerwall)'),
            dryRun: z.boolean().default(true).describe('Whether to run a dry-run test (true) or live EON deployment (false)')
        }),
        outputSchema: z.unknown()
    },
    async (input) => {
        console.log(`[spatial-codex-tools] Deploying XR training for: ${input.query} (dryRun=${input.dryRun})`);
        
        try {
            const response = await axios.post('http://127.0.0.1:5200/eon-reality/ingest-codex', {
                query: input.query,
                dry_run: input.dryRun
            }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000 
            });
            
            return {
                status: 'Deployed',
                server_response: response.data
            };
        } catch (error: any) {
             console.error('[spatial-codex-tools] Error bridging to python EON server:', error.message);
             return { error: `Failed to connect to EON Reality Bridge port 5200: ${error.message}` };
        }
    }
);

export const spatialCodexTools = [
    ingestHardwareSpecTool,
    searchHardwareCodexTool,
    deployToEonRealityTool
];
