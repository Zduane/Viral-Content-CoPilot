

import React, { useState, useEffect, useRef } from 'react';
import { fetchElevenLabsVoices, generateVoiceoverAudioUrl, ElevenLabsVoice } from '../services/resembleService';
import { PlayCircleIcon } from '../constants';

const VoiceoverTester: React.FC = () => {
    const [text, setText] = useState('Hello, world! This is a test of the ElevenLabs voice generation.');
    const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
    const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const audioPlayerRef = useRef<HTMLAudioElement>(null);
    const isConfigured = !!process.env.ELEVENLABS_API_KEY;

    useEffect(() => {
        if (!isConfigured) {
            setError('Voice generation is unavailable.');
            return;
        }

        const loadVoices = async () => {
            try {
                const fetchedVoices = await fetchElevenLabsVoices();
                setVoices(fetchedVoices);
                if (fetchedVoices.length > 0) {
                    setSelectedVoiceId(fetchedVoices[0].voice_id);
                }
            } catch (err) {
                setError('Failed to load voices from ElevenLabs.');
            }
        };
        loadVoices();
    }, [isConfigured]);

    const handleGenerate = async () => {
        if (!text.trim() || !selectedVoiceId) {
            setError('Please enter text and select a voice.');
            return;
        }
        setIsLoading(true);
        setError(null);

        try {
            const audioUrl = await generateVoiceoverAudioUrl(text, selectedVoiceId);
            if (audioPlayerRef.current) {
                audioPlayerRef.current.src = audioUrl;
                audioPlayerRef.current.play();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <section id="voice-tester" className="mb-12">
            <div className="bg-gray-900/80 backdrop-blur-sm rounded-xl shadow-2xl shadow-purple-900/10 p-6 md:p-8 border border-gray-700/50 max-w-2xl mx-auto">
                <h3 className="text-xl font-bold text-center text-gray-100 mb-1">Voice Generation Test Panel</h3>
                <p className="text-center text-gray-400 mb-6 text-sm">Use this to quickly test the ElevenLabs voice generation.</p>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="test-text" className="block text-sm font-medium text-gray-300 mb-2">Text to Generate</label>
                        <textarea
                            id="test-text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            rows={3}
                            className="w-full appearance-none bg-gray-700/80 border border-gray-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                            placeholder="Enter text to generate..."
                            disabled={!isConfigured}
                        />
                    </div>
                    <div>
                        <label htmlFor="test-voice" className="block text-sm font-medium text-gray-300 mb-2">Voice Style</label>
                        <select
                            id="test-voice"
                            value={selectedVoiceId}
                            onChange={(e) => setSelectedVoiceId(e.target.value)}
                            className="w-full bg-gray-700/80 border border-gray-600 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                            disabled={voices.length === 0 || !isConfigured}
                        >
                            {voices.length === 0 && isConfigured ? (
                                <option>Loading voices...</option>
                            ) : (
                                voices.map((voice) => (
                                    <option key={voice.voice_id} value={voice.voice_id}>
                                        {voice.name}
                                    </option>
                                ))
                            )}
                             {!isConfigured && <option>Unavailable</option>}
                        </select>
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !isConfigured}
                        className="w-full flex items-center justify-center px-6 py-3 bg-purple-600 rounded-lg font-semibold text-white hover:bg-purple-500 transition-all duration-300 disabled:bg-purple-800 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Generating...
                            </>
                        ) : (
                             <>
                                <PlayCircleIcon className="w-5 h-5 mr-2" />
                                Generate & Play Test Voice
                            </>
                        )}
                    </button>
                    {error && <p className="text-sm text-red-400 mt-2 text-center">{error}</p>}
                    <audio ref={audioPlayerRef} className="hidden" />
                </div>
            </div>
        </section>
    );
};

export default VoiceoverTester;