import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function GoogleAuthBtn() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSuccess = async (credentialResponse: any) => {
    try {
      // 1. Get the ID Token from Google
      const { credential } = credentialResponse;
      
      // 2. Send it to Backend
      const res = await api.post('/auth/google', { token: credential });
      
      // 3. Log the user in (save access token)
      login(res.data.access_token);
      
      // 4. Redirect to Dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error("Google Login Failed", error);
      alert("Login failed. Please try again.");
    }
  };

  return (
    <div className="flex justify-center">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => console.log('Login Failed')}
        theme="filled_blue"
        shape="pill"
        width="350"
      />
    </div>
  );
}