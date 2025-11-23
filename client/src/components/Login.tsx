import React from 'react';
import { BACKEND_URL, EVENT_NAME, EVENT_YEAR, BACK_LINK } from '../config/config';

const Login: React.FC = () => {
  const handleLogin = () => {
    window.location.href = `${BACKEND_URL}/auth/login`;
  };

  const handleBackToFestLink = () => {
    window.location.href = BACK_LINK;
  };

  return (
    <div
      className="min-h-screen text-white relative overflow-hidden font-orbitron"
      style={{
        fontFamily: "'Orbitron', sans-serif",
        background: 'linear-gradient(135deg, #0f021f 0%, #180036 100%)',
      }}
    >
      {/* Soft glowing background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-600/20 blur-3xl rounded-full"></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-cyan-500/15 blur-3xl rounded-full"></div>
      </div>

      {/* Cyber Grid Overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(255,0,255,0.08) 1px, transparent 1px),
            linear-gradient(rgba(0,255,255,0.08) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      ></div>

      {/* Back Button */}
      <button
        onClick={handleBackToFestLink}
        className="absolute top-4 left-4 z-20 border border-purple-400 text-purple-300 hover:bg-purple-600/30 rounded-lg px-3 py-1.5 text-xs sm:text-sm uppercase tracking-wider transition-transform duration-300 hover:scale-105"
      >
        ← Back
      </button>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <div className="text-center w-full max-w-md sm:max-w-lg">
          {/* Logos Section */}
          <div className="flex items-center justify-center gap-8 mb-8">
            <img 
              src="/images/iiitb-logo.png" 
              alt="IIITB Logo"
              className="h-16 sm:h-20 w-auto object-contain drop-shadow-[0_0_20px_rgba(100,200,255,0.4)] hover:drop-shadow-[0_0_30px_rgba(100,200,255,0.6)] transition-all duration-300"
            />
            <div className="h-12 sm:h-16 w-px bg-gradient-to-b from-transparent via-cyan-400 to-transparent"></div>
            <img 
              src="/images/logo.png" 
              alt="Event Logo"
              className="h-8 sm:h-12 w-auto object-contain drop-shadow-[0_0_20px_rgba(200,100,255,0.4)] hover:drop-shadow-[0_0_30px_rgba(200,100,255,0.6)] transition-all duration-300"
              style={{ imageRendering: 'crisp-edges', filter: 'contrast(1.1) brightness(1.05)' }}
            />
          </div>

          {/* Title */}
          <div className="mb-12">
            <h1 className="text-4xl sm:text-6xl font-extrabold mb-3 tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500 drop-shadow-[0_0_12px_rgba(200,100,255,0.4)]">
              {EVENT_NAME?.toUpperCase()}
            </h1>
            <h2 className="text-2xl sm:text-4xl text-cyan-300 mb-4 tracking-wide drop-shadow-[0_0_10px_rgba(0,255,255,0.3)]">
              {EVENT_YEAR}
            </h2>
            <p className="text-gray-300 text-sm sm:text-base uppercase tracking-widest">
              Loyalty Programme Management System
            </p>
          </div>

          {/* Login Box */}
          <div className="bg-[#1b0730]/80 backdrop-blur-lg border border-purple-500/30 rounded-xl shadow-lg p-6 sm:p-8 mx-auto">
            <h3 className="text-base sm:text-lg font-bold text-purple-300 uppercase tracking-widest mb-2">
              Secure Access Required
            </h3>
            <p className="text-gray-400 text-xs sm:text-sm mb-6 tracking-wide">
              Authenticate with your Microsoft account to continue
            </p>

            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 border border-cyan-400 text-cyan-300 hover:bg-cyan-400/20 hover:text-white font-semibold py-3 rounded-lg transition-all duration-300 uppercase tracking-widest text-sm sm:text-base"
            >
              <img 
                src="/images/microsoft_logo.png" 
                alt="Microsoft Logo"
                className="w-6 h-6 object-contain group-hover:animate-pulse" 
              />
              <span>Sign in with Microsoft</span>
            </button>
          </div>
        </div>
      </div>

      {/* Corner highlights */}
      <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-cyan-400"></div>
      <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-pink-400"></div>
      <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-purple-400"></div>
      <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-cyan-400"></div>
    </div>
  );
};

export default Login;
