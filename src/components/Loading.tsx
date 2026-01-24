const Loading = () => {
  return (
    <div className="flex h-screen items-center justify-center bg-[#0f1117] text-white overflow-hidden">
      <div className="relative flex flex-col items-center">
        {/* Animated Background Rings */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute h-32 w-32 sm:h-40 sm:w-40 md:h-48 md:w-48 rounded-full border border-indigo-500/20 animate-ping" 
               style={{ animationDuration: '3s' }} />
          <div className="absolute h-40 w-40 sm:h-48 sm:w-48 md:h-56 md:w-56 rounded-full border border-purple-500/20 animate-ping" 
               style={{ animationDuration: '4s', animationDelay: '0.5s' }} />
        </div>

        {/* Main Loading Animation */}
        <div className="relative z-10">
          {/* Outer Rotating Ring with Gradient */}
          <div className="relative h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28">
            {/* Gradient Ring */}
            <svg className="absolute inset-0 -rotate-90 animate-spin" style={{ animationDuration: '2s' }}>
              <circle
                cx="50%"
                cy="50%"
                r="35%"
                fill="none"
                stroke="url(#gradient1)"
                strokeWidth="3"
                strokeDasharray="70 30"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="50%" stopColor="#c084fc" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </svg>

            {/* Counter Rotating Ring */}
            <svg className="absolute inset-0 rotate-90 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }}>
              <circle
                cx="50%"
                cy="50%"
                r="42%"
                fill="none"
                stroke="url(#gradient2)"
                strokeWidth="2"
                strokeDasharray="40 60"
                strokeLinecap="round"
                opacity="0.6"
              />
              <defs>
                <linearGradient id="gradient2" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>

            {/* Center Glow */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-full bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 animate-pulse" 
                   style={{ animationDuration: '2s' }}>
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 blur-xl opacity-70" />
              </div>
            </div>

            {/* Orbiting Particles */}
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s' }}>
              <div className="absolute top-0 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />
            </div>
            
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3.5s', animationDirection: 'reverse' }}>
              <div className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 rounded-full bg-pink-400 shadow-lg shadow-pink-400/50" />
            </div>

            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '5s' }}>
              <div className="absolute top-1/2 right-0 h-1.5 w-1.5 translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-400 shadow-lg shadow-purple-400/50" />
            </div>

            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4.5s', animationDirection: 'reverse' }}>
              <div className="absolute top-1/2 left-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400 shadow-lg shadow-indigo-400/50" />
            </div>
          </div>
        </div>

        {/* Animated Loading Text */}
        <div className="mt-8 sm:mt-10 md:mt-12 flex flex-col items-center space-y-3">
          <div className="flex space-x-1">
            {['L', 'O', 'A', 'D', 'I', 'N', 'G'].map((letter, index) => (
              <span
                key={index}
                className="text-sm sm:text-base md:text-lg font-semibold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 animate-pulse"
                style={{
                  animationDelay: `${index * 0.1}s`,
                  animationDuration: '1.5s'
                }}
              >
                {letter}
              </span>
            ))}
          </div>
          
          {/* Progress Dots */}
          <div className="flex space-x-2">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 animate-bounce"
                style={{
                  animationDelay: `${index * 0.15}s`,
                  animationDuration: '1s'
                }}
              />
            ))}
          </div>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm text-gray-500 tracking-wide animate-pulse px-4 text-center">
            Preparing your experience
          </p>
        </div>

        {/* Bottom Glow Effect */}
        <div className="absolute -bottom-10 sm:-bottom-12 md:-bottom-16 left-1/2 -translate-x-1/2 h-16 sm:h-20 md:h-24 w-32 sm:w-40 md:w-48 bg-gradient-to-t from-indigo-500/20 to-transparent blur-2xl rounded-full" />
      </div>
    </div>
  );
};

export default Loading;