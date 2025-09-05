
import React from 'react';

const ApiKeyError: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center font-sans text-white p-4">
      <div className="bg-gray-900/80 backdrop-blur-sm rounded-xl shadow-2xl shadow-purple-900/10 p-8 border border-red-700/50 max-w-2xl mx-auto text-center">
        <h1 className="text-3xl font-extrabold text-red-400">
          Configuration Needed
        </h1>
        <p className="mt-4 text-lg text-gray-300">
          The Google AI API Key is missing.
        </p>
        <p className="mt-2 text-gray-400">
          This application requires a Google AI API Key to function. Please create a file named <code className="bg-gray-700 text-sm font-mono p-1 rounded">.env.local</code> in the root directory of your project and add your key to it.
        </p>
        <div className="mt-6 p-4 bg-gray-950 rounded-lg text-left">
          <pre className="text-gray-300 text-sm whitespace-pre-wrap">
            <code>
              API_KEY="YOUR_GOOGLE_AI_API_KEY_HERE"
            </code>
          </pre>
        </div>
        <p className="mt-4 text-gray-500 text-sm">
          You can get your API key from Google AI Studio. After creating the file and adding your key, you must restart your development server for the change to take effect.
        </p>
      </div>
    </div>
  );
};

export default ApiKeyError;
