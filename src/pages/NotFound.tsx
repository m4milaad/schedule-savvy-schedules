import React from 'react';
import FaultyTerminal from '@/components/Faultyterminal'
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
      <div className="absolute inset-0 z-0">
        <FaultyTerminal
          scale={1.8}
          // gridMul={[2, 1]}
          digitSize={1.2}
          timeScale={1}
          pause={false}
          scanlineIntensity={0.5}
          glitchAmount={1}
          flickerAmount={1}
          noiseAmp={1}
          curvature={0.1}
          tint="#a7ef9e"
          mouseReact={true}
          mouseStrength={0.5}
          pageLoadAnimation={true}
          brightness={0.6}
        />
      </div>
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/30 p-8 text-center shadow-xl backdrop-blur-xl dark:border-slate-100/10 dark:bg-slate-900/40">

        {/* Logo/Image */}
        <div className="mb-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <img
            src="/favicon.ico"
            alt="CUK Logo"
            className="mx-auto h-20 w-20 transition-transform duration-300 hover:scale-110"
          />
        </div>

        {/* 404 Title - Modern Gradient Text */}
        <h1
          className="mb-4 text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 animate-fade-in"
          style={{ animationDelay: '0.4s' }}
        >
          404
        </h1>

        {/* Subtitle */}
        <p
          className="mb-4 text-3xl font-bold text-slate-900 dark:text-slate-100 animate-fade-in"
          style={{ animationDelay: '0.6s' }}
        >
          Page Not Found
        </p>

        {/* Description */}
        <p
          className="mb-8 text-slate-700 dark:text-slate-300 animate-fade-in"
          style={{ animationDelay: '0.8s' }}
        >
          Oops! It looks like the page you're looking for doesn't exist or has
          been moved.
        </p>

        {/* Button Container */}
        <div
          className="space-y-4 animate-fade-in"
          style={{ animationDelay: '1.0s' }}
        >
          {/* Primary Action Button (Home) */}
          <a
            href="/"
            className="inline-block w-full transform rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 font-bold text-white shadow-lg transition-all duration-300 ease-in-out hover:scale-105 hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl"
          >
            Return to Home
          </a>
        </div>

        {/* Secondary Links */}
        <div
          className="mt-8 flex justify-center space-x-6 animate-fade-in"
          style={{ animationDelay: '1.2s' }}
        >
          <a
            href="mailto:mb4milad.bhattt@gmail.com"
            className="text-sm font-medium text-indigo-700 transition-colors duration-300 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200"
          >
            Contact Support
          </a>
          <a
            href="https://m4milaad.github.io"
            target={"_blank"}
            className="text-sm font-medium text-indigo-700 transition-colors duration-300 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200"
          >
            Developer Portfolio
          </a>
        </div>
      </div>
    </div>

  );
};

export default App;
