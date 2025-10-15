import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface LoginFormData {
  email: string;
  password: string;
}

interface LoginResponse {
  message: string;
  token: number;
  name: string;
  user_id?: number;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result: LoginResponse = await response.json();
        
        // Store user data in localStorage
        localStorage.setItem('userToken', result.token.toString());
        localStorage.setItem('userEmail', formData.email);
        localStorage.setItem('userName', result.name);
        
        // Redirect to nutrition chat
        navigate('/nutrition_chat');
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      setError('Network error. Please try again.');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-xl max-w-md w-full">
        <h1 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 text-center mb-6">
          Login to Zayan
        </h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
              required
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
              required
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="text-center text-gray-600 dark:text-gray-400 mt-6">
          Don't have an account?{' '}
          <button
            onClick={() => navigate('/newuserdetails')}
            className="text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Sign up here
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;