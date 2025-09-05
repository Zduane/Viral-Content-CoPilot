
// A simple in-memory store for API keys provided at runtime.
export const apiConfig = {
  // FIX: Google API key is no longer managed here. geminiService will use process.env.API_KEY directly.
  google: null as string | null,
  // FIX: ElevenLabs key is now sourced from environment variables.
  elevenLabs: process.env.ELEVENLABS_API_KEY || null,
};
