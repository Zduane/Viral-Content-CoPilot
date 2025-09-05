// A simple in-memory store for API keys provided at runtime.

/**
 * Safely gets environment variables across different environments (Vite, Node, etc.).
 * Checks for Vite's `import.meta.env` first, then falls back to `process.env`.
 * @param key The environment variable key to look for.
 * @returns The value of the environment variable or null if not found.
 */
export const getEnv = (key: string): string | null => {
    // Vite/client-side environment
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
        const val = (import.meta as any).env[key];
        if (val) return val;
    }
    // Node.js/server-side or other build environments
    if (typeof process !== 'undefined' && process.env) {
        const val = process.env[key];
        if (val) return val;
    }
    return null;
};


const getElevenLabsKey = (): string | null => {
    return getEnv('VITE_ELEVENLABS_API_KEY') || getEnv('ELEVENLABS_API_KEY');
}

export const apiConfig = {
  // Google API key is managed per-service using the getEnv helper.
  google: null as string | null,
  // ElevenLabs key is now sourced from environment variables in a robust way that works
  // in both local (VITE_) and production environments.
  elevenLabs: getElevenLabsKey(),
};
