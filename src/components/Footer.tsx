import React from 'react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="bg-background border-t mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Central University of Kashmir. All rights reserved.
            </p>
          </div>
          <div className="flex gap-6">
            <a 
              href="https://cukashmir.ac.in" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              University Website
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};