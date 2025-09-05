
import React, { useState, useCallback, useMemo } from 'react';
import { ScriptResult, Scene } from '../types';
import { checkVideoStatus, startVideoGeneration } from '../services/geminiService';
import { VideoCameraIcon } from '../constants';

interface RenderQueueProps {
  script: ScriptResult;
  setScript: React.Dispatch<React.SetStateAction<ScriptResult | null>>;
  influencerImage: { data: string; mimeType: string };
  productImages: { data: string; mimeType: string }[];
  productDescription: string;
}

const LOADING_MESSAGES = [
    "Conceptualizing your scene...",
    "Storyboarding the action...",
    "Gathering virtual props and actors...",
    "Finding the perfect lighting...",
    "Rendering the first frames...",
    "This can take a few minutes, stay tuned...",
    "Compositing the shots...",
    "Adding final cinematic touches...",
    "Almost there, preparing your video!"
];

const RenderQueue: React.FC<RenderQueueProps> = ({ script, setScript, productDescription }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingError, setProcessingError] = useState<string | null>(null);

    const queuedItems = useMemo(() => script.scenes
        .map((scene, index) => ({ ...scene, originalIndex: index }))
        .filter(scene => scene.videoStatus === 'queued' || scene.videoStatus === 'processing'),
    [script.scenes]);
    
    const updateScene = useCallback((sceneIndex: number, updates: Partial<Scene>) => {
        setScript(currentScript => {
            if (!currentScript) return null;
            const newScenes = [...currentScript.scenes];
            newScenes[sceneIndex] = { ...newScenes[sceneIndex], ...updates };
            return { ...currentScript, scenes: newScenes };
        });
    }, [setScript]);
    
    const processQueue = useCallback(async () => {
        setIsProcessing(true);
        setProcessingError(null);
        
        const itemsToProcess = script.scenes
            .map((scene, index) => ({ ...scene, originalIndex: index }))
            .filter(scene => scene.videoStatus === 'queued');

        for (const item of itemsToProcess) {
            const sceneIndex = item.originalIndex;
            let pollingInterval: NodeJS.Timeout | null = null;
            
            try {
                // 0. Check if scene image exists (workflow requirement)
                if (!item.imageUrl) {
                    const errorMessage = `Scene ${sceneIndex + 1} is missing a generated image. Please generate the image first.`;
                    setProcessingError(errorMessage);
                    updateScene(sceneIndex, { videoStatus: 'error', videoGenerationMessage: errorMessage });
                    break; // Stop processing the queue
                }

                // 1. Set status to processing and start message cycling
                updateScene(sceneIndex, { videoStatus: 'processing', videoGenerationMessage: LOADING_MESSAGES[0] });

                // 2. Prepare image data and the advanced prompt
                const [header, base64Data] = item.imageUrl.split(',');
                if (!header || !base64Data) {
                    throw new Error("Invalid image data URL format for the scene image.");
                }
                const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
                const sceneImage = { data: base64Data, mimeType };
                
                const prompt = `
                    Create a short, photorealistic, cinematic, UGC-style video based on the provided image.
                    The scene is: "${item.visual}". This description contains specific camera shots, movements, and lighting instructions that you MUST follow precisely.
                    The product in the scene is: "${productDescription}".
                    Animate the still image to bring this scene to life, ensuring the movement is engaging and suitable for a social media ad.
                    The final output should be 8K, highly detailed, with professional color grading, while perfectly preserving the appearance of the person and product from the source image.
                `;

                const operation = await startVideoGeneration(prompt, sceneImage);

                // 3. Start polling for the result
                await new Promise<void>((resolve, reject) => {
                    let messageIndex = 1;
                    pollingInterval = setInterval(async () => {
                        try {
                            // Cycle through loading messages
                            updateScene(sceneIndex, { videoGenerationMessage: LOADING_MESSAGES[messageIndex % LOADING_MESSAGES.length] });
                            messageIndex++;
                            
                            const updatedOp = await checkVideoStatus(operation);

                            if (updatedOp.done) {
                                if (pollingInterval) clearInterval(pollingInterval);
                                
                                if (updatedOp.error) {
                                    const errorMessage = `Generation failed: ${updatedOp.error.message} (Code: ${updatedOp.error.code})`;
                                    throw new Error(errorMessage);
                                }

                                const downloadLink = updatedOp.response?.generatedVideos?.[0]?.video?.uri;
                                if (downloadLink) {
                                    // FIX: Fetch the video, create a blob URL, and use that for the video player.
                                    // Directly using the download link with an API key as a src does not work reliably.
                                    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                                    if (!videoResponse.ok) {
                                        throw new Error(`Failed to download the generated video. Status: ${videoResponse.statusText}`);
                                    }
                                    const videoBlob = await videoResponse.blob();
                                    const videoUrl = URL.createObjectURL(videoBlob);
                                    
                                    updateScene(sceneIndex, { videoStatus: 'done', videoUrl: videoUrl, videoGenerationMessage: undefined });
                                    resolve();
                                } else {
                                    throw new Error("Video generation finished successfully, but the response did not contain a video link.");
                                }
                            }
                        } catch (pollError) {
                            if (pollingInterval) clearInterval(pollingInterval);
                            reject(pollError);
                        }
                    }, 10000); // Poll every 10 seconds
                });
            } catch (err) {
                 if (pollingInterval) clearInterval(pollingInterval);
                 const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
                 setProcessingError(`Failed on Scene ${sceneIndex + 1}: ${errorMessage}`);
                 updateScene(sceneIndex, { videoStatus: 'error', videoGenerationMessage: errorMessage });
                 break; 
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        setIsProcessing(false);
    }, [script.scenes, updateScene, productDescription]);
    
    if (queuedItems.length === 0) {
        return null; // Don't render anything if the queue is empty
    }

    return (
        <div className="bg-gray-900/80 rounded-xl p-6 md:p-8 border border-gray-700/50 shadow-lg backdrop-blur-sm animate-fade-in">
            <div className="flex items-center mb-4">
                <div className="bg-gray-700/50 p-2 rounded-full mr-3 text-indigo-400">
                    <VideoCameraIcon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-100">Video Render Queue</h3>
            </div>
            <div className="space-y-3">
                {queuedItems.map(item => (
                    <div key={item.originalIndex} className="bg-gray-800/50 p-3 rounded-lg flex justify-between items-center text-sm">
                        <span className="font-semibold text-gray-300">Scene {item.originalIndex + 1}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            item.videoStatus === 'queued' ? 'bg-yellow-800 text-yellow-200' : 'bg-blue-800 text-blue-200'
                        }`}>
                            {item.videoStatus === 'queued' ? 'Queued' : 'Processing...'}
                        </span>
                    </div>
                ))}
            </div>
            <div className="mt-6 text-center">
                {processingError && <p className="text-sm text-red-400 mb-4">{processingError}</p>}
                <button
                    onClick={processQueue}
                    disabled={isProcessing}
                    className="inline-flex w-full sm:w-auto items-center justify-center px-8 py-3 bg-indigo-600 rounded-lg font-semibold text-white hover:bg-indigo-500 transition-all duration-300 disabled:bg-indigo-800 disabled:cursor-not-allowed transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
                >
                    {isProcessing ? (
                        <>
                           <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing Queue...
                        </>
                    ) : (
                        `Process Queue (${queuedItems.length} items)`
                    )}
                </button>
            </div>
        </div>
    );
};

export default RenderQueue;
