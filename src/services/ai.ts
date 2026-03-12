import { GoogleGenAI, Type } from "@google/genai";
import { Mood, AffirmationCategory } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateAffirmations(category: AffirmationCategory) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate 3 short, powerful, and comforting personal affirmations for the category: "${category}". 
      The tone should be similar to the "I AM" app - empowering, present-tense, and soulful. 
      Return them as a JSON array of strings.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    return JSON.parse(response.text) as string[];
  } catch (error) {
    console.error("Error generating affirmations:", error);
    return [
      "I am worthy of all the good things coming my way.",
      "I grow stronger and wiser every single day.",
      "I am at peace with my past and excited for my future."
    ];
  }
}

export async function generateReflectionQuestion(gratitude: string[], mood: Mood) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The user is feeling ${mood}. They are grateful for: "${gratitude.join(", ")}". 
      Ask one gentle, mood-specific reflection question to help them explore these feelings further. 
      Keep it short, poetic, and wise.`,
    });

    return response.text;
  } catch (error) {
    return "What small beauty did you notice today that you want to carry into tomorrow?";
  }
}

export async function generateMantraExplanation(quote: string, author: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide a brief, soulful, and practical explanation for this quote: "${quote}" by ${author}. 
      Explain how it can be applied to daily life for self-growth and peace. Keep it under 3 sentences.`,
    });

    return response.text;
  } catch (error) {
    return "This quote reminds us that our internal state is the foundation of our experience. By focusing on our thoughts and intentions, we can navigate the world with more grace and resilience.";
  }
}
