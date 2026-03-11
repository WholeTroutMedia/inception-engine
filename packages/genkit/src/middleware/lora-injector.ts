import { getLoraLens } from '../loras/registry.js';

/**
 * LoraInjector Middleware
 * 
 * Intercepts Genkit execution requests and inspects the context/headers for 
 * requested LoRA persona injections. If found, it dynamically prepends the 
 * domain-specific instructional core to the system prompt and adjusts the 
 * model's temperature accordingly.
 */
export async function loraInjectorMiddleware(
    req: any, // The Genkit GenerateRequest
    next: (req: any) => Promise<any>
) {
    // Look for LoRAs requested in the context config
    // We expect req.context.loras to be an array of string IDs
    const requestedLoras: string[] = req.context?.loras || [];

    if (requestedLoras.length === 0) {
        return next(req);
    }

    let appendedPrompt = '';
    let totalTempBias = 0;
    const appliedLenses: string[] = [];

    for (const loraId of requestedLoras) {
        const lens = getLoraLens(loraId);
        if (lens) {
            appendedPrompt += `\n\n${lens.instructionalCore}\n`;
            totalTempBias += lens.temperatureBias;
            appliedLenses.push(lens.name);
        } else {
            console.warn(`[LORA INJECTOR] Warning: Requested LoRA lens '${loraId}' not found in registry.`);
        }
    }

    if (appliedLenses.length > 0) {
        console.log(`[LORA INJECTOR] 🧠 Injecting reasoning lenses: ${appliedLenses.join(', ')}`);

        // Clone the request to avoid mutating the original
        const modifiedReq = { ...req };

        // Ensure system prompt exists
        if (!modifiedReq.messages) modifiedReq.messages = [];

        const systemMessageIndex = modifiedReq.messages.findIndex((m: any) => m.role === 'system');

        if (systemMessageIndex >= 0) {
            modifiedReq.messages[systemMessageIndex].content.unshift({
                text: `\n--- DYNAMIC REASONING ENHANCERS APPLIED ---\n${appendedPrompt}\n-------------------------------------------\n\n`
            });
        } else {
            modifiedReq.messages.unshift({
                role: 'system',
                content: [{ text: `\n--- DYNAMIC REASONING ENHANCERS APPLIED ---\n${appendedPrompt}\n-------------------------------------------\n\n` }]
            });
        }

        // Adjust temperature if config exists
        if (modifiedReq.config && typeof modifiedReq.config.temperature === 'number') {
            modifiedReq.config.temperature = Math.max(0.0, Math.min(1.0, modifiedReq.config.temperature + totalTempBias));
            console.log(`[LORA INJECTOR] 🌡️ Adjusted temperature by ${totalTempBias} to ${modifiedReq.config.temperature}`);
        }

        return next(modifiedReq);
    }

    return next(req);
}
