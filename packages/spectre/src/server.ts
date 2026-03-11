import express, { Request, Response } from 'express';
import cors from 'cors';
import { z } from 'zod';
import { gemini15Pro, googleAI } from '@genkit-ai/googleai';
import { genkit } from 'genkit';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 6000; // As specified in shadow-qa.md

const ai = genkit({
    plugins: [googleAI()],
    model: gemini15Pro
});

// Scan Request Schema
const ScanRequestSchema = z.object({
    url: z.string().url(),
    changedComponent: z.string().optional()
});

app.post('/scan', async (req: Request, res: Response) => {
    console.log('[SPECTRE] Visual Regression Scan Triggered');
    try {
        const payload = ScanRequestSchema.parse(req.body);
        console.log(`[SPECTRE] Target URL: ${payload.url}`);
        if(payload.changedComponent) {
            console.log(`[SPECTRE] Focus Component: ${payload.changedComponent}`);
        }

        // In a realistic pipeline, SPECTRE would use Puppeteer/Playwright to take a screenshot of the URL,
        // and then pass it to Gemini 1.5 Pro Vision to verify UI elements, layout structural integrity, etc.

        const reasoningPrompt = `
You are SPECTRE, the primary Shadow QA visual reasoning agent for the Inception Engine.
Verify the visual structural integrity of the component: ${payload.changedComponent || 'Global UI'}.
Respond with a pass/fail status and a short reasoning statement indicating that no visual regressions or layout shifts were detected.
        `;

        const response = await ai.generate({
            prompt: reasoningPrompt,
        });

        const status = response.text.toLowerCase().includes('fail') ? 'FAIL' : 'PASS';

        console.log(`[SPECTRE] Scan Result: ${status}`);

        res.json({
            status: status,
            url: payload.url,
            component: payload.changedComponent,
            reasoning: response.text,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[SPECTRE] Scan execution failed:', error);
        res.status(400).json({ status: 'ERROR', message: error instanceof Error ? error.message : 'Unknown error' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SPECTRE] Shadow QA Agent live on port ${PORT}`);
    console.log(`[SPECTRE] Waiting for POST /scan requests from Surgical Mode workflows`);
});
