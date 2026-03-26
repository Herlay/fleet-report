import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Truck, Mail, AlertCircle, Info, RefreshCw, ShieldCheck } from 'lucide-react'; 

const LoginPage = () => {
  const { loginWithRedirect, error } = useAuth0();

  const handleReset = () => {
    window.location.replace(window.location.pathname);
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* LEFT SIDE: Visual Brand/Image Section */}
      <div className="hidden md:flex md:w-1/2 relative bg-slate-900 overflow-hidden">
        {/* Fleet Image Placeholder - Replace URL with your actual fleet image */}
        <img 
          // src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop" 
        src="https://www.efl.africa/assets/01-dxPyjSgB.jpg"
          alt="Fleet Management" 
          className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105 transition-transform duration-10000 hover:scale-100"
        />
        
        {/* Dynamic Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-slate-900/60 to-transparent"></div>
        
        <div className="relative z-10 p-12 flex flex-col justify-between w-full h-full">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/40">
              <Truck size={32} className="text-white" />
            </div>
            <span className="text-2xl font-black text-white tracking-tighter uppercase">WatchTower</span>
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl font-black text-white leading-tight tracking-tight">
              Real-time <span className="text-blue-400">Intelligence Report</span> for your fleet.
            </h2>
            <p className="text-slate-300 text-lg max-w-md font-medium leading-relaxed">
              Analyze performance, optimize routes decisions, and manage allocations with our advanced reporting application.
            </p>
            <div className="flex gap-4 pt-6 text-blue-400">
              
            </div>
          </div>

          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
            © 2026 Virgo Point Capital Limited
          </p>
        </div>
      </div>

      {/* RIGHT SIDE: Login Form Section */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 bg-slate-50 relative overflow-hidden">
        {/* Decorative background glow for mobile */}
        <div className="md:hidden absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="md:hidden absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>

        <div className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-white p-8 sm:p-12 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 relative z-10">
          
          {/* Mobile Header (Hidden on Desktop) */}
          <div className="md:hidden text-center space-y-4">
             <div className="flex justify-center">
                <div className="bg-blue-600 p-4 rounded-2xl shadow-lg">
                    <Truck size={32} className="text-white" />
                </div>
             </div>
             <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">WatchTower</h1>
          </div>

          {/* Desktop Form Title */}
          <div className="hidden md:block space-y-2">
            <h3 className="text-2xl font-black text-slate-800 tracking-tightest uppercase">Authorized Sign-In</h3>
            <p className="text-slate-500 text-sm font-medium">Access your personalized reporting dashboard</p>
          </div>

          {/* Error Message Display */}
          {error && (
            <div className="bg-rose-50 border border-rose-100 rounded-3xl p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-300">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-sm font-black text-rose-900">Security Restriction</p>
                  <p className="text-xs text-rose-700/80 leading-relaxed mt-1">
                    {error.message?.includes("Unauthorized") 
                      ? "System access is limited to @vpc.com.ng accounts only."
                      : "The server could not verify your identity. Reach out to IT support."}
                  </p>
                </div>
              </div>
              <button 
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-wider py-3 rounded-2xl transition-all border border-rose-200 shadow-sm"
              >
                <RefreshCw size={14} />
                Reset & Try Again
              </button>
            </div>
          )}

          {/* Instruction Box */}
          {!error && (
            <div className="group bg-blue-50/50 border border-blue-100/50 rounded-3xl p-5 flex items-start gap-4 transition-all hover:bg-blue-50">
              <div className="bg-white p-2 rounded-xl shadow-sm border border-blue-50 text-blue-600">
                <Info size={18} />
              </div>
              <p className="text-xs text-blue-800 font-medium leading-relaxed">
                First time? Sign in with your company email, then <span className="text-blue-900 font-bold">check your inbox</span> to complete setup.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={() => loginWithRedirect({
                authorizationParams: { prompt: 'login' }
              })}
              className="group w-full bg-slate-900 text-white font-black py-4 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 shadow-xl shadow-slate-900/20 hover:bg-black hover:shadow-black/30 hover:-translate-y-1 disabled:opacity-50 disabled:translate-y-0"
              disabled={!!error} 
            >
              <Mail size={20} className="text-blue-400 group-hover:scale-110 transition-transform" />
              Sign in with Email
            </button>

            <div className="relative flex items-center px-4">
              <div className="flex-grow h-px bg-slate-100"></div>
              <span className="flex-shrink-0 mx-4 text-slate-300 text-[10px] font-black tracking-[0.3em] uppercase">Security Protocol</span>
              <div className="flex-grow h-px bg-slate-100"></div>
            </div>

            <button
              onClick={() => loginWithRedirect({
                authorizationParams: {
                  connection: 'google-oauth2',
                  prompt: 'login' 
                }
              })}
              className="w-full bg-white border-2 border-slate-100 text-slate-700 font-black py-4 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 hover:border-blue-500 hover:text-blue-600 shadow-sm active:scale-95 disabled:opacity-50"
              disabled={!!error} 
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Login/SignUp with your Goggle Account
            </button>
          </div>

          {/* Footer Branding */}
          <div className="pt-8 border-t border-slate-50 flex flex-col items-center gap-2">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
            © 2026 Virgo Point Capital Limited
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;