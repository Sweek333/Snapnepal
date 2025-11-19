import { GoogleGenAI, Type, SchemaType } from "@google/genai";
import { GeminiResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generatePhotoCaption = async (base64Image: string): Promise<GeminiResponse> => {
  try {
    // Clean base64 string if it has the header
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/png",
              data: cleanBase64,
            },
          },
          {
            text: "You are a cute, aesthetic retro camera AI. Analyze this image and generate a very short, handwritten-style caption (max 6 words) that captures the vibe. Also provide today's date in YYYY/MM/DD format. Be cute, nostalgic, or funny.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            caption: { type: Type.STRING },
            date: { type: Type.STRING },
          },
          required: ["caption", "date"],
        },
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No text returned from Gemini");

    const data = JSON.parse(jsonText) as GeminiResponse;
    return data;
  } catch (error) {
    console.error("Error generating caption:", error);
    // Fallback if AI fails
    const now = new Date();
    return {
      caption: "Sweet memory ✨",
      date: `${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`,
    };
  }
};
