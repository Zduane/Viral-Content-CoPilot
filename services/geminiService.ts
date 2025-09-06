import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AnalysisResult, ScriptResult, ProductAnalysis, VoiceDesignParameters, SubscriptionTier } from '../types';
import { getEnv } from './apiConfig';

/**
 * Lazily creates and returns a GoogleGenAI client instance.
 * Throws an error if the Google AI API key has not been configured.
 */
function getGoogleAIClient(): GoogleGenAI {
    const apiKey = getEnv('VITE_API_KEY') || getEnv('API_KEY');
    if (!apiKey) {
        throw new Error("Google AI API Key not found. Please make sure VITE_API_KEY or API_KEY environment variable is set.");
    }
    return new GoogleGenAI({ apiKey });
}

/**
 * A retry wrapper for Google AI API calls to handle transient errors like 503s.
 * @param apiCall The async function to call.
 * @param maxRetries The maximum number of retries.
 * @returns The result of the API call.
 */
async function withRetries<T>(apiCall: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await apiCall(); // Attempt the call
        } catch (error) {
            lastError = error as Error;
            console.warn(`API call attempt ${attempt} failed.`, error);

            // Check for retriable errors (overloaded, unavailable)
            if (attempt < maxRetries && error instanceof Error && (error.message.includes('503') || error.message.includes('UNAVAILABLE') || error.message.includes('overloaded'))) {
                const delay = 1500 * Math.pow(2, attempt - 1); // Exponential backoff: 1.5s, 3s, 6s
                console.log(`Service is busy. Retrying in ${delay / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw lastError; // Non-retriable error or max retries reached
            }
        }
    }
    // This part should not be reachable if logic is correct, but as a fallback for type safety.
    throw lastError || new Error("API call failed after multiple retries.");
}


const scriptSchema = {
    type: Type.OBJECT,
    properties: {
        hook: {
            type: Type.OBJECT,
            description: "A compelling 3-second hook composed of verbal, visual, and text elements to grab the viewer's attention and stop them from scrolling.",
            properties: {
                verbal: {
                    type: Type.STRING,
                    description: "The first spoken words. Should be intriguing, controversial, or relatable."
                },
                visual: {
                    type: Type.STRING,
                    description: "The immediate visual action. Should be dynamic, surprising, or aesthetically pleasing."
                },
                textOverlay: {
                    type: Type.STRING,
                    description: "Bold, concise on-screen text that reinforces the hook's message."
                }
            },
            required: ["verbal", "visual", "textOverlay"]
        },
        scenes: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    visual: { 
                        type: Type.STRING, 
                        description: "Description of the visual action in the scene. Act as a film director: specify the camera shot (e.g., 'dynamic close-up', 'wide tracking shot'), lighting, and overall mood to guide video generation." 
                    },
                    scriptType: {
                        type: Type.STRING,
                        description: "The type of audio for this scene. MUST be either the exact string 'voiceover' (for an unseen narrator) or 'dialogue' (for words spoken by the on-screen influencer)."
                    },
                    script: { 
                        type: Type.STRING, 
                        description: "The script for this scene, which will be either a voiceover or dialogue based on the 'scriptType'." 
                    }
                },
                required: ["visual", "scriptType", "script"]
            },
            description: "An array of 2-4 scenes that tell a story or demonstrate the product."
        },
        callToAction: {
            type: Type.STRING,
            description: "The primary, most effective call to action for TikTok, tailored to the product type and target audience (e.g., direct purchase, link in bio, user engagement)."
        },
        suggestedSound: {
            type: Type.STRING,
            description: "A suggestion for a trending TikTok audio or type of music to use."
        },
        platformVariations: {
            type: Type.ARRAY,
            description: "Variations of the script tailored for other social media platforms.",
            items: {
                type: Type.OBJECT,
                properties: {
                    platformName: { type: Type.STRING, description: "The name of the platform (e.g., 'Instagram Reels')." },
                    callToAction: { type: Type.STRING, description: "A call to action specifically adapted for this platform's features and user behavior." },
                    suggestedSound: { type: Type.STRING, description: "A sound or music suggestion suitable for this platform." },
                    notes: { type: Type.STRING, description: "Optional notes on how to adapt the content, such as using specific stickers, features, or caption styles." }
                },
                required: ["platformName", "callToAction", "suggestedSound"]
            }
        }
    },
    required: ["hook", "scenes", "callToAction", "suggestedSound"]
};


const influencerGenerationSchema = {
    type: Type.OBJECT,
    properties: {
        influencerDescription: {
            type: Type.STRING,
            description: "A comprehensive description of the influencer, including their niche, personality, style, and audience demographics, explaining why they are a perfect match for the product."
        },
        imagePrompt: {
            type: Type.STRING,
            description: "A detailed, descriptive prompt for an AI image generator to create a photorealistic, high-quality portrait of this influencer, aligning with common social media styles (well-lit, clear, direct-to-camera). Include appearance, clothing, background, and mood."
        },
        productDescription: {
            type: Type.STRING,
            description: "A concise and appealing description of the product based on the provided image, highlighting its key features and benefits."
        },
        productImageUrl: {
            type: Type.STRING,
            description: "The direct URL to the main product image from the provided webpage. If not found, return an empty string.",
        },
        productAnalysis: {
            type: Type.OBJECT,
            description: "A detailed analysis of the product's market viability.",
            properties: {
                salesPotential: {
                    type: Type.STRING,
                    description: "An analysis of the product's potential to sell well currently and in the future, based on trends and market data."
                },
                problemSolved: {
                    type: Type.STRING,
                    description: "A clear identification of the problem the product solves for its target audience."
                },
                valueProposition: {
                    type: Type.STRING,
                    description: "An assessment of the product's value and whether its features or benefits are unique in the market."
                },
                marketSaturation: {
                    type: Type.STRING,
                    description: "An analysis of whether the market for this product is already oversaturated or if there's room for new sellers."
                }
            },
            required: ["salesPotential", "problemSolved", "valueProposition", "marketSaturation"]
        }
    },
    required: ["influencerDescription", "imagePrompt", "productDescription", "productImageUrl", "productAnalysis"],
};

export interface InfluencerGenerationResult {
    influencerDescription: string;
    imagePrompt: string; // for influencer
    productDescription: string;
    productImageUrl?: string; // for product, only from URL
    productAnalysis: ProductAnalysis;
}




export const fetchViralAnalysis = async (industry: string): Promise<AnalysisResult> => {
    try {
        const ai = getGoogleAIClient();
        const prompt = `
            You are an expert social media and market trend analyst specializing in identifying viral products and topics using real-time web data.
            For the industry "${industry}", provide a detailed analysis focusing on the most current, up-to-date data from this year.

            Your analysis MUST include:
            1.  **topSellingProducts**: An array of 3 to 5 objects. Each object represents a top-selling product and MUST strictly follow this JSON structure with non-empty string values for all keys:
                {
                  "brandName": "...",
                  "productName": "...",
                  "description": "...",
                  "problemSolved": "...",
                  "successfulAdCreative": "...",
                  "idealCustomer": "...",
                  "idealInfluencer": "...",
                  "imagePrompt": "...",
                  "url": "..."
                }
                These products must meet the following criteria:
                a. **They must be suitable for dropshipping.** Prioritize finding products on dropshipping-friendly stores like Shopify, AutoDS, AliExpress, and TikTok Shop.
                b. They have shown increasing sales daily for the last 7 days, based on data from TikTok Shop and popular Shopify stores.
                c. **Crucially, use Google Trends to cross-reference and ensure these products correspond with a current seasonal trend that is still trending UPWARDS, not at its peak or trending down.**
                d. They have successful ad creatives running on social media (TikTok, Instagram, Facebook) with high engagement (likes, shares, comments).
                e. The product's retail price must be within the $30 to $150 USD range.
                For the "url" key, you MUST provide the direct, full, and working hyperlink to the product's primary landing page from a dropshipping-friendly store (e.g., a specific Shopify store, AliExpress, TikTok Shop). Do not invent a URL. If a valid URL cannot be found, the value for "url" MUST be an empty string "".
                **For the "imagePrompt" key, you MUST create a highly detailed and descriptive prompt for a text-to-image AI model to generate a photorealistic, user-generated content (UGC) style photo. The prompt must depict the 'idealInfluencer' naturally using or interacting with the 'productName'. Describe a complete scene: the person's appearance, action, emotion, the product's placement, the environment (e.g., a cozy bedroom, a bright kitchen, an outdoor setting), and the lighting (e.g., soft morning light, golden hour, bright studio light). The style should be candid and authentic, as if taken from a real social media post. CRITICAL SAFETY INSTRUCTION: The image must be brand-safe, family-friendly, and not contain any sexually suggestive, revealing, or provocative content. Focus on a wholesome, positive, and product-focused lifestyle shot. For example: "UGC style, candid shot of a 25-year-old woman with curly hair, laughing as she applies a new hydrating face mask in her sun-drenched bathroom. The product jar is visible on the marble countertop next to a small plant. Soft, natural morning light from a window. Photorealistic, 8K."**
            2.  **trendingTopics**: A list of the top 5 most popular products OR topics that have been trending upwards in the last 7 days. For each, provide a brief reason why it's trending, citing specific examples if possible.
            3.  **trends**: A list of 3-5 current content trends that are performing well.
            4.  **characteristics**: A list of 3-5 common characteristics of viral posts in this industry (e.g., format, tone, length).
            5.  **personas**: A list of 2-3 common creator or brand personas that resonate with the audience, including a name for the persona and a brief description.
            6.  **viralHooks**: A list of 3-5 common opening hooks used in viral videos. For each hook, provide a 'type' (e.g., 'Question Hook') and a 'description' of how it's used in the industry.
            7.  **topKeywords**: A list of 5-7 top searched keywords on platforms like Google, Amazon, and TikTok related to the trending products in this industry. These should be high-intent keywords that potential customers are using.

            CRITICAL: You MUST structure your entire response as a single, raw JSON object. Do not include any introductory text, explanations, or markdown formatting (like \`\`\`json). The output must be parsable JSON.
        `;

        const response = await withRetries(() => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                 tools: [{googleSearch: {}}],
            },
        }));
        
        const responseText = response.text.trim();
        // Clean the response to remove markdown fences if they exist.
        const cleanedText = responseText.replace(/^```json\s*/, '').replace(/```$/, '');
        const parsedJson = JSON.parse(cleanedText);

        // Defensively normalize trends and characteristics to be string arrays
        // as the model can sometimes return an array of objects, causing a render error.
        const normalizeToString = (item: any): string => {
            if (typeof item === 'string') {
                return item;
            }
            if (typeof item === 'object' && item !== null) {
                // Heuristic: try to find the most descriptive string property
                const values = Object.values(item);
                const stringValue = values.find(v => typeof v === 'string');
                return stringValue ? String(stringValue) : JSON.stringify(item);
            }
            return String(item);
        };
        
        parsedJson.trends = parsedJson.trends?.map(normalizeToString) || [];
        parsedJson.characteristics = parsedJson.characteristics?.map(normalizeToString) || [];
        parsedJson.topKeywords = parsedJson.topKeywords?.map(normalizeToString) || [];
        
        // Add sources from grounding metadata if available
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
            ?.map((chunk: any) => chunk.web)
            .filter((source: any) => source?.uri && source?.title) || [];
            
        return { ...parsedJson, sources };

    } catch (error) {
        console.error("Error fetching viral analysis:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to fetch viral analysis: ${error.message}`);
        }
        throw new Error("An unknown error occurred while fetching viral analysis.");
    }
};


