import React from 'react';

// Lucide-react is used for icons. Assuming it's available in the environment.
// If not, you might need to use inline SVGs or another icon library.
// For this example, we'll use a simple SVG fallback if lucide-react isn't directly available.

// A simple SVG icon for demonstration if lucide-react is not directly importable
const FrownIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="80"
    height="80"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-indigo-500 mb-6 mx-auto" // Added mx-auto here to center the icon
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
);

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100 p-4 font-inter">
      <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 text-center max-w-md w-full border border-gray-200">
        <FrownIcon /> {/* Using the SVG icon */}
        <h1 className="text-6xl font-extrabold text-indigo-700 mb-4 animate-bounce-slow">
          404
        </h1>
        <p className="text-2xl text-gray-800 font-semibold mb-4">
          Page Not Found
        </p>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Oops! It looks like the page you're looking for doesn't exist.
          Perhaps you typed the address incorrectly, or the page has been moved.
        </p>
        <div className="space-y-4">
          <a
            href="/"
            className="inline-block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-md"
          >
            Return to Home
          </a>
          <a
            href="mailto: mb4milad.bhattt@gmail.com" 
            className="inline-block w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-sm"
          >
            Contact Support
          </a>
          <a
            href="https://m4milaad.github.io/Resume" 
            className="inline-block w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-sm"
          >
            Check out our Blog
          </a>
        </div>
      </div>
    </div>
  );
};

export default App;
