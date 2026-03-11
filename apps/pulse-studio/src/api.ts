const PERPLEXITY_API_KEY = import.meta.env.VITE_PERPLEXITY_API_KEY;
const PERPLEXITY_MODEL = import.meta.env.VITE_PERPLEXITY_MODEL || 'sonar';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';

import * as fal from "@fal-ai/serverless-client";
fal.config({
  credentials: import.meta.env.VITE_FAL_KEY,
});

export async function fetchLivePlayerStats(player: string) {
  if (!PERPLEXITY_API_KEY) {
    console.warn("No Perplexity API key found."); 
    return null;
  }
  
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: PERPLEXITY_MODEL,
        messages: [
          { role: 'system', content: 'You are a real-time sports data API. Return ONLY a valid JSON object with the requested player strictly based on their most recent game or current season performance. Keys MUST be: "pts" (number), "fg_pct" (number), "hr" (mock a live heart rate number between 150-180). Do not include any text formatting or markdown.' },
          { role: 'user', content: `Get live stats for ${player}` }
        ]
      })
    });
    
    const data = await response.json();
    const rawContent = data.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(rawContent);
  } catch (e) {
    console.error("Failed to parse perplexity response", e);
    return null;
  }
}

export async function generateCreativeSnapshot(player: string, stats: any) {
  if (!GEMINI_API_KEY) {
    console.warn("No Gemini API key found.");
    return null;
  }
  
  const prompt = `You are a professional AI Sports Media Studio.
  The broadcast operator is locking focus on: ${player}. 
  Context Stats: Points: ${stats?.pts || 'N/A'}, FG%: ${stats?.fg_pct || 'N/A'}
  
  Draft a high-impact, immediate 2-sentence creative brief or narrative overlay for a live broadcast cut. It must sound professional, tactile, and engineered for high-engagement vertical video. No hashtags, no playful emojis, purely tactical sports broadcast tension.`;
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Generation failure.";
  } catch (e) {
    console.error("Failed to generate with Gemini", e);
    return "Generation offline.";
  }
}

export async function generateThumbnail(player: string, insight: string) {
  const prompt = `Cinematic, hyper-realistic, dynamic sports photography shot on 85mm lens pulling focus. ${player} in an intense clutch moment. Moody arena lighting. Text overlay concept: ${insight.substring(0, 50)}... Professional broadcast quality, vertical 9:16 aspect ratio.`;
  
  try {
    const result: any = await fal.subscribe("fal-ai/flux/dev", {
      input: {
        prompt: prompt,
        image_size: "portrait_16_9",
        num_inference_steps: 28,
        guidance_scale: 3.5
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log) => log.message).forEach(console.log);
        }
      },
    });
    
    return result.images[0].url;
  } catch (e) {
    console.error("FAL Error:", e);
    return null;
  }
}

export async function generateAudioDub(text: string) {
  const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
  if (!ELEVENLABS_API_KEY) {
    console.warn("No ElevenLabs API key found.");
    return null;
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM/stream', {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("Failed to generate ElevenLabs dub:", error);
    return null;
  }
}

export async function transcribeAudio(audioBlob: Blob) {
  const DEEPGRAM_API_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY;
  if (!DEEPGRAM_API_KEY) {
    console.warn("No Deepgram API key found.");
    return null;
  }

  try {
    const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&punctuate=true', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': audioBlob.type || 'audio/webm'
      },
      body: audioBlob
    });

    if (!response.ok) {
      throw new Error(`Deepgram API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
  } catch (error) {
    console.error("Failed to transcribe via Deepgram:", error);
    return null;
  }
}
