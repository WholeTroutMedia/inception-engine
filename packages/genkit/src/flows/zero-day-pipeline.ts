import { z } from 'genkit';
import { ai } from '../index.js';

export const zeroDayBriefPipeline = async (payload: any) => {
    console.log('[GENKIT] 🚀 Executing Zero-Day Pipeline Flow');
    console.log('[GENKIT] Payload received:', payload);

    // In a real flow, this would orchestrate multiple agents (LEX, IRIS, etc.)
    // For Genesis, we'll validate the intake and generate an acknowledgment or strategy doc.

    const result = await ai.generate({
        model: 'googleai/gemini-2.5-flash',
        system: `You are ATHENA, the strategic lead of the Creative Liberation Engine.
You have just received a new Creative Brief from a Zero-Day intake session.
Analyze the brief and output a short, 3-point psychological strategy for how the agency should approach this client.`,
        prompt: `Client Name: ${payload.client_name}
Project Type: ${payload.project_type}
Budget: ${payload.budget_range}
Timeline: ${payload.timeline}

Brief Details:
${payload.brief_text}`,
    });

    console.log('[GENKIT] 🧠 ATHENA Strategy Generated:', result.text);

    return {
        success: true,
        strategy: result.text,
        session_id: payload.session_id,
        timestamp: new Date().toISOString()
    };
};

