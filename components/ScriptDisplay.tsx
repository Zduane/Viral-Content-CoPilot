
import React, { useState, useEffect, useRef } from 'react';
import { ScriptResult, GeneratedInfluencer } from '../types';
import { ScriptIcon, CopyIcon, SparklesIcon, VideoCameraIcon, PlayCircleIcon } from '../constants';
import { generateSceneImage } from '../services/geminiService';
import { generateVoiceoverAudioUrl } from '../services/resembleService';
import { apiConfig } from '../services/apiConfig';


interface ScriptDisplayProps {
  script: ScriptResult;
  setScript: React.Dispatch<React.SetStateAction<ScriptResult | null>>;
  influencerImage: { data: string; mimeType: string };
  productImages: { data: string; mimeType: string }[];
  productDescription: string;
  onAddToQueue: (sceneIndex: number) => void;
  generatedInfluencer: GeneratedInfluencer | null;
}

const ScriptDisplay: React.FC<ScriptDisplayProps> = ({ script, setScript, influencerImage, productImages, productDescription, onAddToQueue, generatedInfluencer }) => {
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
    const [genError, setGenError] = useState<string | null>(null);
    const audioPlayerRef = useRef<HTMLAudioElement>(null);
    const isGeneratingAudioRef = useRef<Record<number, boolean>>({});
    const isElevenLabsConfigured = !!apiConfig.elevenLabs;

    const handleInteractionPromptChange = (sceneIndex: number, prompt: string) => {
        setScript(currentScript => {
            if (!currentScript) return null;
            const newScenes = [...currentScript.scenes];
            newScenes[sceneIndex] = { ...newScenes[sceneIndex], interactionPrompt: prompt };
            return { ...currentScript, scenes: newScenes };
        });
    };

    const handleGenerateImage = async (sceneIndex: number) => {
        setGenError(null);
        setScript(currentScript => {
            if (!currentScript) return null;
            const newScenes = [...currentScript.scenes];
            newScenes[sceneIndex] = { ...newScenes[sceneIndex], isGeneratingImage: true };
            return { ...currentScript, scenes: newScenes };
        });

        try {
            const scene = script.scenes[sceneIndex];
            const newImageUrl = await generateSceneImage(influencerImage, productImages, productDescription, scene.visual, scene.interactionPrompt || '');
            setScript(currentScript => {
                if (!currentScript) return null;
                const newScenes = [...currentScript.scenes];
                newScenes[sceneIndex] = { ...newScenes[sceneIndex], imageUrl: newImageUrl, isGeneratingImage: false };
                return { ...currentScript, scenes: newScenes };
            });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to generate image.';
            setGenError(`Image (Scene ${sceneIndex + 1}): ${errorMessage}`);
            setScript(currentScript => {
                if (!currentScript) return null;
                const newScenes = [...currentScript.scenes];
                newScenes[sceneIndex] = { ...newScenes[sceneIndex], isGeneratingImage: false };
                return { ...currentScript, scenes: newScenes };
            });
        }
    };
    
    // Independent voiceover play logic
    const handlePlayOrGenerateVoiceover = async (sceneIndex: number) => {
        if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
            audioPlayerRef.current.currentTime = 0;
        }
        setGenError(null);

        if (!isElevenLabsConfigured) {
            setGenError("Voiceover generation is unavailable because the ElevenLabs API key is not configured.");
            return;
        }
    
        const scene = script.scenes[sceneIndex];
    
        if (scene.voiceoverAudioUrl && audioPlayerRef.current) {
            audioPlayerRef.current.src = scene.voiceoverAudioUrl;
            audioPlayerRef.current.play();
            return;
        }
        
        const voiceId = generatedInfluencer?.voiceId;
        if (!voiceId) {
            setGenError("A custom voice has not been designed for this influencer yet. Please go back to Step 2 and design a voice.");
            return;
        }
    
        try {
            setScript(currentScript => {
                if (!currentScript) return null;
                const newScenes = [...currentScript.scenes];
                newScenes[sceneIndex] = { ...newScenes[sceneIndex], isGeneratingVoiceover: true };
                return { ...currentScript, scenes: newScenes };
            });
    
            const audioUrl = await generateVoiceoverAudioUrl(scene.voiceover, voiceId);
    
            setScript(currentScript => {
                if (!currentScript) return null;
                const newScenes = [...currentScript.scenes];
                newScenes[sceneIndex] = { ...newScenes[sceneIndex], voiceoverAudioUrl: audioUrl, isGeneratingVoiceover: false };
                return { ...currentScript, scenes: newScenes };
            });
            
            if (audioPlayerRef.current) {
                audioPlayerRef.current.src = audioUrl;
                audioPlayerRef.current.play();
            }
    
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setGenError(`Voiceover (Scene ${sceneIndex + 1}): ${errorMessage}`);
            setScript(currentScript => {
                if (!currentScript) return null;
                const newScenes = [...currentScript.scenes];
                newScenes[sceneIndex] = { ...newScenes[sceneIndex], isGeneratingVoiceover: false };
                return { ...currentScript, scenes: newScenes };
            });
        }
    };
    
    // === Video and Audio Sync Logic ===
    const handleVideoPlay = async (videoElement: HTMLVideoElement, sceneIndex: number) => {
        const audio = audioPlayerRef.current;
        if (!audio) return;
        setGenError(null);

        // Use a ref to prevent re-entry loops when programmatically calling .play()
        if (isGeneratingAudioRef.current[sceneIndex]) {
            return;
        }

        const scene = script.scenes[sceneIndex];
        let audioUrl = scene.voiceoverAudioUrl;

        // Generate audio if it doesn't exist
        if (!audioUrl) {
            if (!isElevenLabsConfigured) {
                setGenError("Voiceover generation is unavailable because the ElevenLabs API key is not configured.");
                videoElement.pause();
                return;
            }
            
            const voiceId = generatedInfluencer?.voiceId;
            if (!voiceId) {
                setGenError("A custom voice has not been designed for this influencer yet. Please go back to Step 2 and design a voice.");
                videoElement.pause();
                return;
            }
            
            videoElement.pause();
            audio.pause();
            isGeneratingAudioRef.current[sceneIndex] = true;
            
            setScript(currentScript => {
                if (!currentScript) return null;
                const newScenes = [...currentScript.scenes];
                newScenes[sceneIndex] = { ...newScenes[sceneIndex], isGeneratingVoiceover: true };
                return { ...currentScript, scenes: newScenes };
            });

            try {
                const newAudioUrl = await generateVoiceoverAudioUrl(scene.voiceover, voiceId);
                
                audio.src = newAudioUrl;
                audio.currentTime = videoElement.currentTime;
                // This promise ensures both start playing together
                await Promise.all([audio.play(), videoElement.play()]);

                setScript(currentScript => {
                    if (!currentScript) return null;
                    const newScenes = [...currentScript.scenes];
                    newScenes[sceneIndex] = { ...newScenes[sceneIndex], voiceoverAudioUrl: newAudioUrl, isGeneratingVoiceover: false };
                    return { ...currentScript, scenes: newScenes };
                });

            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
                setGenError(`Voiceover (Scene ${sceneIndex + 1}): ${errorMessage}`);
                setScript(currentScript => {
                    if (!currentScript) return null;
                    const newScenes = [...currentScript.scenes];
                    newScenes[sceneIndex] = { ...newScenes[sceneIndex], isGeneratingVoiceover: false };
                    return { ...currentScript, scenes: newScenes };
                });
            } finally {
                isGeneratingAudioRef.current[sceneIndex] = false;
            }
        } else {
            // Audio already exists, just sync and play
            if (audio.src !== audioUrl) audio.src = audioUrl;
            audio.currentTime = videoElement.currentTime;
            audio.play();
        }
    };

    const handleVideoPause = () => {
        audioPlayerRef.current?.pause();
    };
    
    const handleVideoSeeked = (videoElement: HTMLVideoElement) => {
        const audio = audioPlayerRef.current;
        if (audio && !audio.seeking) {
           audio.currentTime = videoElement.currentTime;
        }
    };
    // === End Sync Logic ===

    const formatScriptForCopy = () => {
        let text = `🎬 Viral Video Script 🎬\n\n`;
        text += `🔥 THE SCROLL-STOPPING HOOK:\n`;
        text += `👁️ Visual: ${script.hook.visual}\n`;
        text += `🎤 Verbal: ${script.hook.verbal}\n`;
        text += `✍️ On-Screen Text: "${script.hook.textOverlay}"\n\n`;

        script.scenes.forEach((scene, index) => {
            text += `SCENE ${index + 1}:\n`;
            text += `👁️ Visual: ${scene.visual}\n`;
            text += `🎤 Voiceover: ${scene.voiceover}\n\n`;
        });
        
        text += `--- PRIMARY (TIKTOK) ---\n`;
        text += `🚀 CALL TO ACTION:\n${script.callToAction}\n\n`;
        text += `🎶 SUGGESTED SOUND:\n${script.suggestedSound}\n\n`;

        if (script.platformVariations && script.platformVariations.length > 0) {
            text += `🔄 PLATFORM VARIATIONS:\n`;
            script.platformVariations.forEach(variation => {
                text += `------------------------------\n`;
                text += `PLATFORM: ${variation.platformName}\n`;
                text += `🚀 Call to Action: ${variation.callToAction}\n`;
                text += `🎶 Suggested Sound: ${variation.suggestedSound}\n`;
                if (variation.notes) {
                    text += `💡 Pro Tip: ${variation.notes}\n`;
                }
                text += `\n`;
            });
        }
        return text;
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(formatScriptForCopy()).then(() => {
            setCopyStatus('copied');
            setTimeout(() => setCopyStatus('idle'), 2000);
        });
    };
    
    const renderVideoContent = (sceneIndex: number) => {
        const scene = script.scenes[sceneIndex];
        const status = scene.videoStatus || 'idle';
        const isImageGenerated = !!scene.imageUrl;

        const AddToQueueButton = () => (
             <button
                onClick={() => onAddToQueue(sceneIndex)}
                className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600 rounded-lg font-semibold text-sm text-white hover:bg-indigo-500 transition-all duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed transform hover:scale-105"
                disabled={!isImageGenerated || scene.isGeneratingImage}
            >
                <VideoCameraIcon className="w-5 h-5 mr-2" />
                Add to Render Queue
            </button>
        );

        switch(status) {
            case 'done':
                return scene.videoUrl ? <video 
                    src={scene.videoUrl} 
                    controls 
                    className="w-full h-auto rounded-lg object-cover aspect-video"
                    onPlay={(e) => handleVideoPlay(e.currentTarget, sceneIndex)}
                    onPause={handleVideoPause}
                    onEnded={handleVideoPause}
                    onSeeked={(e) => handleVideoSeeked(e.currentTarget)}
                 /> : null;
            
            case 'processing':
                 return (
                    <div className="flex flex-col items-center justify-center text-center bg-gray-800 rounded-lg p-4 h-28">
                        <svg className="animate-spin h-6 w-6 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="mt-2 text-sm font-semibold text-gray-300">Creating Your Video...</p>
                        <p className="text-xs text-gray-400 mt-1">{scene.videoGenerationMessage}</p>
                    </div>
                );
            
            case 'queued':
                return (
                    <div className="flex items-center justify-center bg-gray-800 rounded-lg p-2 h-10">
                        <span className="text-sm font-semibold text-gray-400">Queued for Rendering...</span>
                    </div>
                );

            case 'error':
                 return (
                    <div className="flex flex-col items-center justify-center text-center bg-red-900/50 rounded-lg p-2 h-16 border border-red-500">
                         <p className="text-sm font-bold text-red-300">Generation Failed</p>
                         <button
                            onClick={() => onAddToQueue(sceneIndex)}
                            className="mt-1 text-xs text-red-200 underline hover:text-white"
                         >
                           Retry
                         </button>
                    </div>
                );

            case 'idle':
            default:
                return (
                    <div className="relative group">
                       <AddToQueueButton />
                       {!isImageGenerated && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                Generate the scene image first
                            </div>
                        )}
                    </div>
                );
        }
    }

    return (
        <div className="bg-gray-900/80 rounded-xl p-6 md:p-8 border border-gray-700/50 shadow-lg backdrop-blur-sm animate-fade-in relative">
            <audio ref={audioPlayerRef} hidden />
            <div className="flex items-center mb-4 pb-4 border-b border-gray-700/60">
                <div className="bg-gray-700/50 p-2 rounded-full mr-3 text-purple-400">
                    <ScriptIcon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-100">Your Viral Script & Storyboard</h3>
            </div>
            
            <button
                onClick={handleCopy}
                className="absolute top-6 right-6 bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-2 px-3 rounded-lg text-sm transition-colors flex items-center"
                aria-label="Copy script"
            >
                <CopyIcon className="w-4 h-4 mr-2" />
                {copyStatus === 'copied' ? 'Copied!' : 'Copy'}
            </button>

            <div className="space-y-8">
                <div>
                    <h4 className="font-semibold text-purple-300 text-sm uppercase tracking-wider mb-2">The Scroll-Stopping Hook</h4>
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/60 space-y-3">
                        <div>
                            <p className="text-sm font-medium text-gray-300">👁️ Visual</p>
                            <p className="text-gray-400 pl-5">{script.hook.visual}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-300">🎤 Verbal</p>
                            <p className="text-gray-400 pl-5">{script.hook.verbal}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-300">✍️ On-Screen Text</p>
                            <p className="text-gray-400 pl-5 font-semibold">"{script.hook.textOverlay}"</p>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 className="font-semibold text-purple-300 text-sm uppercase tracking-wider">Scenes</h4>
                    <div className="mt-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {script.scenes.map((scene, index) => (
                             <div key={index} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/60 flex flex-col">
                                <p className="font-semibold text-gray-300 mb-2">Scene {index + 1}</p>
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-gray-400 flex-1"><span className="font-medium text-gray-300">🎤 Voiceover:</span> {scene.voiceover}</p>
                                    <button onClick={() => handlePlayOrGenerateVoiceover(index)} className="ml-2 text-gray-400 hover:text-white transition-colors" title="Play Voiceover" disabled={scene.isGeneratingVoiceover}>
                                        {scene.isGeneratingVoiceover ? (
                                            <svg className="animate-spin h-6 w-6 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : (
                                            <PlayCircleIcon className="w-6 h-6"/>
                                        )}
                                    </button>
                                </div>

                                <p className="text-sm text-gray-400 mt-3"><span className="font-medium text-gray-300">👁️ Visual:</span> {scene.visual}</p>
                                
                                <div className="mt-4 flex-grow">
                                    <label htmlFor={`interaction-prompt-${index}`} className="block text-xs font-medium text-gray-400 mb-1">
                                        Interaction Prompt (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        id={`interaction-prompt-${index}`}
                                        value={scene.interactionPrompt || ''}
                                        onChange={(e) => handleInteractionPromptChange(index, e.target.value)}
                                        className="w-full bg-gray-700/80 border border-gray-600 rounded-md py-1.5 px-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                                        placeholder="e.g., holding the mug by its large black handle"
                                        disabled={scene.isGeneratingImage || !!scene.imageUrl}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Guide the AI on exactly how the product is used.</p>
                                </div>
                                
                                <div className="mt-4 space-y-2">
                                    {/* Image Generation */}
                                    {scene.isGeneratingImage ? (
                                        <div className="flex items-center justify-center bg-gray-800 rounded-lg p-2 h-10">
                                            <svg className="animate-spin h-5 w-5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span className="ml-2 text-sm text-gray-400">Generating image...</span>
                                        </div>
                                    ) : scene.imageUrl ? (
                                        <img src={scene.imageUrl} alt={`Generated visual for Scene ${index + 1}`} className="w-full h-auto rounded-lg object-cover aspect-square" />
                                    ) : (
                                        <button
                                            onClick={() => handleGenerateImage(index)}
                                            className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 rounded-lg font-semibold text-sm text-white hover:bg-purple-500 transition-all duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed transform hover:scale-105"
                                            disabled={scene.videoStatus === 'processing' || scene.videoStatus === 'queued'}
                                        >
                                            <SparklesIcon className="w-5 h-5 mr-2" />
                                            Generate Scene Image
                                        </button>
                                    )}

                                    {/* Video Generation */}
                                    {renderVideoContent(index)}
                                </div>
                            </div>
                        ))}
                    </div>
                    {genError && <p className="text-xs text-red-400 mt-4 text-center">{genError}</p>}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                         <h4 className="font-semibold text-purple-300 text-sm uppercase tracking-wider">Primary (TikTok)</h4>
                         <div className="mt-2 bg-gray-800/50 p-4 rounded-lg border border-gray-700/60 space-y-2">
                            <p className="text-gray-300 "><span className="font-semibold">🚀 Call to Action:</span> {script.callToAction}</p>
                            <p className="text-gray-300 "><span className="font-semibold">🎶 Suggested Sound:</span> {script.suggestedSound}</p>
                        </div>
                    </div>

                    {script.platformVariations && script.platformVariations.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-purple-300 text-sm uppercase tracking-wider mb-2">Platform Variations</h4>
                             {script.platformVariations.map((variation, index) => (
                                <div key={index} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/60">
                                    <h5 className="font-bold text-lg text-gray-200 mb-2">{variation.platformName}</h5>
                                    <div className="space-y-2 text-sm">
                                        <p className="text-gray-400"><span className="font-medium text-gray-300">🚀 Call to Action:</span> {variation.callToAction}</p>
                                        <p className="text-gray-400"><span className="font-medium text-gray-300">🎶 Suggested Sound:</span> {variation.suggestedSound}</p>
                                        {variation.notes && (
                                            <p className="text-gray-400"><span className="font-medium text-gray-300">💡 Pro Tip:</span> {variation.notes}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ScriptDisplay;
