import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Truck, Mail, AlertCircle, Info, RefreshCw, ArrowRight } from 'lucide-react'; 

const LoginPage = () => {
  const { loginWithRedirect, error } = useAuth0();

  const handleReset = () => {
    window.location.replace(window.location.pathname);
  };

  return (
    <div className="min-h-screen w-full flex font-sans selection:bg-indigo-100 selection:text-indigo-900 bg-white">
      
      {/* LEFT SIDE: Brand/Hero Section (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 flex-col justify-between p-12 overflow-hidden">
        
        {/* Subtle Background Image */}
        <img 
          src="https://www.efl.africa/assets/01-dxPyjSgB.jpg"
          alt="Fleet Operations Image" 
          className="absolute inset-0 w-full h-full object-cover opacity-100 mix-blend-overlay pointer-events-none"
        />
        
        {/* Top: Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="bg-indigo-600 p-1.5 rounded flex items-center justify-center">
            <Truck size={20} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">WatchTower</span>
        </div>

        {/* Middle: Value Prop */}
        <div className="relative z-10 space-y-6 max-w-lg">
          <h2 className="text-4xl font-bold text-white leading-[1.1] tracking-tight">
            Real-time operational intelligence for enterprise fleets.
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed font-medium">
            Monitor asset utilization, analyze financial margins, and manage fleet capacities through a single, secure centralized dashboard.
          </p>
        </div>

        {/* Bottom: Copyright */}
        <div className="relative z-10">
          <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest">
            © {new Date().getFullYear()} Virgo Point Capital Limited
          </p>
        </div>
      </div>

      {/* RIGHT SIDE: Auth Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative">
        <div className="w-full max-w-[380px] space-y-8 animate-in fade-in duration-500">
          
          {/* Mobile Header (Shows only on small screens) */}
          <div className="lg:hidden flex flex-col items-center sm:items-start space-y-4 mb-8">
            <div className="flex items-center gap-2.5">
              <div className="bg-indigo-600 p-1.5 rounded flex items-center justify-center">
                <Truck size={20} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">Fleet Report System</span>
            </div>
          </div>

          {/* Form Header */}
          <div className="space-y-2 text-center sm:text-left">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sign in to your account</h1>
            <p className="text-sm text-slate-500 font-medium">Choose one of the sign-in options to access the portal.</p>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={16} />
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-red-900 uppercase tracking-wide">Authentication Failed</h3>
                  <p className="text-[13px] text-red-800 leading-relaxed">
                    {error.message?.includes("Unauthorized") 
                      ? "Access is strictly limited to authorized corporate accounts."
                      : "The server could not verify your identity. Please contact the system administrator."}
                  </p>
                </div>
              </div>
              <button 
                onClick={handleReset}
                className="flex items-center justify-center gap-2 bg-white hover:bg-red-50 text-red-700 text-xs font-bold py-2 rounded border border-red-200 transition-colors w-full mt-1"
              >
                <RefreshCw size={14} />
                Clear Session & Retry
              </button>
            </div>
          )}

          {/* Info State */}
          {!error && (
            <div className="bg-slate-50 border border-slate-200 rounded-md p-4 flex items-start gap-3">
              <Info className="text-indigo-600 shrink-0 mt-0.5" size={16} />
              <p className="text-[13px] text-red-600 leading-relaxed font-medium">
                New here? Sign in with your email, then verify the link sent to your inbox.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-4 pt-2">
            <button
              onClick={() => loginWithRedirect({ authorizationParams: { prompt: 'login' } })}
              disabled={!!error}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white text-[13px] font-semibold py-3 px-4 rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <Mail size={16} className="text-slate-400 group-hover:text-white transition-colors" />
              Continue with Email
              <ArrowRight size={14} className="ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200"></div>
              <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-400">Or</span>
              <div className="flex-1 h-px bg-slate-200"></div>
            </div>

            <button
              onClick={() => loginWithRedirect({
                authorizationParams: { connection: 'google-oauth2', prompt: 'login' }
              })}
              disabled={!!error}
              className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[13px] font-semibold py-3 px-4 rounded-md transition-colors flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
          </div>
          
          {/* Mobile Footer */}
          <div className="lg:hidden pt-8 text-center">
            <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-widest">
              © {new Date().getFullYear()} Virgo Point Capital
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;