export const generateImage = async (prompt: string): Promise<string> => {
    try {
        const ai = getGoogleAIClient();
        const response = await withRetries(() => ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
                aspectRatio: '1:1',
            },
        }));

        if (response.generatedImages && response.generatedImages.length > 0 && response.generatedImages[0].image?.imageBytes) {
            const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
            return `data:image/png;base64,${base64ImageBytes}`;
        }
        
        // If we reach here, the API call was successful but returned no image.
        // This is often due to safety filters. We provide a helpful error message.
        throw new Error("Image generation was blocked, likely due to safety filters. Please try running the analysis again to generate a new image prompt.");

    } catch (error) {
        console.error("Error generating image:", error);
        
        if (error instanceof Error) {
            // If the error message is the one we created above, just re-throw it.
            if (error.message.includes("safety filters")) {
                throw error;
            }

            // Otherwise, it's likely an API error. Try to parse it for a better message.
            try {
                const errorObj = JSON.parse(error.message);
                const nestedError = errorObj.error || {};

                if (nestedError.status === 'UNAVAILABLE' || nestedError.code === 503) {
                    throw new Error("The image generation service is temporarily unavailable. Please try again.");
                }
                if (nestedError.message) {
                    throw new Error(`Image generation failed: ${nestedError.message}`);
                }
            } catch (e) {
                // Parsing failed. Fall through to use the original error message.
            }
            throw new Error(`Failed to generate image: ${error.message}`);
        }

        // Fallback for non-Error objects.
        throw new Error("An unknown error occurred during image generation.");
    }
};

