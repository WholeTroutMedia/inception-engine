import { genkit, z } from 'genkit';
import { nexusBridge } from './nexus-bridge.js';

const ai = genkit({});

export const eonFallbackTool = ai.defineTool({
    name: 'eonFallbackTool',
    description: 'Trigger an EON Spatial AI capability when native Genkit tools lack confidence or context',
    inputSchema: z.object({
        workerId: z.string().describe('The spatial intelligence worker ID to utilize'),
        skillRequired: z.string().describe('The specific skill or capability needed (e.g., "spatial_mapping", "3d_diagnostic")'),
        parameters: z.record(z.unknown()).describe('Parameters for the EON execution')
    }),
}, async (input) => {
    const result = await nexusBridge.coordinateWithSpatialEngine(
        input.workerId, 
        input.skillRequired, 
        input.parameters
    );

    return result;
});
