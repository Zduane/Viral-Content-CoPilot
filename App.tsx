
import React, { useState, useCallback } from 'react';
import { INDUSTRIES } from './constants';
import { AnalysisResult } from './types';
import { fetchViralAnalysis } from './services/geminiService';
import IndustrySelector from './components/IndustrySelector';
import AnalysisDisplay from './components/AnalysisDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';
import { SparklesIcon } from './constants';

const App: React.FC = () => {
  const [selectedIndustry, setSelectedIndustry] = useState<string>(INDUSTRIES[0]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyzeClick = useCallback(async () => {
    if (!selectedIndustry) return;

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const result = await fetchViralAnalysis(selectedIndustry);
      setAnalysisResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedIndustry]);
  
  const Header: React.FC = () => (
    <div className="text-center p-6 border-b border-gray-700">
        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
            Viral Post Analyzer
        </h1>
        <p className="mt-2 text-lg text-gray-400">
            Unlock the secrets of viral content in your industry with AI.
        </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <div className="max-w-2xl mx-auto bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl shadow-purple-900/10 p-6 md:p-8 border border-gray-700">
          <h2 className="text-2xl font-semibold mb-4 text-center">Select an Industry</h2>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <IndustrySelector
              selectedIndustry={selectedIndustry}
              onSelectIndustry={setSelectedIndustry}
            />
            <button
              onClick={handleAnalyzeClick}
              disabled={isLoading}
              className="w-full sm:w-auto flex items-center justify-center px-6 py-3 bg-indigo-600 rounded-lg font-semibold text-white hover:bg-indigo-500 transition-all duration-300 disabled:bg-indigo-800 disabled:cursor-not-allowed transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </>
              ) : (
                <>
                  <SparklesIcon className="w-5 h-5 mr-2" />
                  Analyze Trends
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-10 max-w-4xl mx-auto">
          {isLoading && <LoadingSpinner />}
          {error && <ErrorMessage message={error} />}
          {analysisResult && !isLoading && <AnalysisDisplay analysis={analysisResult} />}
           {!analysisResult && !isLoading && !error && (
            <div className="text-center py-10 px-6 bg-gray-800/30 rounded-lg border border-dashed border-gray-600">
              <h3 className="text-xl font-medium text-gray-300">Ready to Discover?</h3>
              <p className="mt-2 text-gray-500">Select an industry and click "Analyze Trends" to get started.</p>
            </div>
           )}
        </div>
      </main>
      <footer className="text-center py-4 mt-8 text-gray-600 text-sm">
        <p>Powered by Google Gemini</p>
      </footer>
    </div>
  );
};

export default App;
