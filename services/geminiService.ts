
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analysisSchema = {
    type: Type.OBJECT,
    properties: {
        trends: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of 3-5 current content trends that are performing well."
        },
        characteristics: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of 3-5 common characteristics of viral posts (e.g., format, tone, length)."
        },
        personas: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "A catchy name for the persona." },
                    description: { type: Type.STRING, description: "A brief description of the persona." }
                },
                required: ["name", "description"]
            },
            description: "A list of 2-3 common creator or brand personas that resonate with the audience."
        }
    },
    required: ["trends", "characteristics", "personas"]
};


export const fetchViralAnalysis = async (industry: string): Promise<AnalysisResult> => {
    try {
        const prompt = `
            You are an expert social media analyst specializing in identifying patterns in viral content.
            For the industry "${industry}", provide a detailed analysis of what makes posts go viral.

            Please structure your response as a JSON object that matches the provided schema.

            Your analysis should include:
            1.  **trends**: A list of 3-5 current content trends that are performing well.
            2.  **characteristics**: A list of 3-5 common characteristics of viral posts in this industry (e.g., format, tone, length).
            3.  **personas**: A list of 2-3 common creator or brand personas that resonate with the audience, including a name for the persona and a brief description.

            Do not include any introductory text, explanations, or markdown formatting around the JSON object. Only output the raw JSON.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: analysisSchema,
            },
        });
        
        const responseText = response.text.trim();
        const parsedJson = JSON.parse(responseText);

        // Basic validation to ensure the parsed object matches our expected structure
        if (
            !parsedJson.trends || 
            !parsedJson.characteristics || 
            !parsedJson.personas ||
            !Array.isArray(parsedJson.trends) ||
            !Array.isArray(parsedJson.characteristics) ||
            !Array.isArray(parsedJson.personas)
        ) {
            throw new Error("Received malformed data from API.");
        }


        return parsedJson as AnalysisResult;

    } catch (error) {
        console.error("Error fetching viral analysis:", error);
        throw new Error("Failed to fetch analysis from Gemini API. Please check your API key and try again.");
    }
};
