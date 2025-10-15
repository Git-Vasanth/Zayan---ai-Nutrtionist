import React, { useState } from 'react';

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const NutritionistRegister: React.FC = () => {
  const [formData, setFormData] = useState<RegisterFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/nutritionist/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password
        })
      });

      if (response.ok) {
        setSuccess('Nutritionist account created successfully!');
        setFormData({ name: '', email: '', password: '', confirmPassword: '' });
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Registration failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-xl max-w-md w-full">
        <h1 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 text-center mb-6">
          Register Nutritionist
        </h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
              required
              placeholder="Enter full name"
            />
          </div>

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
              placeholder="Enter email address"
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
              placeholder="Enter password (min 6 characters)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
              required
              placeholder="Confirm password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Creating Account...' : 'Create Nutritionist Account'}
          </button>
        </form>

        <p className="text-center text-gray-600 dark:text-gray-400 mt-6">
          <a href="/nutritionist-login" className="text-emerald-600 hover:text-emerald-700 font-medium">
            Already have an account? Login here
          </a>
        </p>
      </div>
    </div>
  );
};

export default NutritionistRegister;