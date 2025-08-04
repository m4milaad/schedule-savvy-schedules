import React from 'react';

// Lucide-react is used for icons. Assuming it's available in the environment.
// If not, you might need to use inline SVGs or another icon library.
// For this example, we'll use a simple SVG fallback if lucide-react isn't directly available.

// A simple SVG icon for demonstration if lucide-react is not directly importable
import { ThemeToggle } from "@/components/ThemeToggle";

const App = () => {
  // In a real application with react-router-dom, you would use useLocation here.
  // For this self-contained example, we'll simulate the path.
  const simulatedPath = "/non-existent-route";

  React.useEffect(() => {
    // This console error logging is kept as per your original request.
    console.error(
      "404 Error: User attempted to access non-existent route:",
      simulatedPath
    );
  }, [simulatedPath]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-slate-900 dark:to-slate-800 p-4 transition-colors duration-500">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 sm:p-12 text-center max-w-md w-full border border-gray-200 dark:border-slate-700 transition-all duration-500 hover:shadow-2xl animate-fade-in">
        <div className="mb-6 animate-scale-in">
          <img 
            src="/favicon.ico" 
            alt="CUK Logo" 
            className="w-20 h-20 mx-auto mb-4 transition-transform duration-300 hover:scale-110"
          />
        </div>
        <h1 className="text-6xl font-extrabold text-indigo-700 dark:text-indigo-400 mb-4 animate-bounce transition-colors duration-300">
          404
        </h1>
        <p className="text-2xl text-gray-800 dark:text-gray-200 font-semibold mb-4 transition-colors duration-300">
          Page Not Found
        </p>
        <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed transition-colors duration-300">
          Oops! It looks like the page you're looking for doesn't exist.
          Perhaps you typed the address incorrectly, or the page has been moved.
        </p>
        <div className="space-y-4">
          <a
            href="/"
            className="inline-block w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 shadow-md hover:shadow-lg"
          >
            Return to Home
          </a>
          <a
            href="mailto: mb4milad.bhattt@gmail.com" 
            className="inline-block w-full bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-800 dark:text-gray-200 font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 shadow-sm hover:shadow-md"
          >
            Contact Support
          </a>
          <a
            href="https://m4milaad.github.io/Resume" 
            className="inline-block w-full bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-800 dark:text-gray-200 font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 shadow-sm hover:shadow-md"
          >
            Developer Portfolio
          </a>
        </div>
      </div>
    </div>
  );
};

export default App;
