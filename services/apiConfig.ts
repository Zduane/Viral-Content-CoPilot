
// A simple in-memory store for API keys provided at runtime.
export const apiConfig = {
  google: null as string | null,
  elevenLabs: null as string | null,
};

/**
 * Sets the API keys for the services to use.
 * This allows keys to be provided from environment variables or a user interface.
 * @param keys An object containing the API keys.
 */
export function setApiKeys(keys: { google?: string | null; elevenLabs?: string | null }) {
  if (keys.google) {
    apiConfig.google = keys.google;
  }
  if (keys.elevenLabs) {
    apiConfig.elevenLabs = keys.elevenLabs;
  }
}
