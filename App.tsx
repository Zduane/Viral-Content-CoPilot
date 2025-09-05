
import React, { useState, useCallback } from 'react';
import { INDUSTRIES, SparklesIcon, UserCircleIcon, ScriptIcon } from './constants';
import { AnalysisResult, ScriptResult, GeneratedInfluencer, GeneratedProduct } from './types';
import { fetchViralAnalysis, generateViralScript, generateImage } from './services/geminiService';
import IndustrySelector from './components/IndustrySelector';
import AnalysisDisplay from './components/AnalysisDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';
import IdealInfluencerGenerator from './components/IdealInfluencerGenerator';
import ScriptGenerator from './components/ScriptGenerator';
import ScriptDisplay from './components/ScriptDisplay';
import RenderQueue from './components/RenderQueue';
import ApiKeyError from './components/ApiKeyError';


const App: React.FC = () => {
  // Add a check for the API key at the top level of the app.
  if (!process.env.API_KEY) {
    return <ApiKeyError />;
  }

  // State for Trend Analyzer (Step 1)
  const [selectedIndustry, setSelectedIndustry] = useState<string>(INDUSTRIES[0]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  // State for Ideal Influencer (Step 2)
  const [generatedInfluencer, setGeneratedInfluencer] = useState<GeneratedInfluencer | null>(null);
  const [generatedProduct, setGeneratedProduct] = useState<GeneratedProduct | null>(null);


  // State for Script Generator (Step 3)
  const [scriptResult, setScriptResult] = useState<ScriptResult | null>(null);
  const [isScriptLoading, setIsScriptLoading] = useState<boolean>(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [lastScriptInputs, setLastScriptInputs] = useState<{
    influencerImage: {data: string; mimeType: string};
    productImages: {data: string; mimeType: string}[];
    productDescription: string;
  } | null>(null);

  const handleRetryProductImage = useCallback(async (productIndex: number) => {
    if (!analysisResult) return;

    const product = analysisResult.topSellingProducts[productIndex];
    if (!product) return;

    setAnalysisResult(currentResult => {
      if (!currentResult) return null;
      const updatedProducts = [...currentResult.topSellingProducts];
      updatedProducts[productIndex] = { ...updatedProducts[productIndex], isGeneratingImage: true, imageError: undefined };
      return { ...currentResult, topSellingProducts: updatedProducts };
    });

    try {
      const imageUrl = await generateImage(product.imagePrompt);
      setAnalysisResult(currentResult => {
        if (!currentResult) return null;
        const updatedProducts = [...currentResult.topSellingProducts];
        updatedProducts[productIndex] = { ...updatedProducts[productIndex], imageUrl, isGeneratingImage: false, imageError: undefined };
        return { ...currentResult, topSellingProducts: updatedProducts };
      });
    } catch (e) {
      console.error(`Failed to re-generate image for ${product.productName}`, e);
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      setAnalysisResult(currentResult => {
        if (!currentResult) return null;
        const updatedProducts = [...currentResult.topSellingProducts];
        updatedProducts[productIndex] = { ...updatedProducts[productIndex], isGeneratingImage: false, imageError: errorMessage };
        return { ...currentResult, topSellingProducts: updatedProducts };
      });
    }
  }, [analysisResult]);

  const handleAnalyzeClick = useCallback(async () => {
    if (!selectedIndustry) return;

    setIsAnalysisLoading(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      const result = await fetchViralAnalysis(selectedIndustry);
      
      const productsWithLoadingState = result.topSellingProducts.map(p => ({ ...p, isGeneratingImage: true, imageError: undefined }));
      setAnalysisResult({ ...result, topSellingProducts: productsWithLoadingState });

      productsWithLoadingState.forEach(async (product, index) => {
        try {
          const imageUrl = await generateImage(product.imagePrompt);
          setAnalysisResult(currentResult => {
            if (!currentResult) return null;
            const updatedProducts = [...currentResult.topSellingProducts];
            updatedProducts[index] = { ...updatedProducts[index], imageUrl, isGeneratingImage: false, imageError: undefined };
            return { ...currentResult, topSellingProducts: updatedProducts };
          });
        } catch (e) {
          console.error(`Failed to generate image for ${product.productName}`, e);
          const errorMessage = e instanceof Error ? e.message : 'Unknown error';
          setAnalysisResult(currentResult => {
            if (!currentResult) return null;
            const updatedProducts = [...currentResult.topSellingProducts];
            updatedProducts[index] = { ...updatedProducts[index], isGeneratingImage: false, imageError: errorMessage };
            return { ...currentResult, topSellingProducts: updatedProducts };
          });
        }
      });
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsAnalysisLoading(false);
    }
  }, [selectedIndustry]);
  
  const handleInfluencerGenerated = (influencer: GeneratedInfluencer) => {
      setGeneratedInfluencer(influencer);
      // Optional: scroll to the script generator
      document.getElementById('step-3')?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleProductGenerated = (product: GeneratedProduct) => {
      setGeneratedProduct(product);
       document.getElementById('step-3')?.scrollIntoView({ behavior: 'smooth' });
  };


  const handleGenerateScript = useCallback(async (
    productImages: {data: string; mimeType: string}[], 
    influencerImage: {data: string; mimeType: string},
    productDescription: string,
    influencerDescription: string,
  ) => {
    if (!productImages || productImages.length === 0 || !influencerImage || !productDescription) {
      setScriptError("Please provide at least one product image, an influencer image, and a description.");
      return;
    }
    
    setIsScriptLoading(true);
    setScriptError(null);
    setScriptResult(null);
    setLastScriptInputs({ influencerImage, productImages, productDescription });
    
    try {
      const result = await generateViralScript(productImages, influencerImage, productDescription, influencerDescription, analysisResult);
      setScriptResult(result);
    } catch (err) {
      setScriptError(err instanceof Error ? err.message : 'An unknown error occurred during script generation.');
      setLastScriptInputs(null); // Clear inputs on error
    } finally {
      setIsScriptLoading(false);
    }
  }, [analysisResult]);
  
  const handleAddToRenderQueue = (sceneIndex: number) => {
    setScriptResult(currentScript => {
        if (!currentScript) return null;
        const newScenes = [...currentScript.scenes];
        const currentStatus = newScenes[sceneIndex].videoStatus;
        // Prevent re-queuing if it's already in a final or processing state.
        if (currentStatus === 'queued' || currentStatus === 'processing' || currentStatus === 'done') return currentScript;
        
        // When re-adding a scene that previously errored, reset its state.
        newScenes[sceneIndex] = { ...newScenes[sceneIndex], videoStatus: 'queued', videoUrl: undefined, videoGenerationMessage: undefined };
        return { ...currentScript, scenes: newScenes };
    });
  };

  const Header: React.FC = () => (
    <div className="text-center p-6 md:p-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">
            Viral Content Co-pilot
        </h1>
        <p className="mt-3 text-lg text-gray-400 max-w-2xl mx-auto">
            Your AI-powered assistant for market analysis, influencer matching, and viral script generation.
        </p>
    </div>
  );
  
  const StepHeader: React.FC<{ step: number; title: string; icon: React.ReactNode }> = ({ step, title, icon }) => (
     <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-lg">
            {step}
        </div>
        <div>
            <h2 className="text-2xl font-bold text-gray-100 flex items-center">{title}</h2>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-8 space-y-12">

        {/* Step 1: Analyze Industry */}
        <section id="step-1">
          <StepHeader step={1} title="Analyze Industry Trends" icon={<SparklesIcon className="w-6 h-6"/>} />
          <div className="bg-gray-900/80 backdrop-blur-sm rounded-xl shadow-2xl shadow-purple-900/10 p-6 md:p-8 border border-gray-700/50">
            <p className="text-center text-gray-400 mb-6 max-w-xl mx-auto">Start by getting a high-level overview of an industry to uncover viral products, trending topics, and top keywords.</p>
            <div className="flex flex-col sm:flex-row gap-4 items-center max-w-xl mx-auto">
              <IndustrySelector
                selectedIndustry={selectedIndustry}
                onSelectIndustry={setSelectedIndustry}
              />
              <button
                onClick={handleAnalyzeClick}
                disabled={isAnalysisLoading}
                className="w-full sm:w-auto flex items-center justify-center px-6 py-3 bg-indigo-600 rounded-lg font-semibold text-white hover:bg-indigo-500 transition-all duration-300 disabled:bg-indigo-800 disabled:cursor-not-allowed transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
              >
                {isAnalysisLoading ? (
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

          <div className="mt-10 max-w-5xl mx-auto">
            {isAnalysisLoading && <LoadingSpinner />}
            {analysisError && <ErrorMessage message={analysisError} />}
            {analysisResult && !isAnalysisLoading && <AnalysisDisplay analysis={analysisResult} onRetryImage={handleRetryProductImage} />}
            {!analysisResult && !isAnalysisLoading && !analysisError && (
              <div className="text-center py-10 px-6 bg-gray-900/50 rounded-lg border border-dashed border-gray-700">
                <h3 className="text-xl font-medium text-gray-300">Ready to Discover?</h3>
                <p className="mt-2 text-gray-500">Select an industry and click "Analyze Trends" to get started.</p>
              </div>
            )}
          </div>
        </section>
        
        {/* Step 2: Generate Influencer */}
        <section id="step-2">
          <StepHeader step={2} title="Find Your Ideal Influencer" icon={<UserCircleIcon className="w-6 h-6"/>} />
          <div className="max-w-5xl mx-auto">
              <IdealInfluencerGenerator 
                  onInfluencerGenerated={handleInfluencerGenerated} 
                  onProductGenerated={handleProductGenerated}
              />
          </div>
        </section>

        {/* Step 3: Create Script */}
        <section id="step-3">
           <StepHeader step={3} title="Create Your Viral Script" icon={<ScriptIcon className="w-6 h-6"/>} />
           <div className="max-w-5xl mx-auto">
             <ScriptGenerator 
                onGenerate={handleGenerateScript} 
                isLoading={isScriptLoading} 
                analysisResult={analysisResult}
                industry={selectedIndustry}
                generatedInfluencer={generatedInfluencer}
                generatedProduct={generatedProduct}
              />

             <div className="mt-10">
                {isScriptLoading && <LoadingSpinner />}
                {scriptError && <ErrorMessage message={scriptError} />}
                {scriptResult && !isScriptLoading && lastScriptInputs && (
                  <div className="space-y-10">
                    <ScriptDisplay 
                        script={scriptResult}
                        setScript={setScriptResult}
                        influencerImage={lastScriptInputs.influencerImage}
                        productImages={lastScriptInputs.productImages}
                        productDescription={lastScriptInputs.productDescription}
                        onAddToQueue={handleAddToRenderQueue}
                        generatedInfluencer={generatedInfluencer}
                    />
                    <RenderQueue
                      script={scriptResult}
                      setScript={setScriptResult}
                      influencerImage={lastScriptInputs.influencerImage}
                      productDescription={lastScriptInputs.productDescription}
                      productImages={lastScriptInputs.productImages}
                    />
                  </div>
                )}
             </div>
          </div>
        </section>
        
      </main>
      <footer className="text-center py-6 mt-8 text-gray-600 text-sm">
        <p>Powered by Google Gemini & ElevenLabs</p>
      </footer>
    </div>
  );
};

export default App;