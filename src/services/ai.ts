import { GoogleGenAI, Type } from "@google/genai";
import { Mood, AffirmationCategory } from "../types";

const getAI = () => {
  try {
    const apiKey = typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing. Please configure it in the Secrets panel.");
      return null;
    }
    return new GoogleGenAI({ apiKey });
  } catch (error) {
    console.error("Error initializing AI:", error);
    return null;
  }
};

export async function generateAffirmations(category: AffirmationCategory) {
  const ai = getAI();
  if (!ai) {
    return [
      "I am worthy of all the good things coming my way.",
      "I grow stronger and wiser every single day.",
      "I am at peace with my past and excited for my future."
    ];
  }

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

    const text = response.text;
    if (!text) throw new Error("No response text from AI");
    
    // Clean the response text in case it contains markdown code blocks
    const cleanedText = text.replace(/```json\n?|```/g, "").trim();
    return JSON.parse(cleanedText) as string[];
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
  const ai = getAI();
  if (!ai) return "What small beauty did you notice today that you want to carry into tomorrow?";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The user is feeling ${mood}. They are grateful for: "${gratitude.join(", ")}". 
      Ask one gentle, mood-specific reflection question to help them explore these feelings further. 
      Keep it short, poetic, and wise.`,
    });

    return response.text || "What small beauty did you notice today that you want to carry into tomorrow?";
  } catch (error) {
    return "What small beauty did you notice today that you want to carry into tomorrow?";
  }
}

export async function generateMantraExplanation(quote: string, author: string) {
  const ai = getAI();
  if (!ai) return "This quote reminds us that our internal state is the foundation of our experience. By focusing on our thoughts and intentions, we can navigate the world with more grace and resilience.";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide a brief, soulful, and practical explanation for this quote: "${quote}" by ${author}. 
      Explain how it can be applied to daily life for self-growth and peace. Keep it under 3 sentences.`,
    });

    return response.text || "This quote reminds us that our internal state is the foundation of our experience. By focusing on our thoughts and intentions, we can navigate the world with more grace and resilience.";
  } catch (error) {
    return "This quote reminds us that our internal state is the foundation of our experience. By focusing on our thoughts and intentions, we can navigate the world with more grace and resilience.";
  }
}

export async function generateDailyMantra() {
  const ai = getAI();
  if (!ai) {
    return {
      text: "The happiness of your life depends upon the quality of your thoughts.",
      author: "Marcus Aurelius",
      context: "A reminder that our internal perspective shapes our external reality."
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a soulful, powerful daily mantra or quote from a famous philosopher (like Marcus Aurelius, Seneca, Rumi, Jung) or a modern self-help author (like Brianna Wiest, Viktor Frankl). 
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
    });

    const text = response.text;
    if (!text) throw new Error("No response text from AI");
    
    const cleanedText = text.replace(/```json\n?|```/g, "").trim();
    return JSON.parse(cleanedText) as { text: string; author: string; context: string };
  } catch (error) {
    console.error("Error generating daily mantra:", error);
    return {
      text: "The happiness of your life depends upon the quality of your thoughts.",
      author: "Marcus Aurelius",
      context: "A reminder that our internal perspective shapes our external reality."
    };
  }
}
