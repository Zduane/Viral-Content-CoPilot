

import React, { useState, useCallback } from 'react';
import { SparklesIcon, UploadIcon } from '../constants';
import { GeneratedInfluencer, GeneratedProduct, VoiceDesignParameters } from '../types';
import { generateIdealInfluencer, generateImage, getVoiceDesignParameters } from '../services/geminiService';
import { designVoice } from '../services/resembleService';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

interface IdealInfluencerGeneratorProps {
    onInfluencerGenerated: (influencer: GeneratedInfluencer) => void;
    onProductGenerated: (product: GeneratedProduct) => void;
}

interface GenerationResult {
    influencer: GeneratedInfluencer;
    product: GeneratedProduct;
}


const IdealInfluencerGenerator: React.FC<IdealInfluencerGeneratorProps> = ({ onInfluencerGenerated, onProductGenerated }) => {
    const [activeTab, setActiveTab] = useState<'url' | 'image'>('url');
    const [productUrl, setProductUrl] = useState<string>('');
    
    // State for multiple images
    const [productImageFiles, setProductImageFiles] = useState<{ data: string; mimeType: string }[]>([]);
    const [productImagePreviews, setProductImagePreviews] = useState<string[]>([]);
    const MAX_IMAGES = 3;


    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isVoiceLoading, setIsVoiceLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<GenerationResult | null>(null);
    const [isVoicePanelOpen, setIsVoicePanelOpen] = useState<boolean>(false);
    const [voiceParams, setVoiceParams] = useState<VoiceDesignParameters | null>(null);
    const [voiceCreationSuccess, setVoiceCreationSuccess] = useState<boolean>(false);
    const isElevenLabsConfigured = !!process.env.ELEVENLABS_API_KEY;


    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const newFiles = Array.from(files).slice(0, MAX_IMAGES - productImageFiles.length);
            if (newFiles.length === 0) return;

            let hasError = false;
            const filePromises = newFiles.map(file => {
                if (file.size > 4 * 1024 * 1024) { // 4MB limit
                    setError(`Image "${file.name}" size cannot exceed 4MB.`);
                    hasError = true;
                    return Promise.resolve(null);
                }
                return new Promise<{ fileData: { data: string; mimeType: string }; preview: string } | null>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64String = (reader.result as string).split(',')[1];
                        resolve({
                            fileData: { data: base64String, mimeType: file.type },
                            preview: reader.result as string,
                        });
                    };
                    reader.onerror = () => {
                        setError(`Failed to read file: ${file.name}`);
                        resolve(null); // Resolve with null on error
                    };
                    reader.readAsDataURL(file);
                });
            });

            if (hasError) return;
            setError(null);

            Promise.all(filePromises).then(results => {
                const validResults = results.filter(r => r !== null) as { fileData: { data: string; mimeType: string }; preview: string }[];
                setProductImageFiles(prev => [...prev, ...validResults.map(r => r.fileData)]);
                setProductImagePreviews(prev => [...prev, ...validResults.map(r => r.preview)]);
            });
        }
         // Reset the input value to allow re-uploading the same file
        e.target.value = '';
    };

    const handleRemoveImage = (indexToRemove: number) => {
        setProductImageFiles(prev => prev.filter((_, index) => index !== indexToRemove));
        setProductImagePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
    };


    const handleGenerate = useCallback(async () => {
        setError(null);
        setResult(null);

        const input = activeTab === 'url' ? { url: productUrl } : { images: productImageFiles };
        if (activeTab === 'url' && !productUrl.trim()) {
            setError("Please enter a product URL.");
            return;
        }
        if (activeTab === 'image' && productImageFiles.length === 0) {
            setError("Please upload at least one product image.");
            return;
        }

        setIsLoading(true);
        try {
            const genResult = await generateIdealInfluencer(input);

            // Generate influencer image, and determine product image (either from URL or uploaded)
            const influencerImageUrl = await generateImage(genResult.imagePrompt);
            const productImageUrl = activeTab === 'url' ? genResult.productImageUrl! : productImagePreviews[0]!;

            if (activeTab === 'url' && !productImageUrl) {
                console.warn("API did not return a product image URL.");
            }
            
            const influencerBase64 = influencerImageUrl.split(',')[1];
            const influencerMimeType = influencerImageUrl.substring(influencerImageUrl.indexOf(':') + 1, influencerImageUrl.indexOf(';'));

            setResult({
                influencer: {
                    description: genResult.influencerDescription,
                    imageUrl: influencerImageUrl,
                    imageFile: { data: influencerBase64, mimeType: influencerMimeType },
                },
                product: {
                    description: genResult.productDescription,
                    imageUrl: productImageUrl,
                    // Pass the first uploaded image file to be used in the next step
                    imageFile: activeTab === 'image' ? productImageFiles[0]! : undefined,
                    productAnalysis: genResult.productAnalysis,
                }
            });

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, productUrl, productImageFiles, productImagePreviews]);
    
    const handleStartVoiceDesign = async () => {
        if (!result) return;
        setIsVoiceLoading(true);
        setError(null);
        try {
            const params = await getVoiceDesignParameters(result.influencer.description);
            setVoiceParams(params);
            setIsVoicePanelOpen(true);
        } catch (err) {
            setError(err instanceof Error ? `Could not get voice parameters: ${err.message}` : 'An unknown error occurred.');
            setIsVoicePanelOpen(false);
        } finally {
            setIsVoiceLoading(false);
        }
    };

    const handleConfirmVoiceDesign = async () => {
        if (!result || !voiceParams) return;
        
        setIsVoiceLoading(true);
        setVoiceCreationSuccess(false);
        setError(null);
        try {
            const voiceId = await designVoice({
                ...voiceParams,
                accent_strength: 1.5,
                text: voiceParams.sampleText,
            }, `Influencer - ${new Date().toISOString()}`);
            
            setResult(prev => {
                if (!prev) return null;
                const newInfluencer = { ...prev.influencer, voiceId: voiceId };
                return { ...prev, influencer: newInfluencer };
            });
            setVoiceCreationSuccess(true);
            
            setTimeout(() => {
                setIsVoicePanelOpen(false);
                setVoiceParams(null);
                setVoiceCreationSuccess(false);
                setIsVoiceLoading(false);
            }, 2000);

        } catch (err) {
             setError(err instanceof Error ? `Voice Design Failed: ${err.message}` : 'An unknown error occurred during voice design.');
             setIsVoiceLoading(false);
        }
    };

    const handleVoiceParamChange = (field: keyof VoiceDesignParameters, value: string) => {
        setVoiceParams(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleUseInfluencer = () => {
        if (result) {
            onInfluencerGenerated(result.influencer);
        }
    };

    const handleUseProduct = async () => {
        if (!result) return;
    
        const { description, imageUrl, imageFile, productAnalysis } = result.product;

        // If imageFile already exists (from image upload tab), use it directly
        if (imageFile) {
            onProductGenerated({ description, imageUrl, imageFile, productAnalysis });
            return;
        }
    
        // If it's from a URL, try to fetch and convert it.
        try {
            const response = await fetch(imageUrl);
            if (!response.ok) throw new Error('Network response was not ok');
            const blob = await response.blob();
    
            const convertBlobToBase64 = (blobToConvert: Blob) => new Promise<{data: string, mimeType: string}>((resolve, reject) => {
                const reader = new FileReader();
                reader.onerror = reject;
                reader.onload = () => {
                    if (!reader.result) {
                        return reject(new Error("FileReader returned null."));
                    }
                    const base64String = (reader.result as string).split(',')[1];
                    resolve({ data: base64String, mimeType: blobToConvert.type });
                };
                reader.readAsDataURL(blobToConvert);
            });
    
            const newImageFile = await convertBlobToBase64(blob);
            onProductGenerated({ description, imageUrl, imageFile: newImageFile, productAnalysis });
    
        } catch (error) {
            console.warn("Could not fetch product image directly, likely due to CORS. Passing URL for preview.", error);
            // Fallback: pass the URL for preview, but no file data.
            // The ScriptGenerator will handle prompting the user to upload manually.
            onProductGenerated({ description, imageUrl, imageFile: undefined, productAnalysis });
        }
    }

    const TabButton: React.FC<{ tabName: 'url' | 'image'; children: React.ReactNode }> = ({ tabName, children }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 focus-visible:ring-indigo-500 ${activeTab === tabName ? 'bg-indigo-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700/50'}`}
        >
            {children}
        </button>
    );

    const ActionButton: React.FC<{onClick: () => void, children: React.ReactNode, variant?: 'purple' | 'green'}> = ({ onClick, children, variant = 'purple' }) => {
        const colors = {
            purple: 'bg-purple-600 hover:bg-purple-500 focus:ring-purple-500',
            green: 'bg-green-600 hover:bg-green-500 focus:ring-green-500',
        }
        return (
            <button
                onClick={onClick}
                className={`inline-flex w-full items-center justify-center px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${colors[variant]}`}
            >
                {children}
            </button>
        )
    };

    const AnalysisItem: React.FC<{title: string, children: React.ReactNode}> = ({ title, children }) => (
        <div title={title}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</p>
            <p className="text-sm text-gray-300 mt-1">{children}</p>
        </div>
    );


    return (
        <div className="bg-gray-900/80 backdrop-blur-sm rounded-xl shadow-2xl shadow-purple-900/10 p-6 md:p-8 border border-gray-700/50">
            <div className="text-center mb-6">
                <p className="text-gray-400 text-sm max-w-xl mx-auto">Provide a product link or up to 3 images to generate a market analysis and the perfect influencer persona.</p>
            </div>

            <div className="mb-4">
                <div className="flex items-center bg-gray-800/50 p-1 rounded-lg border border-gray-700 max-w-sm mx-auto">
                    <TabButton tabName="url">From URL</TabButton>
                    <TabButton tabName="image">From Images</TabButton>
                </div>
            </div>

            <div className="min-h-[150px] max-w-xl mx-auto">
                {activeTab === 'url' ? (
                    <div>
                        <label htmlFor="product-url" className="sr-only">Product URL</label>
                        <input
                            type="url"
                            id="product-url"
                            value={productUrl}
                            onChange={(e) => setProductUrl(e.target.value)}
                            className="w-full appearance-none bg-gray-700/80 border border-gray-600 rounded-lg py-2.5 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                            placeholder="https://example.com/product/awesome-gadget"
                        />
                    </div>
                ) : (
                    <div>
                        <div className="grid grid-cols-3 gap-4">
                            {productImagePreviews.map((preview, index) => (
                                <div key={index} className="relative group aspect-square">
                                    <img src={preview} alt={`Product preview ${index + 1}`} className="w-full h-full rounded-lg object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveImage(index)}
                                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                                        aria-label={`Remove image ${index + 1}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            ))}
                            {productImageFiles.length < MAX_IMAGES && (
                                <div className="relative flex flex-col justify-center items-center w-full aspect-square border-2 border-dashed border-gray-600 rounded-lg p-2 text-center hover:border-indigo-500 transition-colors">
                                    <UploadIcon className="mx-auto h-8 w-8 text-gray-500" />
                                    <span className="mt-1 block text-xs font-semibold text-gray-400">
                                        Add Image{productImageFiles.length > 0 ? 's' : ''}
                                    </span>
                                     <span className="mt-1 block text-xs text-gray-500">{productImageFiles.length}/{MAX_IMAGES}</span>
                                    <input
                                        type="file"
                                        onChange={handleImageChange}
                                        accept="image/png, image/jpeg, image/webp"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        aria-label="Upload product images"
                                        multiple
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-6 text-center">
                <button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="inline-flex w-full sm:w-auto items-center justify-center px-8 py-3 bg-indigo-600 rounded-lg font-semibold text-white hover:bg-indigo-500 transition-all duration-300 disabled:bg-indigo-800 disabled:cursor-not-allowed transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
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
                            <SparklesIcon className="w-5 h-5 mr-2" />
                            Analyze & Generate
                        </>
                    )}
                </button>
            </div>
            
            <div className="mt-8">
                {isLoading && <LoadingSpinner />}
                {error && <ErrorMessage message={error} />}
                {result && !isLoading && (
                    <div className="animate-fade-in bg-gray-800/50 p-4 rounded-lg border border-gray-700/60">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                           
                            {/* Influencer Column */}
                            <div className="flex flex-col text-center bg-gray-900/50 p-4 rounded-lg border border-gray-700/80">
                                <h4 className="text-lg font-bold text-purple-300 mb-3">Ideal Influencer</h4>
                                <div className="w-full sm:w-48 flex-shrink-0 mx-auto">
                                    <img src={result.influencer.imageUrl} alt="Generated Influencer" className="w-full h-auto object-cover aspect-square rounded-lg" />
                                </div>
                                <p className="text-gray-300 mt-3 text-sm flex-grow">{result.influencer.description}</p>
                                
                                {isVoicePanelOpen && voiceParams && (
                                    <div className="mt-4 p-4 bg-gray-800/80 rounded-lg border border-gray-700 space-y-3 text-left animate-fade-in">
                                        <h5 className="font-bold text-center text-gray-200 text-base mb-3">Customize Voice</h5>
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <label htmlFor="voice-gender" className="block text-xs font-medium text-gray-400 mb-1">Gender</label>
                                                <select id="voice-gender" value={voiceParams.gender} onChange={(e) => handleVoiceParamChange('gender', e.target.value)} className="w-full bg-gray-700/80 border border-gray-600 rounded-md py-1.5 px-2 text-white focus:outline-none focus:ring-1 focus:ring-purple-500">
                                                    <option value="female">Female</option>
                                                    <option value="male">Male</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label htmlFor="voice-age" className="block text-xs font-medium text-gray-400 mb-1">Age</label>
                                                <select id="voice-age" value={voiceParams.age} onChange={(e) => handleVoiceParamChange('age', e.target.value)} className="w-full bg-gray-700/80 border border-gray-600 rounded-md py-1.5 px-2 text-white focus:outline-none focus:ring-1 focus:ring-purple-500">
                                                    <option value="young">Young</option>
                                                    <option value="middle_aged">Middle-Aged</option>
                                                    <option value="old">Old</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor="voice-accent" className="block text-xs font-medium text-gray-400 mb-1">Accent</label>
                                            <select id="voice-accent" value={voiceParams.accent} onChange={(e) => handleVoiceParamChange('accent', e.target.value)} className="w-full bg-gray-700/80 border border-gray-600 rounded-md py-1.5 px-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500">
                                                <option value="american">American</option>
                                                <option value="british">British</option>
                                                <option value="african">African</option>
                                                <option value="australian">Australian</option>
                                                <option value="indian">Indian</option>
                                            </select>
                                        </div>
                                         <div>
                                            <label htmlFor="voice-desc" className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                                            <textarea id="voice-desc" value={voiceParams.voiceDescription} onChange={(e) => handleVoiceParamChange('voiceDescription', e.target.value)} rows={2} className="w-full text-sm bg-gray-700/80 border border-gray-600 rounded-md py-1.5 px-2 text-white focus:outline-none focus:ring-1 focus:ring-purple-500"></textarea>
                                        </div>
                                        <div>
                                            <label htmlFor="voice-sample" className="block text-xs font-medium text-gray-400 mb-1">Sample Text</label>
                                            <textarea id="voice-sample" value={voiceParams.sampleText} onChange={(e) => handleVoiceParamChange('sampleText', e.target.value)} rows={3} className="w-full text-sm bg-gray-700/80 border border-gray-600 rounded-md py-1.5 px-2 text-white focus:outline-none focus:ring-1 focus:ring-purple-500"></textarea>
                                        </div>
                                        
                                        {voiceCreationSuccess && (
                                            <div className="text-center text-sm text-green-300 font-semibold p-2 bg-green-900/50 rounded-md border border-green-700">
                                                Voice created successfully!
                                            </div>
                                        )}

                                        <div className="flex gap-3 pt-2">
                                            <button onClick={() => { setIsVoicePanelOpen(false); setVoiceParams(null); }} disabled={isVoiceLoading} className="w-full text-center py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-md text-white font-semibold transition-colors disabled:opacity-50">Cancel</button>
                                            <button 
                                                onClick={handleConfirmVoiceDesign} 
                                                disabled={isVoiceLoading} 
                                                className={`w-full text-center py-2 text-sm rounded-md text-white font-semibold transition-colors
                                                    ${voiceCreationSuccess 
                                                        ? 'bg-green-600 cursor-default' 
                                                        : 'bg-pink-600 hover:bg-pink-500 disabled:bg-pink-800'
                                                    }
                                                `}
                                            >
                                                {isVoiceLoading && !voiceCreationSuccess && 'Creating...'}
                                                {voiceCreationSuccess && '✓ Success!'}
                                                {!isVoiceLoading && 'Create Voice'}
                                            </button>
                                        </div>
                                    </div>
                                )}


                                <div className="mt-auto pt-4 w-full space-y-2">
                                   <ActionButton onClick={handleUseInfluencer} variant="purple">Use this Influencer</ActionButton>
                                   {!isVoicePanelOpen && (
                                        result.influencer.voiceId ? (
                                            <p className="text-green-400 text-sm font-semibold py-2">✓ Custom Voice Ready</p>
                                        ) : (
                                            <div>
                                                <button
                                                    onClick={handleStartVoiceDesign}
                                                    disabled={isVoiceLoading || !isElevenLabsConfigured}
                                                    className="inline-flex w-full items-center justify-center px-4 py-2 bg-pink-600 rounded-lg font-semibold text-sm text-white hover:bg-pink-500 transition-all duration-300 disabled:bg-pink-800 disabled:cursor-not-allowed"
                                                >
                                                    {isVoiceLoading ? (
                                                        <>
                                                         <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                         Loading...
                                                        </>
                                                    ) : 'Design Custom Voice'}
                                                </button>
                                                {!isElevenLabsConfigured && (
                                                    <p className="text-xs text-yellow-400 mt-2 text-center">
                                                        Voice design feature unavailable.
                                                    </p>
                                                )}
                                            </div>
                                        )
                                   )}
                                </div>
                            </div>

                            {/* Product Column */}
                             <div className="flex flex-col text-center bg-gray-900/50 p-4 rounded-lg border border-gray-700/80">
                                <h4 className="text-lg font-bold text-green-300 mb-3">Analyzed Product</h4>
                                <div className="w-full sm:w-48 flex-shrink-0 mx-auto">
                                    <img src={result.product.imageUrl} alt="Analyzed Product" className="w-full h-auto object-cover aspect-square rounded-lg" />
                                </div>
                                <p className="text-gray-300 mt-3 text-sm flex-grow">{result.product.description}</p>
                                
                                {result.product.productAnalysis && (
                                    <div className="mt-4 w-full text-left bg-gray-800/50 p-3 rounded-lg border border-gray-700 space-y-3">
                                        <h5 className="text-sm font-semibold text-center text-gray-300 mb-2">Product Analysis</h5>
                                        <AnalysisItem title="Sales Potential">
                                            {result.product.productAnalysis.salesPotential}
                                        </AnalysisItem>
                                        <AnalysisItem title="Problem Solved">
                                            {result.product.productAnalysis.problemSolved}
                                        </AnalysisItem>
                                        <AnalysisItem title="Value Proposition">
                                            {result.product.productAnalysis.valueProposition}
                                        {/* FIX: Corrected typo in closing tag from AanlysisItem to AnalysisItem */}
                                        </AnalysisItem>
                                        <AnalysisItem title="Market Saturation">
                                            {result.product.productAnalysis.marketSaturation}
                                        </AnalysisItem>
                                    </div>
                                )}

                                <div className="mt-auto pt-4 w-full">
                                    <ActionButton onClick={handleUseProduct} variant="green">Use this Product</ActionButton>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};

export default IdealInfluencerGenerator;