
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
    }, 3000); // Show splash for 3 seconds

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 bg-gradient-to-br from-blue-500 to-blue-600 flex flex-col items-center justify-center z-50 transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="text-center animate-fade-in flex flex-col justify-between h-full py-12">
        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* CUK Logo */}
          <div className="mb-8">
            <img 
              src="/CUKLogo.ico" 
              alt="Central University of Kashmir Logo" 
              className="w-32 h-32 mx-auto mb-6 animate-scale-in drop-shadow-2xl bg-white rounded-full p-4"
            />
          </div>
          
          {/* University Name */}
          <h1 className="text-2xl font-bold text-white mb-4 text-center px-4 leading-tight drop-shadow-lg">
            Central University of Kashmir
          </h1>
          
          {/* DateSheet Title */}
          <h2 className="text-4xl font-bold text-white mb-8 tracking-wide drop-shadow-lg">
            DateSheet
          </h2>
          
          {/* Loading indicator */}
          <div className="flex items-center justify-center space-x-2">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
        
        {/* Developer Credit */}
        <div className="text-center">
          <p className="text-sm text-white/80 font-medium drop-shadow">
            Developed by Milad Ajaz Bhat
          </p>
        </div>
      </div>
    </div>
  );
};
