import React, { useState, useCallback, useMemo } from 'react';
import { ScriptResult, Scene, UserProfile } from '../types';
import { checkVideoStatus, startVideoGeneration } from '../services/geminiService';
import { VideoCameraIcon, CrownIcon } from '../constants';
import { getEnv } from '../services/apiConfig';

interface RenderQueueProps {
  script: ScriptResult;
  setScript: React.Dispatch<React.SetStateAction<ScriptResult | null>>;
  influencerImage: { data: string; mimeType: string };
  productImages: { data: string; mimeType: string }[];
  productDescription: string;
  userProfile: UserProfile | null;
  onUpgradeClick: () => void;
  onUsageUpdate: () => void;
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

const RenderQueue: React.FC<RenderQueueProps> = ({ script, setScript, productDescription, userProfile, onUpgradeClick, onUsageUpdate }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingError, setProcessingError] = useState<string | null>(null);
    const [resolution, setResolution] = useState('720p');
    const [frameRate, setFrameRate] = useState(24);

    const isPremiumTier = userProfile?.subscriptionTier === 'pro' || userProfile?.subscriptionTier === 'business';
    const videoLimit = userProfile?.subscriptionTier === 'free' ? 2 : userProfile?.subscriptionTier === 'pro' ? 25 : Infinity;
    const videosUsed = userProfile?.usage.videos ?? 0;

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

        if (!userProfile || videosUsed + itemsToProcess.length > videoLimit) {
            setProcessingError(`Rendering these ${itemsToProcess.length} videos would exceed your monthly limit of ${videoLimit}.`);
            onUpgradeClick();
            setIsProcessing(false);
            return;
        }

        for (const item of itemsToProcess) {
            const sceneIndex = item.originalIndex;
            let pollingInterval: ReturnType<typeof setInterval> | null = null;
            
            try {
                if (!item.imageUrl) {
                    throw new Error(`Scene ${sceneIndex + 1} is missing a generated image. Please generate the image first.`);
                }

                updateScene(sceneIndex, { videoStatus: 'processing', videoGenerationMessage: LOADING_MESSAGES[0] });

                const [header, base64Data] = item.imageUrl.split(',');
                if (!header || !base64Data) throw new Error("Invalid image data URL format.");
                const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
                const sceneImage = { data: base64Data, mimeType };
                
                const { script: scriptText, scriptType } = item;
                let audioInstruction = scriptType === 'dialogue' && scriptText?.trim()
                    ? `The person in the image MUST animate their mouth to lip-sync the following dialogue: "${scriptText}".`
                    : `The person in the image is NOT speaking. Their mouth should remain neutral.`;

                const basePrompt = `
                    Create a photorealistic, cinematic, UGC-style video based on the provided image.
                    - **Visuals:** Follow these instructions precisely: "${item.visual}".
                    - **Emotion:** The influencer's expression MUST match the mood of: "${item.visual}" and script: "${scriptText}".
                    - **Dialogue/Action:** ${audioInstruction}
                    - **Product Context:** The product is: "${productDescription}".
                    - **Preserve Appearance:** CRITICAL: Perfectly preserve the appearance of the person and product. Do not change their identity.
                `;

                const operation = await startVideoGeneration(basePrompt, sceneImage, userProfile.subscriptionTier, resolution, frameRate);
                
                onUsageUpdate();

                await new Promise<void>((resolve, reject) => {
                    let messageIndex = 1;
                    pollingInterval = setInterval(async () => {
                        try {
                            updateScene(sceneIndex, { videoGenerationMessage: LOADING_MESSAGES[messageIndex % LOADING_MESSAGES.length] });
                            messageIndex++;
                            
                            const updatedOp = await checkVideoStatus(operation);

                            if (updatedOp.done) {
                                if (pollingInterval) clearInterval(pollingInterval);
                                if (updatedOp.error) throw new Error(`Generation failed: ${updatedOp.error.message}`);

                                const downloadLink = updatedOp.response?.generatedVideos?.[0]?.video?.uri;
                                if (!downloadLink) throw new Error("Generation finished, but no video link was returned.");
                                
                                const apiKey = getEnv('VITE_API_KEY') || getEnv('API_KEY');
                                if (!apiKey) throw new Error("API Key not found, cannot download video.");
                                
                                const videoResponse = await fetch(`${downloadLink}&key=${apiKey}`);
                                if (!videoResponse.ok) throw new Error(`Failed to download video: ${videoResponse.statusText}`);
                                
                                const videoBlob = await videoResponse.blob();
                                const videoUrl = URL.createObjectURL(videoBlob);
                                
                                updateScene(sceneIndex, { videoStatus: 'done', videoUrl: videoUrl, videoGenerationMessage: undefined });
                                resolve();
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
    }, [script.scenes, updateScene, productDescription, userProfile, videosUsed, videoLimit, onUpgradeClick, resolution, frameRate, onUsageUpdate]);
    
    if (queuedItems.length === 0) return null;

    const renderOption = (value: string, label: string, premium: boolean) => (
        <option key={value} value={value} disabled={premium && !isPremiumTier}>
            {label}{premium && !isPremiumTier ? ' (Pro)' : ''}
        </option>
    );

    const SelectInput: React.FC<{label: string, value: any, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, children: React.ReactNode, premium: boolean}> = ({ label, value, onChange, children, premium }) => (
        <div className="relative flex-1 group">
            <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
            <select
                value={value}
                onChange={onChange}
                className={`w-full appearance-none bg-gray-700 border border-gray-600 rounded-lg py-2 pl-3 pr-8 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition disabled:opacity-50`}
            >
                {children}
            </select>
            {premium && !isPremiumTier && (
                <div className="absolute top-1/2 right-2 text-yellow-400" onClick={onUpgradeClick}>
                    <CrownIcon className="w-5 h-5 cursor-pointer" />
                     <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Upgrade to Pro to unlock
                    </div>
                </div>
            )}
        </div>
    );

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

            <div className="mt-6 pt-6 border-t border-gray-700/60">
                <h4 className="text-base font-semibold text-gray-200 mb-3 text-center">Render Settings</h4>
                <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                    <SelectInput label="Resolution" value={resolution} onChange={e => setResolution(e.target.value)} premium={true}>
                        {renderOption('720p', '720p HD', false)}
                        {renderOption('1080p', '1080p Full HD', true)}
                        {renderOption('4K', '4K Ultra HD', true)}
                    </SelectInput>
                    <SelectInput label="Frame Rate" value={frameRate} onChange={e => setFrameRate(Number(e.target.value))} premium={true}>
                        {renderOption('24', '24 fps (Cinematic)', false)}
                        {renderOption('30', '30 fps (Standard)', false)}
                        {renderOption('60', '60 fps (Smooth)', true)}
                    </SelectInput>
                </div>
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