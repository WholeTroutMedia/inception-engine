import { z } from 'genkit';
import { ai } from '../index.js';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SCHEMAS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const ConversationalVt100InputSchema = z.object({
    text: z.string().describe('The transcribed text from the user via iOS Shortcuts'),
    sessionId: z.string().optional().describe('Session ID to maintain conversation state'),
});

export const ConversationalVt100OutputSchema = z.object({
    spokenResponse: z.string().describe('The plain text response meant to be spoken by Siri (no markdown)'),
    dispatchedTask: z.boolean().describe('Whether a task was autonomously dispatched to the queue'),
    taskId: z.string().optional().describe('The ID of the dispatched task, if any'),
});

export type ConversationalVt100Input = z.infer<typeof ConversationalVt100InputSchema>;
export type ConversationalVt100Output = z.infer<typeof ConversationalVt100OutputSchema>;

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// FLOW
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const conversationalVt100Flow = ai.defineFlow(
    {
        name: 'conversationalVt100',
        inputSchema: ConversationalVt100InputSchema,
        outputSchema: ConversationalVt100OutputSchema,
    },
    async (input): Promise<ConversationalVt100Output> => {
        const sessionId = input.sessionId ?? `siri_${Date.now()}`;
        console.log(`[VT100:VOICE] Received dictation: "${input.text.slice(0, 80)}..."`);

        // Phase 1: Determine if this is an actionable thought (requires dispatch) or just conversation
        const intentSystem = `You are a router. Analyze the user's spoken input.
If it is a brainstorm, an idea, a request to build something, or a technical architectural thought, return {"actionable": true}.
If it is just conversational fluff, a greeting, or a quick question that doesn't require work, return {"actionable": false}.
Respond strictly in JSON.`;

        const { text: intentResult } = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            system: intentSystem,
            prompt: input.text,
            config: { temperature: 0.1 },
        });

        let actionable = false;
        try {
            const parsed = JSON.parse(intentResult.replace(/```json\n?|\n?```/g, '').trim());
            actionable = parsed.actionable === true;
        } catch (e) {
            console.error('[VT100:VOICE] Failed to parse intent, defaulting to actionable=false', e);
        }

        let dispatchedTask = false;
        let taskId: string | undefined = undefined;

        // Phase 2: If actionable, run the UPE-style logic and drop it in the dispatch queue
        if (actionable) {
            try {
                const upeSystem = `You are the Universal Prompt Engineer (UPE) operating autonomously via Voice Command.
Take the user's raw spoken thought and formulate a highly structured execution plan.
Extract a concise 'title' (max 6 words) and a detailed 'description' formatted objectively.`;
                
                const { text: dispatchPayload } = await ai.generate({
                    model: 'googleai/gemini-2.5-flash',
                    system: upeSystem,
                    prompt: `User thought: ${input.text}\n\nReturn ONLY a JSON object with: { "title": string, "description": string }`,
                    config: { temperature: 0.2 },
                });

                const payload = JSON.parse(dispatchPayload.replace(/```json\n?|\n?```/g, '').trim());
                
                const response = await fetch('http://127.0.0.1:5050/api/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: payload.title,
                        description: payload.description,
                        priority: 'P2',
                        org: 'Creative-Liberation-Engine',
                        project: 'brainchild-v5',
                        workstream: 'inbound-voice'
                    }),
                });

                if (response.ok) {
                    const data = (await response.json()) as { id?: string };
                    taskId = data.id;
                    dispatchedTask = true;
                    console.log(`[VT100:VOICE] Dispatched task to queue: ${taskId}`);
                }
            } catch (err) {
                console.error('[VT100:VOICE] Failed to dispatch task autonomously:', err);
            }
        }

        // Phase 3: Generate the spoken response for Siri
        const conversationalSystem = `You are vt100, the conversational terminal of the Creative Liberation Engine.
The user is speaking to you via their iPhone Action Button while away from their desk.
If the input was an actionable idea, acknowledge it briefly and tell the user you have queued the architectural plan to the dispatch board for Creative Liberation Engine (the agent) to execute.
If the input was just a question or conversation, answer it directly and concisely.

CRITICAL CONSTRAINTS:
1. This text will be read aloud by Siri TTS.
2. DO NOT use Markdown (no asterisks, no hash symbols, no bolding, no code blocks).
3. Keep it punchy, conversational, and under 3 sentences. No long essays.
4. Speak naturally.`;

        const { text: spokenResponse } = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            system: conversationalSystem,
            prompt: `User said: "${input.text}"\nActionable task dispatched to NAS queue: ${dispatchedTask}`,
            config: { temperature: 0.7 },
        });

        console.log(`[VT100:VOICE] Replying: "${spokenResponse}"`);

        return {
            spokenResponse: spokenResponse.trim(),
            dispatchedTask,
            taskId,
        };
    }
);

