import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({});

export const HardwareSpecSchema = z.object({
    deviceClass: z.string().describe("e.g., Robotic Lawnmower, Espresso Machine"),
    manufacturer: z.string().describe("e.g., Husqvarna, Breville"),
    modelName: z.string(),
    primaryComponents: z.array(z.string()).describe("List of fundamental structural pieces (motors, sensors, chassis)"),
    operationalLogic: z.string().describe("Brief summary of how it mechanically operates"),
    maintenanceNodes: z.array(z.string()).describe("Parts that require human intervention or repair")
});

export type HardwareSpec = z.infer<typeof HardwareSpecSchema>;

const dataDir = path.join(process.cwd(), 'data');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

export async function ingestHardwareSpec(hardwareQuery: string) {
    console.log(`[Spatial-Codex] Ingesting structural data for: ${hardwareQuery}`);

    const prompt = `
You are the primary ingestion engine for the Spatial Hardware Codex (Inception Engine).
We are building a massive library of modern tech and hardware (robotics, appliances, grow tents, smarter homes).

Your task is to exhaustively detail the mechanical and structural blueprint of the following hardware:
${hardwareQuery}

Return ONLY a valid JSON object matching the following schema. Do not include markdown formatting or explanations.
Schema:
{
    "deviceClass": "e.g., Robotic Lawnmower, Espresso Machine",
    "manufacturer": "e.g., Husqvarna, Breville",
    "modelName": "String",
    "primaryComponents": ["List of fundamental structural pieces (motors, sensors, chassis)"],
    "operationalLogic": "Brief summary of how it mechanically operates",
    "maintenanceNodes": ["Parts that require human intervention or repair"]
}
`;

    const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    if(!result.text) {
         throw new Error("Failed to generate hardware spec output.");
    }

    const cleanedText = result.text.replace(/```json/g, '').replace(/```/g, '').trim();
    const spec = JSON.parse(cleanedText) as HardwareSpec;
    
    const safeFilename = `${spec.manufacturer.toLowerCase().replace(/[^a-z0-9]/g, '')}-${spec.modelName.toLowerCase().replace(/[^a-z0-9]/g, '')}.json`;
    fs.writeFileSync(path.join(dataDir, safeFilename), JSON.stringify(spec, null, 2));

    console.log(`[Spatial-Codex] Spec saved: ${safeFilename}`);
    return spec;
}

export function searchHardwareCodex(query: string) {
    console.log(`[Spatial-Codex] Searching local library for: ${query}`);
    const files = fs.readdirSync(dataDir);
    const results = [];
    
    for(const file of files) {
        if(file.endsWith('.json')) {
            const raw = fs.readFileSync(path.join(dataDir, file), 'utf-8');
            const parsed = JSON.parse(raw);
            const searchString = `${parsed.deviceClass} ${parsed.manufacturer} ${parsed.modelName}`.toLowerCase();
            
            if(searchString.includes(query.toLowerCase())) {
                results.push(parsed);
            }
        }
    }
    
    return results;
}
