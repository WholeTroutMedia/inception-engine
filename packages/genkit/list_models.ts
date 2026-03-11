import fs from 'fs';

async function listModels() {
    const envStr = fs.readFileSync('.env', 'utf-8');
    const match = envStr.match(/GEMINI_API_KEY=(.+)/);
    if (!match) throw new Error("No key found");
    const key = match[1].trim();

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    console.log("Fetching Google AI endpoints...");
    const res = await fetch(url);
    const data = await res.json();
    if (data.models) {
        data.models.forEach(model => {
            if (model.name.includes("pro") || model.name.includes("gemini")) {
                console.log(model.name);
            }
        });
    } else {
        console.error("Failed to parse models block");
        console.error(data);
    }
}

listModels().catch(console.error);
