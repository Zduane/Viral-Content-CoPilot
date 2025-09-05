import React, { useState, useEffect } from 'react';
import { User, UserProfile } from '../types';
import { getUserProfile } from '../services/userService';
import { UserCircleIcon, EmailIcon, ArrowLeftIcon, LogoutIcon } from '../constants';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

interface ProfilePageProps {
  user: User;
  onSignOut: () => void;
  onBackToApp: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ user, onSignOut, onBackToApp }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userProfile = await getUserProfile(user.uid);
        if (userProfile) {
          setProfile(userProfile);
        } else {
          setError("Could not find user profile data.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch profile.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user.uid]);

  const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
    <div>
      <label className="text-sm font-medium text-gray-400">{label}</label>
      <div className="mt-1 flex items-center gap-3">
        <div className="text-gray-400">{icon}</div>
        <p className="text-gray-200">{value}</p>
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
            View your account details below.
          </p>
        </div>

        <div className="bg-gray-900/80 backdrop-blur-sm rounded-xl shadow-2xl shadow-purple-900/10 p-8 border border-gray-700/50">
          {isLoading ? (
            <LoadingSpinner />
          ) : error ? (
            <ErrorMessage message={error} />
          ) : profile ? (
            <div className="space-y-6">
              <InfoRow icon={<UserCircleIcon className="w-6 h-6" />} label="Full Name" value={profile.fullName} />
              <InfoRow icon={<EmailIcon className="w-6 h-6" />} label="Email Address" value={profile.email} />
              <div className="pt-6 border-t border-gray-700/60 flex flex-col sm:flex-row gap-4">
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
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;