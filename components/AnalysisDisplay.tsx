
import React from 'react';
import { AnalysisResult } from '../types';
import { TrendIcon, CharacteristicsIcon, PersonaIcon } from '../constants';

interface AnalysisDisplayProps {
  analysis: AnalysisResult;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ analysis }) => {
    
    const SectionCard: React.FC<{title: string, icon: React.ReactNode, children: React.ReactNode}> = ({title, icon, children}) => (
        <div className="bg-gray-800/70 rounded-xl p-6 border border-gray-700 shadow-lg backdrop-blur-sm transform transition-transform duration-300 hover:scale-[1.02] hover:border-purple-500/50">
            <div className="flex items-center mb-4">
                <div className="bg-gray-700 p-2 rounded-full mr-3 text-purple-400">
                    {icon}
                </div>
                <h3 className="text-xl font-bold text-gray-100">{title}</h3>
            </div>
            {children}
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in">
            <SectionCard title="Key Trends" icon={<TrendIcon className="w-6 h-6"/>}>
                 <ul className="space-y-3 list-inside">
                    {analysis.trends.map((trend, index) => (
                        <li key={index} className="flex items-start text-gray-300">
                            <span className="text-purple-400 mr-3 mt-1">&#8227;</span>
                            <span>{trend}</span>
                        </li>
                    ))}
                </ul>
            </SectionCard>
            
            <SectionCard title="Common Characteristics" icon={<CharacteristicsIcon className="w-6 h-6"/>}>
                <ul className="space-y-3 list-inside">
                    {analysis.characteristics.map((char, index) => (
                        <li key={index} className="flex items-start text-gray-300">
                             <span className="text-purple-400 mr-3 mt-1">&#8227;</span>
                            <span>{char}</span>
                        </li>
                    ))}
                </ul>
            </SectionCard>

            <SectionCard title="Viral Personas" icon={<PersonaIcon className="w-6 h-6"/>}>
                <div className="space-y-4">
                    {analysis.personas.map((persona, index) => (
                        <div key={index} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                            <h4 className="font-semibold text-purple-300">{persona.name}</h4>
                            <p className="text-gray-400 mt-1">{persona.description}</p>
                        </div>
                    ))}
                </div>
            </SectionCard>
        </div>
    );
};

export default AnalysisDisplay;
