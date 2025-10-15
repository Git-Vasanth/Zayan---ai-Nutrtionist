// components/AuthGuard.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('userToken');
      if (!token) {
        navigate('/login');
      }
    };

    checkAuth();
    
    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', checkAuth);
    
    return () => {
      window.removeEventListener('popstate', checkAuth);
    };
  }, [navigate]);

  const token = localStorage.getItem('userToken');
  return token ? <>{children}</> : null;
};

export default AuthGuard;