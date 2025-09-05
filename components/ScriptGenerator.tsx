import React, { useState, useCallback, useEffect } from 'react';
import { SparklesIcon, UploadIcon } from '../constants';
import { AnalysisResult, GeneratedInfluencer, GeneratedProduct } from '../types';
import { generateImage } from '../services/geminiService';
import ImageUploader from './ImageUploader';


interface ScriptGeneratorProps {
  onGenerate: (
    productImages: {data: string, mimeType: string}[], 
    influencerImage: {data: string, mimeType: string}, 
    productDescription: string,
    influencerDescription: string
  ) => void;
  isLoading: boolean;
  analysisResult: AnalysisResult | null;
  industry: string;
  generatedInfluencer: GeneratedInfluencer | null;
  generatedProduct: GeneratedProduct | null;
}

const ScriptGenerator: React.FC<ScriptGeneratorProps> = ({ onGenerate, isLoading, analysisResult, industry, generatedInfluencer, generatedProduct }) => {
  const MAX_IMAGES = 3;
  // Product Image State
  const [productImagePreviews, setProductImagePreviews] = useState<string[]>([]);
  const [productImageFiles, setProductImageFiles] = useState<{data: string, mimeType: string}[]>([]);
  
  // Influencer Image State
  const [influencerImagePreview, setInfluencerImagePreview] = useState<string | null>(null);
  const [influencerImageFile, setInfluencerImageFile] = useState<{data: string, mimeType: string} | null>(null);
  const [isGeneratingInfluencerImage, setIsGeneratingInfluencerImage] = useState<boolean>(false);

  const [productDescription, setProductDescription] = useState<string>('');
  const [influencerDescription, setInfluencerDescription] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (generatedInfluencer) {
        setInfluencerDescription(generatedInfluencer.description);
        setInfluencerImagePreview(generatedInfluencer.imageUrl);
        setInfluencerImageFile(generatedInfluencer.imageFile);
    }
  }, [generatedInfluencer]);

  useEffect(() => {
    if (generatedProduct) {
        setProductDescription(generatedProduct.description);
        // Reset and set the new product image
        setProductImagePreviews(generatedProduct.imageUrl ? [generatedProduct.imageUrl] : []);
        setProductImageFiles(generatedProduct.imageFile ? [generatedProduct.imageFile] : []);
    }
  }, [generatedProduct]);

  const handleProductImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
                    resolve(null);
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
    e.target.value = ''; // Allow re-uploading the same file
  };
  
  const handleRemoveProductImage = (indexToRemove: number) => {
      setProductImageFiles(prev => prev.filter((_, index) => index !== indexToRemove));
      setProductImagePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };


  const handleInfluencerImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // 4MB limit
          setError("Image size cannot exceed 4MB.");
          return;
      }
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setInfluencerImageFile({ data: base64String, mimeType: file.type });
        setInfluencerImagePreview(reader.result as string);
      };
      reader.onerror = () => {
        setError("Failed to read the image file.");
      }
      reader.readAsDataURL(file);
    }
  };
  
  const removeInfluencerImage = () => {
      setInfluencerImagePreview(null);
      setInfluencerImageFile(null);
  };

  const handleSubmit = useCallback(() => {
    if (productImageFiles.length === 0) {
      setError("Please upload at least one product image.");
      return;
    }
     if (!influencerImageFile) {
      setError("Please upload or generate an influencer image.");
      return;
    }
    if (!productDescription.trim()) {
      setError("Please enter a product description.");
      return;
    }
     if (!influencerDescription.trim()) {
      setError("Please enter an influencer description.");
      return;
    }
    setError(null);
    onGenerate(productImageFiles, influencerImageFile, productDescription, influencerDescription);
  }, [productImageFiles, influencerImageFile, productDescription, influencerDescription, onGenerate]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit();
  };

  const handleGenerateInfluencerImage = async () => {
    if (!influencerDescription.trim()) {
      setError("Please provide an influencer description to generate an image.");
      return;
    }
    setError(null);
    setIsGeneratingInfluencerImage(true);
    try {
      const prompt = `A high-quality, realistic photo of an influencer described as: ${influencerDescription}. The person should be centered, looking at the camera, under professional studio lighting.`;
      const imageUrl = await generateImage(prompt);
      
      const base64Data = imageUrl.split(',')[1];
      const mimeType = imageUrl.substring(imageUrl.indexOf(':') + 1, imageUrl.indexOf(';'));

      setInfluencerImagePreview(imageUrl);
      setInfluencerImageFile({ data: base64Data, mimeType });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate influencer image.');
    } finally {
      setIsGeneratingInfluencerImage(false);
    }
  };
  
  const isCorsFallback = generatedProduct && generatedProduct.imageUrl && productImageFiles.length === 0;


  return (
    <div className="bg-gray-900/80 backdrop-blur-sm rounded-xl shadow-2xl shadow-purple-900/10 p-6 md:p-8 border border-gray-700/50">
      {analysisResult && (
        <div className="mb-6 bg-purple-900/30 border border-purple-600/50 text-purple-200 px-4 py-3 rounded-lg text-sm transition-all duration-300 animate-fade-in" role="alert">
            <p><span className="font-bold">✨ Using Analysis:</span> Insights from the <strong>{industry}</strong> industry are being used to enhance your script.</p>
        </div>
      )}

      <form onSubmit={handleFormSubmit}>
        {/* Main content grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
            
            {/* Column 1: Product */}
            <div className="flex flex-col bg-gray-800/50 p-6 rounded-lg border border-gray-700/60">
              <h3 className="text-lg font-semibold text-gray-200 mb-4 text-center">Product Details</h3>
              <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Product Images (up to {MAX_IMAGES})</label>
                  <div className="grid grid-cols-3 gap-4">
                      {productImagePreviews.map((preview, index) => (
                          <div key={index} className="relative group aspect-square">
                              <img src={preview} alt={`Product preview ${index + 1}`} className="w-full h-full rounded-lg object-cover" />
                              <button
                                  type="button"
                                  onClick={() => handleRemoveProductImage(index)}
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
                                  onChange={handleProductImageChange}
                                  accept="image/png, image/jpeg, image/webp"
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  aria-label="Upload product images"
                                  multiple
                              />
                          </div>
                      )}
                  </div>
              </div>
              {isCorsFallback && (
                <div className="mt-2 text-xs text-center text-yellow-300 bg-yellow-900/60 p-2 rounded-md border border-yellow-700">
                    <p className="font-bold">Action Required</p>
                    <p className="mt-1">We couldn't load this image automatically. Please <strong>save the image above</strong> to your device and <strong>re-upload it here</strong> to continue.</p>
                </div>
              )}
              <div className="mt-6">
                <label htmlFor="product-description" className="block text-sm font-medium text-gray-300 mb-2">Product Description</label>
                <textarea
                  id="product-description"
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  rows={4}
                  className="w-full appearance-none bg-gray-700/80 border border-gray-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  placeholder="e.g., A handcrafted ceramic mug with a self-heating feature, perfect for coffee lovers..."
                  required
                />
              </div>
            </div>

            {/* Column 2: Influencer */}
            <div className="flex flex-col bg-gray-800/50 p-6 rounded-lg border border-gray-700/60">
               <h3 className="text-lg font-semibold text-gray-200 mb-4 text-center">Influencer Details</h3>
               <ImageUploader 
                label="Influencer Image"
                preview={influencerImagePreview}
                onRemove={removeInfluencerImage}
                onChange={handleInfluencerImageChange}
                uploadText="Upload or Generate Influencer"
              />
              <div className="mt-6 flex-grow flex flex-col">
                <label htmlFor="influencer-description" className="block text-sm font-medium text-gray-300 mb-2">Influencer Bio / Description</label>
                <textarea
                  id="influencer-description"
                  value={influencerDescription}
                  onChange={(e) => setInfluencerDescription(e.target.value)}
                  rows={4}
                  className="w-full appearance-none bg-gray-700/80 border border-gray-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition flex-grow"
                  placeholder="Describe the influencer to generate their image, or provide a bio for an uploaded photo. e.g., A 24-year-old fitness coach from Austin, TX. Vibe is energetic, motivational, and a bit goofy..."
                  required
                />
                <button
                    type="button"
                    onClick={handleGenerateInfluencerImage}
                    disabled={!influencerDescription.trim() || isLoading || isGeneratingInfluencerImage}
                    className="mt-3 inline-flex w-full items-center justify-center px-4 py-2 bg-purple-600 rounded-lg font-semibold text-sm text-white hover:bg-purple-500 transition-all duration-300 disabled:bg-purple-800 disabled:cursor-not-allowed transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500"
                >
                    {isGeneratingInfluencerImage ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generating...
                        </>
                    ) : (
                        <>
                            <SparklesIcon className="w-5 h-5 mr-2" />
                            Generate Influencer Image
                        </>
                    )}
                </button>
              </div>
            </div>
        </div>

        {/* Action Area - Structurally separate from the grid above */}
        <div className="mt-8 pt-6 border-t border-gray-700/60 text-center">
            {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
            
            <button
              type="submit"
              disabled={isLoading || isGeneratingInfluencerImage}
              className="inline-flex w-full sm:w-auto items-center justify-center px-8 py-4 bg-indigo-600 rounded-lg font-bold text-lg text-white hover:bg-indigo-500 transition-all duration-300 disabled:bg-indigo-800 disabled:cursor-not-allowed transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
            >
              {isLoading ? (
                 <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating Script...
                </>
              ) : (
                <>
                  <SparklesIcon className="w-6 h-6 mr-2" />
                  Generate Script
                </>
              )}
            </button>
        </div>
      </form>
    </div>
  );
};

export default ScriptGenerator;