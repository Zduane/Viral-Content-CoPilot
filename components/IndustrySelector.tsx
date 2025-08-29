
import React from 'react';
import { INDUSTRIES } from '../constants';

interface IndustrySelectorProps {
  selectedIndustry: string;
  onSelectIndustry: (industry: string) => void;
}

const IndustrySelector: React.FC<IndustrySelectorProps> = ({ selectedIndustry, onSelectIndustry }) => {
  return (
    <div className="relative w-full flex-grow">
      <select
        value={selectedIndustry}
        onChange={(e) => onSelectIndustry(e.target.value)}
        className="w-full appearance-none bg-gray-700 border border-gray-600 rounded-lg py-3 pl-4 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
      >
        {INDUSTRIES.map((industry) => (
          <option key={industry} value={industry}>
            {industry}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </div>
    </div>
  );
};

export default IndustrySelector;
