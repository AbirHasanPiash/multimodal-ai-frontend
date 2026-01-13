const Loading = () => {
  return (
    <div className="flex h-screen items-center justify-center bg-[#0f1117] text-white">
      <div className="relative flex flex-col items-center">
        {/* Rotating Wrapper */}
        <div className="relative h-16 w-16 animate-loader-rotate">
          {/* Glow */}
          <div className="absolute inset-0 rounded-full bg-indigo-500 blur-xl opacity-60 animate-pulse" />

          {/* Core */}
          <div className="absolute inset-2 rounded-full bg-indigo-400" />

          {/* Orbiting dots */}
          <div className="absolute inset-0 animate-spin-slow">
            <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-cyan-400" />
          </div>

          <div className="absolute inset-0 animate-spin-reverse">
            <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-pink-400" />
          </div>
        </div>

        {/* Text */}
        <p className="mt-6 text-sm tracking-widest text-gray-400 animate-fade">
          LOADING
        </p>
      </div>
    </div>
  );
};

export default Loading;
