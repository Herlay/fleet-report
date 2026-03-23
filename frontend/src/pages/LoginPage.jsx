import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Truck, Mail, AlertCircle, Info, RefreshCw } from 'lucide-react'; 

const LoginPage = () => {
  const { loginWithRedirect, error } = useAuth0();

 
  const handleReset = () => {
    window.location.replace(window.location.pathname);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 sm:p-10 text-center space-y-6">
        
        {/* Logo Section */}
        <div className="flex justify-center">
          <div className="bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-500/30">
            <Truck size={40} className="text-white" />
          </div>
        </div>

        {/* Text Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">WatchTower</h1>
          <p className="text-slate-500 font-medium">WatchTower Report System</p>
        </div>

        {/* 2. Error Message Display with "Try Again" Button */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col gap-4 text-left animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-sm font-bold text-red-800">Access Restricted</p>
                <p className="text-xs text-red-700 leading-relaxed">
                  {error.message?.includes("Unauthorized") 
                    ? "Please use your official @vpc.com.ng email address to continue."
                    : "Authentication failed. Please contact your administrator."}
                </p>
              </div>
            </div>
            
            {/* The Reset Button */}
            <button 
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold py-2.5 rounded-xl transition-colors shadow-sm"
            >
              <RefreshCw size={14} />
              Clear Error & Try Again
            </button>
          </div>
        )}

        {/* 3. The "Instruction" Box */}
        {!error && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3 text-left">
            <Info className="text-blue-600 shrink-0 mt-0.5" size={18} />
            <p className="text-xs text-blue-800 font-medium leading-relaxed">
              New here? Sign in with your company email, then <span className="font-bold">check your inbox</span> for a link to set up your secure password.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-4">
  
          <button
            onClick={() => loginWithRedirect({
              authorizationParams: {
                prompt: 'login' 
              }
            })}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 px-4 rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50"
            disabled={!!error} 
          >
            <Mail size={20} />
            Log in with Email
          </button>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-slate-100"></div>
            <span className="flex-shrink-0 mx-4 text-slate-300 text-[10px] font-black tracking-widest uppercase">or</span>
            <div className="flex-grow border-t border-slate-100"></div>
          </div>

          {/* Google Button */}
          <button
            onClick={() => loginWithRedirect({
              authorizationParams: {
                connection: 'google-oauth2',
                prompt: 'login' 
              }
            })}
            className="w-full bg-white border-2 border-slate-100 hover:border-blue-500 hover:bg-slate-50 text-slate-700 font-bold py-4 px-4 rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
            disabled={!!error} 
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Footer */}
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] pt-6 border-t border-slate-50">
         VPC WatchTower Report System
        </p>
      </div>
    </div>
  );
};

export default LoginPage;