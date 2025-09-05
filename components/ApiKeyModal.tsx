
import React, { useState } from 'react';

interface ApiKeyModalProps {
  onConfigure: (keys: { google: string; elevenLabs: string }) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onConfigure }) => {
  const [googleKey, setGoogleKey] = useState('');
  const [elevenLabsKey, setElevenLabsKey] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleKey.trim()) {
      setError('Google AI API Key is required.');
      return;
    }
    setError('');
    onConfigure({ google: googleKey, elevenLabs: elevenLabsKey });
  };

  return (
    <div className="min-h-screen flex items-center justify-center font-sans text-white p-4">
      <div className="bg-gray-900/80 backdrop-blur-sm rounded-xl shadow-2xl shadow-purple-900/10 p-8 border border-gray-700/50 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">
              API Key Configuration
            </h1>
            <p className="mt-3 text-gray-400">
              Please provide your API keys to use the application. If you don't have them, you can also set them as environment variables.
            </p>
          </div>

          <div>
            <label htmlFor="google-key" className="block text-sm font-medium text-gray-300">
              Google AI API Key <span className="text-red-400">*</span>
            </label>
            <input
              id="google-key"
              type="password"
              value={googleKey}
              onChange={(e) => setGoogleKey(e.target.value)}
              className="mt-1 w-full appearance-none bg-gray-700/80 border border-gray-600 rounded-lg py-2.5 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              placeholder="Enter your Google AI API key"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Required for all core AI features. Get yours from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Google AI Studio</a>.
            </p>
          </div>

          <div>
            <label htmlFor="elevenlabs-key" className="block text-sm font-medium text-gray-300">
              ElevenLabs API Key (Optional)
            </label>
            <input
              id="elevenlabs-key"
              type="password"
              value={elevenLabsKey}
              onChange={(e) => setElevenLabsKey(e.target.value)}
              className="mt-1 w-full appearance-none bg-gray-700/80 border border-gray-600 rounded-lg py-2.5 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              placeholder="Enter your ElevenLabs API key"
            />
            <p className="mt-1 text-xs text-gray-500">
              Required for voice design and generation features. Get yours from <a href="https://elevenlabs.io/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">ElevenLabs</a>.
            </p>
          </div>
          
          {error && <p className="text-sm text-red-400 text-center">{error}</p>}

          <div className="pt-2">
            <button
              type="submit"
              className="w-full flex items-center justify-center px-6 py-3 bg-indigo-600 rounded-lg font-semibold text-white hover:bg-indigo-500 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
            >
              Save & Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApiKeyModal;
