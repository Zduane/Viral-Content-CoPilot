import React, { useState, useMemo } from 'react';
import { UserCircleIcon, EmailIcon, LockIcon, GoogleIcon, CheckCircleIcon, XCircleIcon } from '../constants';
import { signUpWithEmail, signInWithGoogle } from '../services/authService';
import { createUserProfileDocument } from '../services/userService';

interface SignUpPageProps {
  onSwitchToLogin: () => void;
}

const PasswordStrengthIndicator: React.FC<{ strength: number }> = ({ strength }) => {
    const strengthLevels = [
        { label: 'Weak', color: 'bg-red-500', width: 'w-1/3' },
        { label: 'Medium', color: 'bg-yellow-500', width: 'w-2/3' },
        { label: 'Strong', color: 'bg-green-500', width: 'w-full' },
    ];
    const currentLevel = strengthLevels[strength];

    return (
        <div className="mt-2">
            <div className="flex justify-between items-center mb-1">
                <p className="text-xs font-medium text-gray-300">Password Strength</p>
                <p className={`text-xs font-bold ${strength === 0 ? 'text-red-400' : strength === 1 ? 'text-yellow-400' : 'text-green-400'}`}>{currentLevel.label}</p>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${currentLevel.color} ${currentLevel.width} transition-all duration-300`}></div>
            </div>
        </div>
    );
};


const SignUpPage: React.FC<SignUpPageProps> = ({ onSwitchToLogin }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [touchedFields, setTouchedFields] = useState<{ [key: string]: boolean }>({});

  const handleBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
  };
  
  const passwordStrength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/\d/.test(password) && /[a-zA-Z]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password) && password.length > 8) score++;
    return Math.min(score, 2); // Cap at 2 (Strong)
  }, [password]);

  const isFullNameValid = useMemo(() => fullName.trim().length > 0, [fullName]);
  const isEmailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), [email]);
  const isPasswordValid = useMemo(() => password.length >= 8, [password]);
  const doPasswordsMatch = useMemo(() => password === confirmPassword && password.length > 0, [password, confirmPassword]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouchedFields({
      fullName: true,
      email: true,
      password: true,
      confirmPassword: true,
    });
    
    if (!isFullNameValid || !isEmailValid || !isPasswordValid || !doPasswordsMatch) {
       setError('Please correct the errors before submitting.');
       return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const userCredential = await signUpWithEmail(email, password);
      if (userCredential.user) {
        await createUserProfileDocument(userCredential.user, { fullName });
      }
      // Success will be handled by the onAuthStateChanged listener in App.tsx
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const ValidationIcon: React.FC<{isValid: boolean, isTouched: boolean}> = ({ isValid, isTouched }) => {
    if (!isTouched) return null;
    return isValid 
      ? <CheckCircleIcon className="h-5 w-5 text-green-500" />
      : <XCircleIcon className="h-5 w-5 text-red-500" />;
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    setIsLoading(true);
    try {
      // This will now trigger a page redirect. Profile creation is handled
      // by the onAuthStateChanged listener in App.tsx after the redirect.
      await signInWithGoogle();
    } catch (err) {
      // This catch block will only execute if signInWithRedirect itself throws an error before redirecting.
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
           <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">
                Create an Account
            </h1>
          <p className="mt-3 text-lg text-gray-400">
            Join the Viral Content Co-pilot today.
          </p>
        </div>

        <div className="bg-gray-900/80 backdrop-blur-sm rounded-xl shadow-2xl shadow-purple-900/10 p-8 border border-gray-700/50">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-300">
                Full Name
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                  <UserCircleIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onBlur={() => handleBlur('fullName')}
                  className="w-full appearance-none bg-gray-700/80 border border-gray-600 rounded-lg py-2.5 pl-10 pr-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  placeholder="Jane Doe"
                  required
                  autoComplete="name"
                />
                 <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <ValidationIcon isValid={isFullNameValid} isTouched={!!touchedFields.fullName} />
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="email-signup" className="block text-sm font-medium text-gray-300">
                Email address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                  <EmailIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  id="email-signup"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                   onBlur={() => handleBlur('email')}
                  className="w-full appearance-none bg-gray-700/80 border border-gray-600 rounded-lg py-2.5 pl-10 pr-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
                 <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <ValidationIcon isValid={isEmailValid} isTouched={!!touchedFields.email} />
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="password-signup"  className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                 <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                  <LockIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  id="password-signup"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => handleBlur('password')}
                  className="w-full appearance-none bg-gray-700/80 border border-gray-600 rounded-lg py-2.5 pl-10 pr-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <ValidationIcon isValid={isPasswordValid} isTouched={!!touchedFields.password} />
                </div>
              </div>
              {touchedFields.password && <PasswordStrengthIndicator strength={passwordStrength} />}
            </div>
             <div>
              <label htmlFor="confirm-password"  className="block text-sm font-medium text-gray-300">
                Confirm Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                 <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                  <LockIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  id="confirm-password"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => handleBlur('confirmPassword')}
                  className="w-full appearance-none bg-gray-700/80 border border-gray-600 rounded-lg py-2.5 pl-10 pr-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
                 <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <ValidationIcon isValid={doPasswordsMatch} isTouched={!!touchedFields.confirmPassword} />
                </div>
              </div>
            </div>


            {error && <p className="text-sm text-red-400 text-center">{error}</p>}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center px-6 py-3 bg-indigo-600 rounded-lg font-semibold text-white hover:bg-indigo-500 transition-all duration-300 disabled:bg-indigo-800 disabled:cursor-not-allowed transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-900 text-gray-400">Or sign up with</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={isLoading}
                className="w-full inline-flex justify-center py-2.5 px-4 border border-gray-600 rounded-md shadow-sm bg-gray-800 text-sm font-medium text-gray-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 transition-colors"
              >
                <span className="sr-only">Sign up with Google</span>
                <GoogleIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-semibold text-indigo-400 hover:text-indigo-300 bg-transparent border-none p-0 cursor-pointer focus:outline-none focus-visible:underline"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};

export default SignUpPage;