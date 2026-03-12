import { z } from "genkit";
import { ai } from "../index.js";

export const khrdFlow = ai.defineFlow(
    {
        name: "khrd",
        inputSchema: z.object({
            videoFiles: z.array(z.string()).describe("Array of absolute file paths to proxy videos"),
            targetDuration: z.number().describe("Target duration of the hype reel in seconds"),
            mood: z.string().describe("Mood or structural direction (e.g., 'Aggressive Action Beats', 'Emotional Slow Push')"),
        }),
        outputSchema: z.any(),
    },
    async (input) => {
        console.log("🎬 kruled Director initialized with", input.videoFiles.length, "media assets.");

        // Map local absolute paths into Genkit part media format with injected filenames
        const mediaParts = input.videoFiles.flatMap((path, i) => {
            return [
                { text: `\n--- VIDEO ASSET ${i + 1} filepath: ${path} ---\n` },
                {
                    media: {
                        url: path.startsWith("http") ? path : `file://${path.replace(/\\/g, "/")}`, // Accept Cloud API or local
                        contentType: (path.endsWith(".mp4") || path.startsWith("https://")) ? "video/mp4" : "video/quicktime", // Explicit MIME required for raw .mov formats 
                    }
                }
            ];
        });

        const promptText = {
            text: `You are kruled, the lead Masterclass video director. 
      You have been provided with exactly ${input.videoFiles.length} raw video proxies representing the ENTIRE event.
      Your objective is to craft an Edit Decision List (EDL) for a hype reel and recommend the perfect audio track for the editor.
      Target Duration: ${input.targetDuration} seconds.
      Creative Mood/Pacing: ${input.mood}.
      
      Instructions:
      1. Watch/analyze ALL provided videos in detail.
      2. RUTHLESSLY discard >90% of the footage. Curate ONLY the 5-8 most critical, visually striking hero moments that perfectly match the mood.
      3. Math out the exact start and end times for these micro-cuts so they sum up to roughly exactly ${input.targetDuration} seconds.
      4. Avoid continuous unbroken shots lasting more than 3-4 seconds if the mood is 'Action' or 'Chaotic-fast'.
      5. Output pure JSON adhering to the specified schema format. 
      6. STRICTLY output integer numbers for startTime and endTime (e.g. 5, 23). DO NOT output timestamp strings (e.g. "00:00:23").
      7. Use the EXTRACTED filepath from the VIDEO ASSET headers provided before each video as the "filePath".
      8. Include an "audioRecommendation" object in the root of your JSON output detailing the ideal BPM, Genre, and Vibes for the editor to sync these cuts against. Example root output: { "edl": [...], "audioRecommendation": { "bpm": 120, "genre": "Phonk", "vibe": "Aggressive" } }
      9. Include a "titleText" field (string, max 4 words, ALL CAPS) in the root of your JSON output. This is the headline title for the video — a punchy, event-specific string that will be injected as a MotionVFX lower-third title. Example: "SUPER BOWL PARTY 2026" or "THE BAND PLAYS ON" or "EXCLUSIVE ACCESS ONLY".`
        };

        console.log("🧠 Transmitting massive multimodal payload to Gemini 3 Pro...");

        const response = await ai.generate({
            // We explicitly bypass the routing layer for physical media routing right to the heaviest brain
            model: 'googleai/gemini-2.5-flash',
            messages: [
                {
                    role: "user",
                    content: [...mediaParts, promptText],
                }
            ],
            output: { format: "json" },
            config: {
                temperature: 0.8, // Slightly creative but mathematically strict
            }
        });

        try {
            console.log(`✅ kruled cut completed. JSON OUTPUT:`, response.text);
            return JSON.parse(response.text);
        } catch (e) {
            console.error("kruled Director Failed:", e);
            throw e;
        }
    }
);