export const generateViralScript = async (
    productImages: { data: string, mimeType: string }[],
    influencerImage: { data: string, mimeType: string },
    productDescription: string,
    influencerDescription: string,
    analysisResult: AnalysisResult | null
): Promise<ScriptResult> => {
    try {
        const ai = getGoogleAIClient();
        const analysisContext = analysisResult
            ? `
            Here is some context about the current market trends, which you should use to make the script more relevant and likely to go viral:
            - Key Trends: ${analysisResult.trends.join(', ')}
            - Viral Characteristics: ${analysisResult.characteristics.join(', ')}
            - Successful Personas: ${analysisResult.personas.map(p => p.name).join(', ')}
            - Top Selling Products: One top seller is "${analysisResult.topSellingProducts[0]?.productName}" which solves the problem of "${analysisResult.topSellingProducts[0]?.problemSolved}".
            - Effective Hooks: A common hook type is "${analysisResult.viralHooks[0]?.type}".
            `
            : "No specific market analysis provided. Create a generally effective script.";
            
        const prompt = `
            You are a creative director and viral video cinematographer, specializing in short-form videos for platforms like TikTok and Instagram Reels.
            
            Your task is to create a 15-second viral video script.

            **INPUTS:**
            1.  **Product:** A product described as: "${productDescription}". One or more images of the product are provided. Analyze all images for a complete understanding.
            2.  **Influencer:** The video will star an influencer described as: "${influencerDescription}". An image of the influencer is provided.
            3.  **Market Context:** ${analysisContext}

            **SCRIPT REQUIREMENTS:**
            1.  **Hook (First 3 seconds):** Create a powerful scroll-stopping hook with verbal, visual, and text overlay components.
            2.  **Scenes (2-4 scenes):** Write 2 to 4 short scenes. For each scene, you MUST decide whether to use a 'voiceover' (an unseen narrator) or 'dialogue' (words spoken directly by the influencer on screen) by setting the 'scriptType' field. Base this decision on what will have the highest conversion potential and be most engaging for the product and influencer. For each scene's 'visual' description, you MUST be highly descriptive and use cinematic language. This is critical as it will be used to generate a video. Your description MUST include:
                - **Shot Type:** e.g., 'Dynamic close-up', 'extreme close-up', 'medium shot', 'wide establishing shot'.
                - **Camera Movement:** e.g., 'fast whip pan', 'slow push-in', 'tracking shot', 'handheld shaky-cam effect', 'smooth dolly shot'.
                - **Lighting:** e.g., 'dramatic side lighting', 'soft golden hour light', 'bright, clean studio lighting', 'neon-drenched'.
                - **Style:** e.g., 'UGC style', 'cinematic', 'gritty realistic'.
                Example: "Dynamic close-up tracking shot of the influencer's hands opening the product, with soft golden hour light catching the details. UGC style."
            3.  **Call to Action (CTA):** Provide a clear, compelling, and specific primary call to action for TikTok.
            4.  **Sound:** Suggest a type of trending TikTok audio that would fit the video's mood.
            5.  **Platform Variations:** Generate one variation of the script for Instagram Reels with an adapted CTA and notes.

            **CRITICAL:** You MUST structure your entire response as a single, raw JSON object that conforms to the provided schema. Do not include any introductory text, explanations, or markdown formatting. The output must be parsable JSON.
        `;

        const productImageParts = productImages.map(image => ({
            inlineData: { data: image.data, mimeType: image.mimeType }
        }));
        const influencerImagePart = { inlineData: { data: influencerImage.data, mimeType: influencerImage.mimeType } };
        const textPart = { text: prompt };

        const response = await withRetries(() => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [...productImageParts, influencerImagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: scriptSchema,
            }
        }));

        const responseText = response.text.trim();
        const cleanedText = responseText.replace(/^```json\s*/, '').replace(/```$/, '');
        return JSON.parse(cleanedText);
    } catch (error) {
        console.error("Error generating viral script:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to generate script: ${error.message}`);
        }
        throw new Error("An unknown error occurred while generating the script.");
    }
};


