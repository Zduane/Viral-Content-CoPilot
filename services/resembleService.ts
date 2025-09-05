// Note: This service is for ElevenLabs. The filename is retained due to system constraints.
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const API_URL = 'https://api.elevenlabs.io/v1';

export interface VoiceDesignParams {
    gender: string;
    age: string;
    accent: string;
    accent_strength: number;
    text: string;
    voiceDescription: string;
}

// Designs a new voice using ElevenLabs Voice Design
export const designVoice = async (params: VoiceDesignParams, name: string): Promise<string> => {
    if (!ELEVENLABS_API_KEY) {
        throw new Error("ELEVENLABS_API_KEY environment variable not set.");
    }
    try {
        const response = await fetch(`${API_URL}/voices/design`, {
            method: 'POST',
            headers: {
                'xi-api-key': ELEVENLABS_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                text: params.text,
                voice_description: params.voiceDescription,
                gender: params.gender,
                age: params.age,
                accent: params.accent,
                accent_strength: params.accent_strength,
                labels: {}
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Failed to design voice: ${response.statusText} - ${errorBody}`);
        }

        const data = await response.json();
        return data.voice_id;

    } catch (error) {
        console.error("Error designing ElevenLabs voice:", error);
        throw error;
    }
};

// Generates a voiceover clip and returns a blob URL for the audio
export const generateVoiceoverAudioUrl = async (text: string, voiceId: string): Promise<string> => {
    if (!ELEVENLABS_API_KEY) {
        throw new Error("ELEVENLABS_API_KEY environment variable not set.");
    }
    try {
        const response = await fetch(`${API_URL}/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'xi-api-key': ELEVENLABS_API_KEY,
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg'
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_multilingual_v2', // A good default model
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                }
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Failed to generate voiceover: ${response.statusText} - ${errorBody}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        return audioUrl;

    } catch (error) {
        console.error("Error generating voiceover:", error);
        throw error;
    }
};