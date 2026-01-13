import { Bars3Icon } from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';

type HeaderProps = {
  toggleSidebar: () => void;
  isMobile: boolean;
};

export default function Header({ toggleSidebar, isMobile }: HeaderProps) {
  const { user } = useAuth();

  const rawCredits = user?.wallet?.credits ? Number(user.wallet.credits) : 0;
  
  const displayCredits = rawCredits.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-gray-800 bg-[#0f1117]/80 backdrop-blur-md sticky top-0 z-10">
      
      {/* Mobile Toggle & Title */}
      <div className="flex items-center gap-4">
        {isMobile && (
          <button 
            onClick={toggleSidebar}
            className="p-2 text-gray-400 hover:text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
        )}
        
        {/* Brand Name */}
        <div className="text-lg md:text-xl font-bold bg-gradient-to-r from-blue-400 to-pink-500 bg-clip-text text-transparent">
           MultiAiModel
        </div>
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        
        {/* Credits Badge */}
        <div className="hidden md:flex items-center gap-2 bg-[#1a1d26] border border-gray-700/50 rounded-full px-4 py-1.5 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="text-xs font-mono text-gray-300">
              {displayCredits} <span className="text-gray-500">credits</span>
            </span>
        </div>
      </div>
    </header>
  );
}