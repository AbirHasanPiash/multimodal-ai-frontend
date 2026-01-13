import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Dashboard/Sidebar';
import Header from '../components/Dashboard/Header';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Handle Resize Logic
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      // Automatically close sidebar on mobile, open on desktop init
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex h-screen bg-[#0f1117] text-gray-100 overflow-hidden font-sans">
      {/* Sidebar (Handles its own responsive widths/transforms) */}
      <Sidebar 
        isOpen={sidebarOpen} 
        toggle={() => setSidebarOpen(!sidebarOpen)} 
        isMobile={isMobile}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header - Passing toggle for Mobile Burger Icon */}
        <Header 
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
          isMobile={isMobile}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-0 relative scroll-smooth bg-gradient-to-br from-[#0a0b0f] via-[#0d0e14] to-[#0a0b0f]">
            <Outlet />
        </main>
      </div>
    </div>
  );
}