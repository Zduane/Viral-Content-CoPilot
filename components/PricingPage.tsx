import React, { useState } from 'react';
import { User } from '../types';
import { ArrowLeftIcon, CheckCircleIcon, CrownIcon } from '../constants';
import { createCheckoutSession } from '../services/subscriptionService';

interface PricingPageProps {
  user: User;
  onBackToApp: () => void;
}

const pricingTiers = [
  {
    name: 'Free',
    priceId: 'free_tier',
    price: '$0',
    frequency: '/ month',
    description: 'For individuals starting out and exploring the platform.',
    features: [
      '5 Trend Analyses',
      '5 Script Generations',
      '3 Influencer Personas',
      '1 Custom Voice Design',
      '2 Video Renders (720p)',
      'Videos with Watermark',
    ],
    cta: 'Current Plan',
    isCurrent: true,
  },
  {
    name: 'Pro',
    priceId: 'price_pro_monthly', // Example Stripe Price ID
    price: '$49',
    frequency: '/ month',
    description: 'For creators and marketers who need more power and speed.',
    features: [
      '100 Trend Analyses',
      '100 Script Generations',
      '50 Influencer Personas',
      '10 Custom Voice Designs',
      '25 Video Renders per month',
      'Up to 4K Resolution',
      '60 FPS Frame Rate',
      'No Watermarks',
      'Priority Support',
    ],
    cta: 'Choose Pro',
    isCurrent: false,
    isPopular: true,
  },
  {
    name: 'Business',
    priceId: 'price_business_monthly', // Example Stripe Price ID
    price: '$129',
    frequency: '/ month',
    description: 'For agencies and teams requiring collaboration and scale.',
    features: [
      'Unlimited Trend Analyses',
      'Unlimited Script Generations',
      'Unlimited Influencer Personas',
      'Unlimited Custom Voice Designs',
      'Unlimited Video Renders',
      'Team Collaboration (soon)',
      'API Access (soon)',
      'Dedicated Support',
    ],
    cta: 'Choose Business',
    isCurrent: false,
  },
];

const PricingPage: React.FC<PricingPageProps> = ({ user, onBackToApp }) => {
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleChoosePlan = async (priceId: string) => {
        if (priceId === 'free_tier') return;
        setIsLoading(priceId);
        setError(null);
        try {
            await createCheckoutSession(priceId);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(null);
        }
    };


  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">
            Find the Perfect Plan
          </h1>
          <p className="mt-3 text-lg text-gray-400 max-w-2xl mx-auto">
            Unlock more features and scale your content creation with our Pro and Business plans.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pricingTiers.map((tier) => (
            <div
              key={tier.name}
              className={`bg-gray-900/80 backdrop-blur-sm rounded-xl shadow-2xl p-8 border transition-all duration-300 relative flex flex-col
                ${tier.isPopular ? 'border-purple-500 shadow-purple-900/20' : 'border-gray-700/50'}`}
            >
              {tier.isPopular && (
                <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                    <span className="bg-purple-600 text-white text-xs font-bold px-4 py-1 rounded-full uppercase">Most Popular</span>
                </div>
              )}
              <h3 className="text-2xl font-bold text-white">{tier.name}</h3>
              <p className="mt-4 text-gray-400 text-sm flex-grow">{tier.description}</p>
              
              <div className="mt-6">
                <span className="text-5xl font-extrabold text-white">{tier.price}</span>
                <span className="text-lg font-medium text-gray-400">{tier.frequency}</span>
              </div>

              <ul className="mt-8 space-y-4 text-sm text-gray-300">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircleIcon className="w-5 h-5 text-green-400 mr-3 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-8">
                 <button
                    onClick={() => handleChoosePlan(tier.priceId)}
                    disabled={tier.isCurrent || isLoading === tier.priceId}
                    className={`w-full py-3 px-6 font-semibold rounded-lg transition-all duration-300 transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900
                        ${tier.isCurrent 
                            ? 'bg-gray-700 text-gray-400 cursor-default' 
                            : tier.isPopular 
                                ? 'bg-purple-600 text-white hover:bg-purple-500 hover:scale-105 focus:ring-purple-500'
                                : 'bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-105 focus:ring-indigo-500'
                        }
                        ${isLoading === tier.priceId ? 'opacity-70 cursor-wait' : ''}
                    `}
                 >
                    {isLoading === tier.priceId ? 'Redirecting...' : tier.cta}
                 </button>
              </div>
            </div>
          ))}
        </div>
        
        {error && <p className="text-center text-red-400 mt-6">{error}</p>}
        
        <div className="text-center mt-12">
            <button
                onClick={onBackToApp}
                className="inline-flex items-center text-indigo-400 hover:text-indigo-300 transition-colors group"
            >
                <ArrowLeftIcon className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
                Back to the App
            </button>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;