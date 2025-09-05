// A simple in-memory store for API keys provided at runtime.

// Safely gets environment variables in a client-side context.
// This is robust against environments where `import.meta.env` might not exist.
const getEnv = (key: string): string | null => {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
        return (import.meta as any).env[key] || null;
    }
    return null;
}

export const apiConfig = {
  // FIX: Google API key is no longer managed here. geminiService will use import.meta.env.VITE_API_KEY directly.
  google: null as string | null,
  // FIX: ElevenLabs key is now sourced from environment variables in a robust way that prevents crashes.
  elevenLabs: getEnv('VITE_ELEVENLABS_API_KEY'),
};