export const generateIdealInfluencer = async (
    input: { url?: string; images?: { data: string; mimeType: string }[] | null }
): Promise<InfluencerGenerationResult> => {
    try {
        const ai = getGoogleAIClient();
        const model = "gemini-2.5-flash";
        let response;
        let config: any = {};
        let contents: any = {};

        if (input.url) {
            const prompt = `
            You are a marketing expert. Analyze the product from the provided URL: ${input.url}.
            Your task is to generate a JSON object containing five keys:
            1. "influencerDescription": "A comprehensive description for the ideal influencer to promote this product (niche, personality, style, audience).
            2. "imagePrompt": A detailed prompt for an AI to generate a photorealistic, high-quality portrait of this influencer. The style should align with common social media profiles: well-lit, clear, with the person looking directly at the camera. Include appearance, clothing, a simple studio or lifestyle background, and mood.
            3. "productDescription": A concise, appealing description of the product.
            4. "productImageUrl": The direct, full URL of the main product image from the webpage. If not found, return an empty string.
            5. "productAnalysis": An object with the following keys:
                - "salesPotential": "Analysis of the product's potential to sell well currently and in the future."
                - "problemSolved": "The specific problem this product solves."
                - "valueProposition": "The product's unique value and what makes it stand out."
                - "marketSaturation": "Analysis of whether the market is oversaturated for this product."
            
            CRITICAL: You MUST structure your entire response as a single, raw JSON object. Do not include any introductory text, explanations, or markdown formatting (like \`\`\`json). The output must be parsable JSON.
            `;
            contents = { parts: [{ text: prompt }] };
            config = {
                tools: [{ googleSearch: {} }],
            };
            
        } else if (input.images && input.images.length > 0) {
            const prompt = `
            Analyze the following product images.
            Based on all the provided images, generate a comprehensive description for the ideal influencer to promote this product. This should include their niche, personality, style, and audience demographics, and explain why they are a perfect match.
            Also, create a detailed, descriptive prompt for an AI image generator to create a photorealistic, high-quality portrait of this influencer. The style should align with common social media profiles: well-lit, clear, with the person looking directly at the camera. Include their appearance, clothing, a simple studio or lifestyle background, their expression, and mood.
            Next, write a concise and appealing description of the product itself, highlighting its key features and benefits as inferred from all the images. For the 'productImageUrl', return an empty string.
            Finally, provide a detailed "productAnalysis" object. This object must contain keys for "salesPotential", "problemSolved", "valueProposition", and "marketSaturation". Analyze the product's potential to sell, the problem it solves, its unique value, and the current market saturation for such items.
            `;
            
            const imageParts = input.images.map(image => ({
                inlineData: { data: image.data, mimeType: image.mimeType },
            }));
            
            const textPart = { text: prompt };
            contents = { parts: [...imageParts, textPart] };
            config = {
                responseMimeType: "application/json",
                responseSchema: influencerGenerationSchema,
            };

        } else {
            throw new Error("Either a URL or product images must be provided.");
        }
        
        response = await withRetries(() => ai.models.generateContent({
            model,
            contents,
            config,
        }));

        const responseText = response.text.trim();
        const cleanedText = responseText.replace(/^```json\s*/, '').replace(/```$/, '');
        const parsedJson = JSON.parse(cleanedText);
        
        // FIX: The model sometimes returns an object for influencerDescription instead of a string.
        // This defensive code checks for that case and converts the object into a readable string
        // to prevent a React rendering error.
        if (typeof parsedJson.influencerDescription === 'object' && parsedJson.influencerDescription !== null) {
            parsedJson.influencerDescription = Object.entries(parsedJson.influencerDescription)
                .map(([key, value]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`)
                .join('. ');
        }
        
        if (!parsedJson.influencerDescription || !parsedJson.imagePrompt || !parsedJson.productDescription || !parsedJson.productAnalysis) {
             throw new Error("The AI response was missing one or more required fields.");
        }

        return parsedJson as InfluencerGenerationResult;

    } catch (error) {
        console.error("Error generating ideal influencer:", error);
         if (error instanceof Error) {
            throw new Error(`Failed to generate ideal influencer: ${error.message}`);
        }
        throw new Error("An unknown error occurred while generating the ideal influencer.");
    }
};

export const generateSceneImage = async (
    influencerImage: { data: string; mimeType: string },
    productImages: { data: string; mimeType: string }[],
    productDescription: string,
    sceneVisual: string,
    interactionPrompt: string
): Promise<string> => {
    try {
        const ai = getGoogleAIClient();
        const interactionInstruction = (interactionPrompt && interactionPrompt.trim() !== '')
            ? `
            CRITICAL INSTRUCTION: You MUST follow this next instruction precisely to depict how the influencer interacts with the product. This is the most important part of the request.
            USER'S INTERACTION PROMPT: "${interactionPrompt}"
            `
            : `The influencer should be clearly interacting with or using the product in a natural way based on the scene description.`;

        const prompt = `
            You are an expert AI image editor. Your task is to generate a new photorealistic, UGC-style image by editing a base influencer image according to a scene description and a product image.

            **CONTEXT:**
            - **BASE INFLUENCER IMAGE:** Provided as input. You MUST maintain the influencer's exact appearance (face, hair, body type) and general style from this image. Do not change the person.
            - **PRODUCT IMAGE(S):** Provided as input. This is the exact product the influencer is interacting with. You MUST use the visual details from this/these image(s) for the product in your output. Pay close attention to details like shape, color, branding, and features like handles or buttons.
            - **PRODUCT DESCRIPTION:** The product is described as: "${productDescription}". This description provides context for the provided product image(s).
            - **SCENE:** The overall scene is: "${sceneVisual}".

            **INSTRUCTIONS:**
            1. Place the influencer from the base image into the described scene.
            2. Incorporate the *exact* product from the provided product image(s) into the scene.
            ${interactionInstruction}
            3. If the product is an item of clothing, the influencer MUST be shown wearing the clothes in the generated image.

            **FINAL IMAGE REQUIREMENTS:**
            - The final image must be photorealistic.
            - It should look like a candid, high-quality photo from a social media post.
            - The influencer's appearance must be consistent with the base image.
            - The product's appearance must be consistent with the product image(s) provided.
        `;

        const influencerImagePart = {
            inlineData: {
                data: influencerImage.data,
                mimeType: influencerImage.mimeType,
            },
        };
         const productImageParts = productImages.map(image => ({
            inlineData: {
                data: image.data,
                mimeType: image.mimeType,
            },
        }));
        const textPart = { text: prompt };

        const response = await withRetries(() => ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [influencerImagePart, ...productImageParts, textPart],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        }));

        // The response can have multiple parts (image, text). We need to find the image part.
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                const mimeType = part.inlineData.mimeType;
                return `data:${mimeType};base64,${base64ImageBytes}`;
            }
        }

        throw new Error("No image was generated in the response.");

    } catch (error) {
        console.error("Error generating scene image:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to generate scene image: ${error.message}`);
        }
        throw new Error("An unknown error occurred while generating the scene image.");
    }
};

export const startVideoGeneration = async (
    basePrompt: string,
    image: { data: string; mimeType: string },
    tier: SubscriptionTier,
    resolution: string,
    frameRate: number
): Promise<any> => {
    try {
        const ai = getGoogleAIClient();

        let finalPrompt = `${basePrompt}\n\n**TECHNICAL REQUIREMENTS:**\n`;
        finalPrompt += `- Render the video at ${resolution} resolution.\n`;
        finalPrompt += `- The frame rate must be ${frameRate} fps.\n`;

        if (tier === 'free') {
            finalPrompt += `- A small, subtle watermark with the text 'Made with Viral Co-pilot' must be placed in the bottom-right corner of the video.\n`;
        } else {
            finalPrompt += `- The video must be clean, with no watermarks.\n`;
        }

        const operation = await withRetries(() => ai.models.generateVideos({
            model: 'veo-2.0-generate-001',
            prompt: finalPrompt,
            image: {
                imageBytes: image.data,
                mimeType: image.mimeType,
            },
            config: {
                numberOfVideos: 1,
            }
        }));
        return operation;
    } catch (error) {
        console.error("Error starting video generation:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to start video generation: ${error.message}`);
        }
        throw new Error("An unknown error occurred while starting video generation.");
    }
};


export const checkVideoStatus = async (operation: any): Promise<any> => {
    try {
        const ai = getGoogleAIClient();
        const updatedOperation = await withRetries(() => ai.operations.getVideosOperation({ operation: operation }));
        return updatedOperation;
    } catch (error) {
        console.error("Error checking video status:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to check video status: ${error.message}`);
        }
        throw new Error("An unknown error occurred while checking video status.");
    }
};

export const getVoiceDesignParameters = async (influencerDescription: string): Promise<VoiceDesignParameters> => {
    try {
        const ai = getGoogleAIClient();
        const prompt = `
            You are an expert voice director. Based on the following influencer description, your task is to define the parameters for an AI voice generation model.

            Influencer Description: "${influencerDescription}"

            You MUST return a single, raw JSON object with the following keys:
            1. "gender": (string) Must be one of: "female", "male".
            2. "age": (string) Must be one of: "young", "middle_aged", "old".
            3. "accent": (string) Must be one of: "american", "british", "african", "australian", "indian". Choose the most appropriate accent, defaulting to "american" if unclear.
            4. "voiceDescription": (string) A brief, descriptive sentence summarizing the desired voice characteristics (e.g., "A calm and soothing voice with a deep tone.").
            5. "sampleText": (string) A short sample sentence (around 100-200 characters) that the influencer would realistically say, which will be used to generate the voice. This text should capture the essence of their persona.

            Analyze the description carefully to infer the most suitable parameters. Your entire response must be only the raw JSON object.
        `;
        
        const response = await withRetries(() => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            },
        }));
        
        const responseText = response.text.trim();
        const cleanedText = responseText.replace(/^```json\s*/, '').replace(/```$/, '');
        return JSON.parse(cleanedText);

    } catch (error) {
        console.error("Error getting voice design parameters:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to get voice design parameters: ${error.message}`);
        }
        throw new Error("An unknown error occurred while getting voice design parameters.");
    }
};