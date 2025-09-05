
import React from 'react';
import { AnalysisResult } from '../types';
import { TrendIcon, CharacteristicsIcon, PersonaIcon, FireIcon, LinkIcon, DollarIcon, HookIcon, LightbulbIcon, MegaphoneIcon, SearchIcon } from '../constants';

interface AnalysisDisplayProps {
  analysis: AnalysisResult;
  onRetryImage: (productIndex: number) => void;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ analysis, onRetryImage }) => {
    
    const SectionCard: React.FC<{title: string, icon: React.ReactNode, children: React.ReactNode}> = ({title, icon, children}) => (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/60 shadow-lg backdrop-blur-sm transition-all duration-300 hover:border-purple-500/50">
            <div className="flex items-center mb-4">
                <div className="bg-gray-700/50 p-2 rounded-full mr-3 text-purple-400">
                    {icon}
                </div>
                <h3 className="text-xl font-bold text-gray-100">{title}</h3>
            </div>
            {children}
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in">
             {analysis.topSellingProducts && analysis.topSellingProducts.length > 0 && (
                <SectionCard title="Top Selling Products" icon={<DollarIcon className="w-6 h-6"/>}>
                    <div className="space-y-6">
                        {analysis.topSellingProducts.map((product, index) => (
                             <div key={index} className="flex flex-col sm:flex-row items-start gap-6 bg-gray-900/50 p-4 rounded-lg border border-gray-700/80">
                                <div className="w-full sm:w-48 flex-shrink-0 bg-gray-700 rounded-lg flex items-center justify-center aspect-square text-center">
                                    {product.imageUrl ? (
                                        <img src={product.imageUrl} alt={product.productName} className="w-full h-full object-cover aspect-square rounded-lg" />
                                    ) : product.isGeneratingImage ? (
                                        <div className="w-full h-full bg-gray-700 rounded-lg flex flex-col items-center justify-center p-2">
                                            <svg className="animate-spin h-6 w-6 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <p className="text-xs text-gray-400 mt-2">Generating...</p>
                                        </div>
                                    ) : product.imageError ? (
                                        <div className="w-full h-full bg-red-900/30 rounded-lg flex flex-col items-center justify-center p-2 border border-red-700">
                                            <p className="text-sm text-red-300 font-semibold">Error</p>
                                            <p className="text-xs text-red-400 mt-1 text-center">
                                                {product.imageError.includes('safety filters') 
                                                    ? 'Blocked by safety filters.' 
                                                    : 'Generation failed.'}
                                            </p>
                                            <button 
                                                onClick={() => onRetryImage(index)}
                                                className="mt-2 text-xs bg-red-600 hover:bg-red-500 text-white font-bold py-1 px-2 rounded"
                                            >
                                                Retry
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-full h-full bg-gray-700 rounded-lg flex items-center justify-center p-2 text-xs text-gray-500">
                                            Image not available
                                        </div>
                                    )}
                                </div>
                                <div className="flex-grow">
                                    <p className="text-sm font-medium text-gray-400">{product.brandName}</p>
                                    {product.url ? (
                                        <a 
                                            href={product.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="font-semibold text-purple-300 hover:underline inline-flex items-center group text-base"
                                        >
                                            {product.productName}
                                            <LinkIcon className="w-4 h-4 ml-1.5 text-gray-500 group-hover:text-purple-400 transition-colors" />
                                        </a>
                                    ) : (
                                        <h4 className="font-semibold text-purple-300 text-base">{product.productName}</h4>
                                    )}
                                    <p className="text-gray-400 mt-1 text-sm">{product.description}</p>
                                    
                                    <div className="mt-3 pt-3 border-t border-gray-700/50 space-y-3">
                                        <div className="flex items-start text-sm">
                                            <LightbulbIcon className="w-5 h-5 mr-2 text-yellow-400 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <span className="font-semibold text-gray-300">Problem Solved:</span>
                                                <p className="text-gray-400">{product.problemSolved}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start text-sm">
                                            <MegaphoneIcon className="w-5 h-5 mr-2 text-cyan-400 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <span className="font-semibold text-gray-300">Ad Creative Success:</span>
                                                <p className="text-gray-400">{product.successfulAdCreative}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start text-sm">
                                            <PersonaIcon className="w-5 h-5 mr-2 text-green-400 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <span className="font-semibold text-gray-300">Ideal Customer:</span>
                                                <p className="text-gray-400">{product.idealCustomer}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start text-sm">
                                            <PersonaIcon className="w-5 h-5 mr-2 text-teal-400 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <span className="font-semibold text-gray-300">Ideal Influencer:</span>
                                                <p className="text-gray-400">{product.idealInfluencer}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>
             )}

             <SectionCard title="Trending Products & Topics" icon={<FireIcon className="w-6 h-6"/>}>
                <div className="space-y-4">
                    {analysis.trendingTopics.map((topic, index) => (
                        <div key={index} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/80">
                            <h4 className="font-semibold text-purple-300">{topic.name}</h4>
                            <p className="text-gray-400 mt-1">{topic.reason}</p>
                        </div>
                    ))}
                </div>
            </SectionCard>

            {analysis.topKeywords && analysis.topKeywords.length > 0 && (
                <SectionCard title="Top Searched Keywords" icon={<SearchIcon className="w-6 h-6"/>}>
                    <div className="flex flex-wrap gap-3">
                        {analysis.topKeywords.map((keyword, index) => (
                            <div key={index} className="bg-gradient-to-r from-gray-800 to-gray-700/80 text-gray-300 text-sm font-medium px-4 py-2 rounded-full border border-gray-600/50 shadow-sm hover:border-gray-500 transition-colors">
                                {keyword}
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <SectionCard title="Key Trends" icon={<TrendIcon className="w-6 h-6"/>}>
                     <div className="flex flex-wrap gap-3">
                        {analysis.trends.map((trend, index) => (
                            <div key={index} className="bg-gradient-to-r from-gray-800 to-gray-700/80 text-gray-300 text-sm font-medium px-4 py-2 rounded-full border border-gray-600/50 shadow-sm hover:border-gray-500 transition-colors">
                                {trend}
                            </div>
                        ))}
                    </div>
                </SectionCard>
                
                <SectionCard title="Common Characteristics" icon={<CharacteristicsIcon className="w-6 h-6"/>}>
                    <div className="flex flex-wrap gap-3">
                        {analysis.characteristics.map((char, index) => (
                            <div key={index} className="bg-gradient-to-r from-gray-800 to-gray-700/80 text-gray-300 text-sm font-medium px-4 py-2 rounded-full border border-gray-600/50 shadow-sm hover:border-gray-500 transition-colors">
                                {char}
                            </div>
                        ))}
                    </div>
                </SectionCard>
            </div>


             {analysis.viralHooks && analysis.viralHooks.length > 0 && (
                 <SectionCard title="Common Opening Hooks" icon={<HookIcon className="w-6 h-6"/>}>
                    <div className="space-y-4">
                        {analysis.viralHooks.map((hook, index) => (
                            <div key={index} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/80">
                                <h4 className="font-semibold text-purple-300">{hook.type}</h4>
                                <p className="text-gray-400 mt-1">{hook.description}</p>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}

            <SectionCard title="Viral Personas" icon={<PersonaIcon className="w-6 h-6"/>}>
                <div className="space-y-4">
                    {analysis.personas.map((persona, index) => (
                        <div key={index} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/80">
                            <h4 className="font-semibold text-purple-300">{persona.name}</h4>
                            <p className="text-gray-400 mt-1">{persona.description}</p>
                        </div>
                    ))}
                </div>
            </SectionCard>

            {analysis.sources && analysis.sources.length > 0 && (
                 <SectionCard title="Sources" icon={<LinkIcon className="w-6 h-6"/>}>
                    <ul className="space-y-2">
                        {analysis.sources.map((source, index) => (
                            <li key={index}>
                                <a 
                                    href={source.uri} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors text-sm"
                                >
                                    {source.title}
                                </a>
                            </li>
                        ))}
                    </ul>
                </SectionCard>
            )}
        </div>
    );
};

export default AnalysisDisplay;
