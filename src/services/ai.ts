import { GoogleGenAI, Type } from "@google/genai";
import { Mood, AffirmationCategory } from "../types";

const getAI = () => {
  try {
    // In Vite, process.env.GEMINI_API_KEY is replaced by a string value during build
    // We also check for VITE_ prefixed version as a fallback for standard Vite deployments
    let apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
    
    // Handle cases where Vite defines it as 'null' or 'undefined' (common if env var is missing during build)
    if (apiKey === 'null' || apiKey === 'undefined' || !apiKey) {
      apiKey = undefined;
    }

    if (!apiKey) {
      if (typeof window !== 'undefined') {
        console.warn("GEMINI_API_KEY is missing. Using soulful fallbacks. ♡");
      }
      return null;
    }
    return new GoogleGenAI({ apiKey });
  } catch (error) {
    console.error("Error initializing AI:", error);
    return null;
  }
};

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorMsg = error?.message?.toLowerCase() || '';
    const isRetryable = error?.status === 503 || 
                       errorMsg.includes('503') || 
                       errorMsg.includes('high demand') ||
                       errorMsg.includes('unavailable') ||
                       errorMsg.includes('overloaded');
                       
    if (retries > 0 && isRetryable) {
      console.warn(`AI model busy, retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 1.5);
    }
    throw error;
  }
}

const DEFAULT_AFFIRMATIONS = [
  ["I am worthy of all the good things coming my way.", "I grow stronger and wiser every single day.", "I am at peace with my past and excited for my future."],
  ["I choose to be kind to myself and others.", "My potential is limitless and my heart is open.", "I am a beacon of light in a beautiful world."],
  ["Every breath I take fills me with peace.", "I trust the journey even when I cannot see the path.", "I am resilient, brave, and enough as I am."]
];

const DEFAULT_MANTRAS = [
  {
    text: "The happiness of your life depends upon the quality of your thoughts.",
    author: "Marcus Aurelius",
    context: "A reminder that our internal perspective shapes our external reality."
  },
  {
    text: "Be patient toward all that is unresolved in your heart.",
    author: "Rainer Maria Rilke",
    context: "Trusting the process of growth and the beauty of questions."
  },
  {
    text: "What you seek is seeking you.",
    author: "Rumi",
    context: "The deep connection between our desires and our destiny."
  }
];

export async function generateAffirmations(category: AffirmationCategory, previousAffirmations?: string[]) {
  const ai = getAI();
  if (!ai) {
    return DEFAULT_AFFIRMATIONS[Math.floor(Math.random() * DEFAULT_AFFIRMATIONS.length)];
  }

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Generate 3 short, powerful, and comforting personal affirmations for the category: "${category}". 
      ${previousAffirmations && previousAffirmations.length > 0 ? `IMPORTANT: Ensure these affirmations are COMPLETELY DIFFERENT from these previous ones: "${previousAffirmations.join('", "')}".` : ''}
      The tone should be similar to the "I AM" app - empowering, present-tense, and soulful. 
      Return them as a JSON array of strings.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    }));

    const text = response.text;
    if (!text) throw new Error("No response text from AI");
    
    // Clean the response text in case it contains markdown code blocks
    const cleanedText = text.replace(/```json\n?|```/g, "").trim();
    return JSON.parse(cleanedText) as string[];
  } catch (error) {
    console.error("Error generating affirmations:", error);
    return DEFAULT_AFFIRMATIONS[Math.floor(Math.random() * DEFAULT_AFFIRMATIONS.length)];
  }
}

export async function generateReflectionQuestion(gratitude: string[], mood: Mood, previousQuestion?: string) {
  const ai = getAI();
  if (!ai) return "What small beauty did you notice today that you want to carry into tomorrow?";

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `The user is feeling ${mood}. They are grateful for: "${gratitude.join(", ")}". 
      Ask one unique, gentle, and mood-specific reflection question to help them explore these feelings further. 
      ${previousQuestion ? `IMPORTANT: Ensure the question is COMPLETELY DIFFERENT from this previous one: "${previousQuestion}".` : 'Ensure the question is different from standard ones.'}
      Keep it short, poetic, and wise.`,
    }));

    return response.text || "What small beauty did you notice today that you want to carry into tomorrow?";
  } catch (error) {
    return "What small beauty did you notice today that you want to carry into tomorrow?";
  }
}

export async function generateMantraExplanation(quote: string, author: string) {
  const ai = getAI();
  if (!ai) return "This quote reminds us that our internal state is the foundation of our experience. By focusing on our thoughts and intentions, we can navigate the world with more grace and resilience.";

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Provide a brief, soulful, and practical explanation for this quote: "${quote}" by ${author}. 
      Explain how it can be applied to daily life for self-growth and peace. Keep it under 3 sentences.`,
    }));

    return response.text || "This quote reminds us that our internal state is the foundation of our experience. By focusing on our thoughts and intentions, we can navigate the world with more grace and resilience.";
  } catch (error) {
    return "This quote reminds us that our internal state is the foundation of our experience. By focusing on our thoughts and intentions, we can navigate the world with more grace and resilience.";
  }
}

export async function generateDailyMantra(previousMantra?: string) {
  const ai = getAI();
  if (!ai) {
    return DEFAULT_MANTRAS[Math.floor(Math.random() * DEFAULT_MANTRAS.length)];
  }

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Generate a unique, soulful, and powerful daily mantra or quote from a famous philosopher (like Marcus Aurelius, Seneca, Rumi, Jung) or a modern self-help author (like Brianna Wiest, Viktor Frankl). 
      ${previousMantra ? `IMPORTANT: Ensure this is a COMPLETELY DIFFERENT quote from this previous one: "${previousMantra}".` : 'IMPORTANT: Ensure this is a different quote from common ones.'}
      Include the quote text, the author, and a brief (1-2 sentence) explanation of its soulful meaning.
      Return it as a JSON object with keys: "text", "author", and "context".`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            author: { type: Type.STRING },
            context: { type: Type.STRING }
          },
          required: ["text", "author", "context"]
        }
      }
    }));

    const text = response.text;
    if (!text) throw new Error("No response text from AI");
    
    const cleanedText = text.replace(/```json\n?|```/g, "").trim();
    return JSON.parse(cleanedText) as { text: string; author: string; context: string };
  } catch (error) {
    console.error("Error generating daily mantra:", error);
    return DEFAULT_MANTRAS[Math.floor(Math.random() * DEFAULT_MANTRAS.length)];
  }
}
