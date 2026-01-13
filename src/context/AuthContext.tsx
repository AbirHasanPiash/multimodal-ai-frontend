import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../api/client';
import { useNavigate } from 'react-router-dom';

interface User {
  email: string;
  full_name?: string;
  wallet?: {
    credits: number;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Define the Fetch Logic Separately
  const fetchUserProfile = async (accessToken: string) => {
    try {
      const response = await api.get('/users/me', {
        // Ensure we use the specific token passed in, or fallback to state
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setUser(response.data);
    } catch (error) {
      console.error("Failed to fetch user:", error);
    }
  };

  // Create the refreshProfile function
  const refreshProfile = async () => {
    if (token) {
      await fetchUserProfile(token);
    }
  };

  const login = (newToken: string) => {
    localStorage.setItem('access_token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    setIsLoading(true);
    navigate('/');
    setTimeout(() => {
      localStorage.removeItem('access_token');
      setToken(null);
      setUser(null);
      setIsLoading(false);
    }, 50);
  };

  // Use Effect calls the shared logic
  useEffect(() => {
    const initAuth = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        await fetchUserProfile(token);
      } catch (error) {
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [token]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      logout, 
      refreshProfile,
      isAuthenticated: !!user, 
      isLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};