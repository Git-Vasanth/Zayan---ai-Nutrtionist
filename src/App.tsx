import{ useState, useEffect } from 'react';

// Main App Component
const App = () => {
  // State for managing theme
  const [isDark, setIsDark] = useState(false);

  // Effect to apply the 'dark' class to the document's root element
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Handler for theme toggle button
  const handleToggle = () => {
    setIsDark(!isDark);
  };

  // The main application layout.
  // We use Tailwind's 'dark:' prefix to handle styles for the dark theme.
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-slate-900 text-neutral-800 dark:text-neutral-200 font-sans transition-colors duration-500">
      
      {/* Header Section with 'zayan' heading */}
      <header className="p-6 md:p-8 flex justify-between items-center bg-transparent backdrop-filter backdrop-blur-lg bg-white/20 dark:bg-slate-800/20 fixed top-0 left-0 w-full z-10">
        {/* Reverting the heading size in the header to be smaller */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
          Zayan
        </h1>
        <nav className="flex items-center space-x-4">
          <a
  href="http://localhost:5173/newuserdetails"
  className="px-5 py-2 rounded-full border-2 border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400 font-semibold hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-400 dark:hover:text-slate-900 transition-all duration-300"
>
  I Wanna Try
</a>
          <a
  href="http://localhost:5173/login"
  className="px-5 py-2 rounded-full border-2 border-neutral-400 text-neutral-600 dark:border-slate-500 dark:text-neutral-200 font-semibold hover:border-emerald-600 dark:hover:border-emerald-400 transition-all duration-300"
>
  Login
</a>
<a
  href="http://localhost:5173/nutritionist-login"
  className="px-5 py-2 rounded-full border-2 border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400 font-semibold hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-400 dark:hover:text-slate-900 transition-all duration-300"
>
  Nutritionist Login
</a>
          <a
  href="http://localhost:5173/nutritionist-register"
  className="px-5 py-2 rounded-full border-2 border-neutral-400 text-neutral-600 dark:border-slate-500 dark:text-neutral-200 font-semibold hover:border-emerald-600 dark:hover:border-emerald-400 transition-all duration-300"
>
  Register Nutritonist
</a>
          <button
            onClick={handleToggle}
            className="p-2 rounded-full text-2xl bg-neutral-200 dark:bg-slate-700 hover:scale-110 transition-transform"
            aria-label="Toggle theme"
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="container mx-auto px-6 py-24 md:py-32 max-w-6xl">
        
        {/* Hero Section with updated font and colors */}
        <section className="text-center pt-16 pb-20 md:pb-32">
          {/* This is the main heading that now has the larger font size */}
          <h2 className="text-7xl sm:text-8xl lg:text-9xl font-extrabold text-emerald-600 dark:text-emerald-400 font-serif mb-4">
            Zayan
          </h2>
          <p className="text-2xl sm:text-3xl font-light text-lime-300 dark:text-lime-200 mb-6">
            Your Personalized Nutrition Assistant
          </p>
          <p className="max-w-xl mx-auto text-lg mb-8">
            Eat smarter, live healthier. Get personalized meal plans, track your nutrition, and achieve your health goals with the help of zayan.
          </p>
        </section>

        {/* Features Section with reverted three-column layout */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 py-16">
          <div className="bg-white/50 dark:bg-slate-800/50 rounded-3xl p-8 text-center shadow-lg backdrop-filter backdrop-blur-md transition transform hover:scale-105 border border-white/30 dark:border-slate-700/50">
            <span className="text-5xl mb-4 block">🍎</span>
            <h3 className="text-xl font-semibold mb-2">Personalized Meal Planning</h3>
            <p className="text-sm">Receive custom meal plans tailored to your dietary needs and preferences.</p>
          </div>
          <div className="bg-white/50 dark:bg-slate-800/50 rounded-3xl p-8 text-center shadow-lg backdrop-filter backdrop-blur-md transition transform hover:scale-105 border border-white/30 dark:border-slate-700/50">
            <span className="text-5xl mb-4 block">📊</span>
            <h3 className="text-xl font-semibold mb-2">Nutrition Tracking</h3>
            <p className="text-sm">Easily log your food and get detailed insights into your daily intake.</p>
          </div>
          <div className="bg-white/50 dark:bg-slate-800/50 rounded-3xl p-8 text-center shadow-lg backdrop-filter backdrop-blur-md transition transform hover:scale-105 border border-white/30 dark:border-slate-700/50">
            <span className="text-5xl mb-4 block">🤖</span>
            <h3 className="text-xl font-semibold mb-2">AI-Powered Recommendations</h3>
            <p className="text-sm">Our intelligent assistant suggests recipes and tips to help you stay on track.</p>
          </div>
        </section>

        {/* About Section */}
        <section className="py-16 text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Our Value</h2>
          <p className="text-lg">
            zayan is more than just a nutrition app—it's your partner in wellness. We combine cutting-edge AI with a user-friendly interface to make healthy eating simple and enjoyable for everyone.
          </p>
        </section>
      </main>

      {/* Footer Section */}
      <footer className="py-8 px-6 md:px-8 text-center border-t border-neutral-200 dark:border-slate-700">
        <div className="flex justify-center space-x-6">
          <a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Contact Us</a>
        </div>
        <div className="mt-4 flex justify-center space-x-4">
          <a href="#" aria-label="Twitter" className="text-xl hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">🐦</a>
          <a href="#" aria-label="LinkedIn" className="text-xl hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">🔗</a>
        </div>
      </footer>
    </div>
  );
};

export default App;
