import React from 'react';
import { User, UserProfile } from '../types';
import { UserCircleIcon, EmailIcon, ArrowLeftIcon, LogoutIcon, CrownIcon } from '../constants';
import { redirectToCustomerPortal } from '../services/subscriptionService';

interface ProfilePageProps {
  user: User;
  profile: UserProfile;
  onSignOut: () => void;
  onBackToApp: () => void;
  onManageSubscription: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ user, profile, onSignOut, onBackToApp, onManageSubscription }) => {

  const handleManageSubscriptionClick = async () => {
    try {
      await redirectToCustomerPortal();
    } catch (error) {
      console.error("Failed to redirect to customer portal", error);
      alert("Could not open the subscription management page. This feature may not be configured yet.");
    }
  };

  const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string | React.ReactNode }> = ({ icon, label, value }) => (
    <div>
      <label className="text-sm font-medium text-gray-400">{label}</label>
      <div className="mt-1 flex items-center gap-3">
        <div className="text-gray-400">{icon}</div>
        <div className="text-gray-200">{value}</div>
      </div>
    </div>
  );

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-2xl">
         <div className="text-center mb-8">
           <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">
                User Profile
            </h1>
          <p className="mt-3 text-lg text-gray-400">
            View and manage your account details.
          </p>
        </div>

        <div className="bg-gray-900/80 backdrop-blur-sm rounded-xl shadow-2xl shadow-purple-900/10 p-8 border border-gray-700/50">
            <div className="space-y-6">
              <InfoRow icon={<UserCircleIcon className="w-6 h-6" />} label="Full Name" value={profile.fullName} />
              <InfoRow icon={<EmailIcon className="w-6 h-6" />} label="Email Address" value={profile.email} />
              <InfoRow 
                icon={<CrownIcon className="w-6 h-6" />} 
                label="Subscription Plan" 
                value={
                  <span className="capitalize font-semibold text-purple-300 bg-purple-900/50 px-3 py-1 rounded-full text-sm">
                    {profile.subscriptionTier} Plan
                  </span>
                } 
              />
              
              <div className="pt-6 border-t border-gray-700/60 flex flex-col gap-4">
                {profile.subscriptionTier === 'free' ? (
                   <button
                        onClick={onManageSubscription} // This now navigates to the pricing page
                        className="w-full flex items-center justify-center px-6 py-3 bg-yellow-500 rounded-lg font-semibold text-black hover:bg-yellow-400 transition-all duration-300"
                    >
                        <CrownIcon className="w-5 h-5 mr-2" />
                        Upgrade to Pro
                    </button>
                ) : (
                    <button
                        onClick={handleManageSubscriptionClick}
                        className="w-full flex items-center justify-center px-6 py-3 bg-indigo-600 rounded-lg font-semibold text-white hover:bg-indigo-500 transition-all duration-300"
                    >
                       Manage Subscription
                    </button>
                )}
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                      onClick={onBackToApp}
                      className="w-full sm:w-auto flex-1 flex items-center justify-center px-6 py-3 bg-gray-600 rounded-lg font-semibold text-white hover:bg-gray-500 transition-all duration-300"
                  >
                      <ArrowLeftIcon className="w-5 h-5 mr-2" />
                      Back to App
                  </button>
                  <button
                      onClick={onSignOut}
                      className="w-full sm:w-auto flex-1 flex items-center justify-center px-6 py-3 bg-red-600 rounded-lg font-semibold text-white hover:bg-red-500 transition-all duration-300"
                  >
                      <LogoutIcon className="w-5 h-5 mr-2" />
                      Sign Out
                  </button>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
