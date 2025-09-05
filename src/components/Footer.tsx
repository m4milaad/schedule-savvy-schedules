import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-card border-t mt-auto">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground mb-4 sm:mb-0">
            © <span>{new Date().getFullYear()}</span> Yuva Global Enterprises | Developed by{' '}
            <a 
              href="https://m4milaad.github.io/Resume/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 transition-colors duration-200"
            >
              Milad Ajaz Bhat
            </a>{' '}
            | All Rights Reserved.
          </p>
          <div className="flex items-center gap-4">
            <img 
              src="/favicon.ico" 
              alt="CUK Logo" 
              className="w-6 h-6 opacity-60"
            />
          </div>
        </div>
      </div>
    </footer>
  );
};