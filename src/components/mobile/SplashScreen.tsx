
import { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onComplete, 500); // Wait for fade out animation
    }, 2500); // Show splash for 2.5 seconds

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col items-center justify-center z-50 transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="text-center animate-fade-in">
        {/* CUK Logo */}
        <div className="mb-6">
          <img 
            src="/CUKLogo.ico" 
            alt="Central University of Kashmir Logo" 
            className="w-24 h-24 mx-auto mb-4 animate-scale-in"
          />
        </div>
        
        {/* University Name */}
        <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center px-4">
          Central University of Kashmir
        </h1>
        
        {/* DateSheet Title */}
        <h2 className="text-xl font-semibold text-blue-600 mb-8">
          DateSheet
        </h2>
        
        {/* Loading indicator */}
        <div className="flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
};
