import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Rocket, LayoutDashboard, LogIn } from 'lucide-react';

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      {/* Smart Navbar */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Rocket className="h-6 w-6 text-blue-600" />
          <span className="text-xl font-bold tracking-tight">AI Platform</span>
        </div>
        
        <div className="flex gap-4">
          {isAuthenticated ? (
            <Link 
              to="/dashboard" 
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <LayoutDashboard className="h-4 w-4" />
              Go to Dashboard
            </Link>
          ) : (
            <Link 
              to="/login" 
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
            >
              <LogIn className="h-4 w-4" />
              Login
            </Link>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto mt-20 text-center px-4">
        <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight">
          Supercharge your workflow with <span className="text-blue-600">Enterprise AI</span>
        </h1>
        <p className="mt-6 text-xl text-gray-600">
          Access GPT-4, Gemini, and Claude in one unified workspace. 
          Pay only for what you use with our credit system.
        </p>
        
        <div className="mt-10 flex justify-center gap-4">
          {isAuthenticated ? (
            <Link 
              to="/dashboard" 
              className="px-8 py-4 bg-gray-900 text-white text-lg font-semibold rounded-xl hover:bg-gray-800 transition"
            >
              Launch Console
            </Link>
          ) : (
             <Link 
              to="/login" 
              className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition"
            >
              Get Started for Free
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}