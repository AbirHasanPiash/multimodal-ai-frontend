import { Link, useLocation } from 'react-router-dom';
import { 
  CreditCardIcon, 
  Cog6ToothIcon, 
  XMarkIcon,
  PlusIcon,
  ClockIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  SpeakerWaveIcon,
  PhotoIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import { useChatReset } from '../../context/ChatResetContext';

type SidebarProps = {
  isOpen: boolean;
  toggle: () => void;
  isMobile: boolean;
};

export default function Sidebar({ isOpen, toggle, isMobile }: SidebarProps) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { triggerReset } = useChatReset(); 

  const navItems = [
    { name: 'New AI Chat', path: '/dashboard', icon: PlusIcon },
    { name: 'Chat History', path: '/dashboard/history', icon: ClockIcon },
    { name: 'AI TTS', path: '/dashboard/tts', icon: SpeakerWaveIcon },
    { name: 'AI Images', path: '/dashboard/images', icon: PhotoIcon },
    { name: 'AI Avatar', path: '/dashboard/avatar', icon: UserCircleIcon },
    { name: 'Billing', path: '/dashboard/billing', icon: CreditCardIcon },
    { name: 'Settings', path: '/dashboard/settings', icon: Cog6ToothIcon },
  ];

  const sidebarClasses = isMobile
    ? `fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`
    : `sticky top-0 h-screen transition-all duration-300 ease-in-out border-r border-gray-800 ${
        isOpen ? 'w-64' : 'w-20'
      }`;

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" 
          onClick={toggle}
        />
      )}

      <aside className={`${sidebarClasses} bg-[#090a0e] flex flex-col overflow-hidden`}>
        
        {/* Sidebar Header / Toggle Area */}
        <div className={`h-16 flex items-center border-b border-gray-800 ${isOpen ? 'justify-between px-4' : 'justify-center'}`}>
          {(isOpen || isMobile) && (
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-pink-500 bg-clip-text text-transparent truncate">
              M
            </span>
          )}
          
          <button 
            onClick={toggle} 
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-colors"
          >
            {isMobile ? (
              <XMarkIcon className="w-6 h-6" />
            ) : (
              isOpen ? <ChevronDoubleLeftIcon className="w-5 h-5" /> : <ChevronDoubleRightIcon className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.name === 'New Chat' && pathname === '/dashboard');
            
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => {
                  // Close mobile menu
                  if (isMobile) toggle();
                  
                  // Trigger chat reset on New Chat
                  if (item.name === 'New Chat') {
                    triggerReset();
                  }
                }}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all group ${
                  isActive 
                    ? 'bg-gray-800 text-white shadow-md' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
                } ${!isOpen && !isMobile ? 'justify-center' : ''}`}
                title={!isOpen ? item.name : ''}
              >
                <item.icon className={`w-6 h-6 ${isActive ? 'text-blue-400' : 'group-hover:text-blue-400'} transition-colors`} />
                
                {isOpen && (
                  <span className="text-sm font-medium whitespace-nowrap animate-in fade-in duration-300">
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer / User Profile */}
        <div className="p-4 border-t border-gray-800">
          <div className={`flex items-center gap-3 ${!isOpen && !isMobile ? 'justify-center' : ''}`}>
            <div className="w-9 h-9 min-w-[2.25rem] rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-sm font-bold shadow-lg">
              {user?.email?.[0].toUpperCase()}
            </div>
            
            {isOpen && (
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                <button 
                  onClick={logout}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1 mt-0.5"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}