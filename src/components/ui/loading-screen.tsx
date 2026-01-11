import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  message?: string;
  variant?: 'helix' | 'matrix' | 'neural' | 'glitch';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fullScreen?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  variant = 'helix',
  size = 'md',
  className,
  fullScreen = true,
}) => {
  const containerClasses = cn(
    'flex flex-col items-center justify-center gap-8',
    fullScreen && 'min-h-screen bg-background/80 backdrop-blur-sm',
    className
  );

  const renderLoader = () => {
    switch (variant) {
      case 'matrix':
        return <MatrixLoader size={size} />;
      case 'neural':
        return <NeuralLoader size={size} />;
      case 'glitch':
        return <GlitchLoader size={size} />;
      default:
        return <HelixLoader size={size} />;
    }
  };

  return (
    <div className={containerClasses}>
      <div className="relative">
        {/* Ambient glow */}
        <div className="absolute inset-0 blur-3xl bg-primary/20 rounded-full scale-150" />
        <div className="relative">
          {renderLoader()}
        </div>
      </div>
      {message && (
        <div className="relative flex flex-col items-center gap-3">
          <p className="text-sm font-medium tracking-[0.15em] text-foreground/70 uppercase">
            {message}
          </p>
          {/* Animated progress bar */}
          <div className="w-32 h-[2px] bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full"
              style={{ animation: 'progressSlide 1.5s ease-in-out infinite' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// DNA Helix style loader - refined
const HelixLoader: React.FC<{ size: 'sm' | 'md' | 'lg' }> = ({ size }) => {
  const config = {
    sm: { width: 60, height: 50, dotSize: 8, dotSizeSmall: 5, count: 6 },
    md: { width: 80, height: 60, dotSize: 10, dotSizeSmall: 6, count: 7 },
    lg: { width: 100, height: 70, dotSize: 12, dotSizeSmall: 8, count: 8 },
  };
  
  const { width, height, dotSize, dotSizeSmall, count } = config[size];

  return (
    <div className="relative" style={{ width, height }}>
      {[...Array(count)].map((_, i) => {
        const delay = i * 0.12;
        const leftPos = (i / (count - 1)) * (width - dotSize);
        
        return (
          <React.Fragment key={i}>
            {/* Front strand dot */}
            <div
              className="absolute rounded-full bg-primary transition-shadow"
              style={{
                width: dotSize,
                height: dotSize,
                left: leftPos,
                animation: `helixFront 1.8s ease-in-out infinite`,
                animationDelay: `${delay}s`,
                boxShadow: '0 0 12px var(--primary), 0 0 24px var(--primary)',
              }}
            />
            {/* Back strand dot */}
            <div
              className="absolute rounded-full bg-primary/50"
              style={{
                width: dotSizeSmall,
                height: dotSizeSmall,
                left: leftPos + (dotSize - dotSizeSmall) / 2,
                animation: `helixBack 1.8s ease-in-out infinite`,
                animationDelay: `${delay}s`,
              }}
            />
            {/* Connecting beam */}
            {i < count - 1 && (
              <div
                className="absolute h-[1px] bg-gradient-to-r from-primary/40 via-primary/60 to-primary/40"
                style={{
                  width: width / count,
                  left: leftPos + dotSize / 2,
                  top: '50%',
                  transformOrigin: 'left center',
                  animation: `helixLine 1.8s ease-in-out infinite`,
                  animationDelay: `${delay}s`,
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// Matrix rain - refined
const MatrixLoader: React.FC<{ size: 'sm' | 'md' | 'lg' }> = ({ size }) => {
  const config = {
    sm: { cols: 6, rows: 4, fontSize: 10 },
    md: { cols: 8, rows: 5, fontSize: 12 },
    lg: { cols: 10, rows: 6, fontSize: 14 },
  };
  
  const { cols, rows, fontSize } = config[size];
  const chars = 'アイウエオカキクケコサシスセソタチツテト01';

  return (
    <div className="relative p-4 rounded-xl bg-black/30 backdrop-blur-md border border-primary/20 overflow-hidden">
      {/* Scan line overlay */}
      <div 
        className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none"
        style={{ animation: 'scanLine 2s linear infinite' }}
      />
      <div 
        className="grid gap-x-2 gap-y-1"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {[...Array(cols * rows)].map((_, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const char = chars[Math.floor(Math.random() * chars.length)];
          
          return (
            <div
              key={i}
              className="font-mono text-primary text-center select-none"
              style={{
                fontSize,
                animation: 'matrixFade 2.5s steps(1) infinite',
                animationDelay: `${(col * 0.2) + (row * 0.15)}s`,
                textShadow: '0 0 8px currentColor',
              }}
            >
              {char}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Neural network - refined
const NeuralLoader: React.FC<{ size: 'sm' | 'md' | 'lg' }> = ({ size }) => {
  const config = {
    sm: { containerSize: 60, nodeSize: 8 },
    md: { containerSize: 80, nodeSize: 10 },
    lg: { containerSize: 100, nodeSize: 12 },
  };
  
  const { containerSize, nodeSize } = config[size];

  const nodes = [
    { x: 50, y: 8 },
    { x: 15, y: 35 },
    { x: 85, y: 35 },
    { x: 50, y: 50 },
    { x: 15, y: 65 },
    { x: 85, y: 65 },
    { x: 50, y: 92 },
  ];

  const connections = [
    [0, 1], [0, 2], [0, 3],
    [1, 3], [1, 4],
    [2, 3], [2, 5],
    [3, 4], [3, 5], [3, 6],
    [4, 6], [5, 6],
  ];

  return (
    <div className="relative" style={{ width: containerSize, height: containerSize }}>
      {/* Connection lines */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        {connections.map(([from, to], i) => (
          <line
            key={i}
            x1={`${nodes[from].x}%`}
            y1={`${nodes[from].y}%`}
            x2={`${nodes[to].x}%`}
            y2={`${nodes[to].y}%`}
            stroke="url(#lineGradient)"
            strokeWidth="1.5"
            style={{
              animation: 'neuralPulse 2s ease-in-out infinite',
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </svg>
      
      {/* Nodes */}
      {nodes.map((node, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-primary"
          style={{
            width: nodeSize,
            height: nodeSize,
            left: `${node.x}%`,
            top: `${node.y}%`,
            transform: 'translate(-50%, -50%)',
            animation: 'nodeGlow 2s ease-in-out infinite',
            animationDelay: `${i * 0.15}s`,
            boxShadow: '0 0 10px var(--primary)',
          }}
        >
          {/* Inner pulse */}
          <div 
            className="absolute inset-0 rounded-full bg-primary"
            style={{
              animation: 'nodePing 2s ease-out infinite',
              animationDelay: `${i * 0.15}s`,
            }}
          />
        </div>
      ))}
    </div>
  );
};

// Glitch effect - refined
const GlitchLoader: React.FC<{ size: 'sm' | 'md' | 'lg' }> = ({ size }) => {
  const textSizes = { sm: 'text-3xl', md: 'text-5xl', lg: 'text-6xl' };

  return (
    <div className="relative p-6">
      {/* Background glitch bars */}
      <div className="absolute inset-0 overflow-hidden opacity-30">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="absolute h-[2px] w-full bg-primary"
            style={{
              top: `${30 + i * 20}%`,
              animation: 'glitchBar 3s steps(1) infinite',
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </div>
      
      <div className={cn('font-mono font-bold text-primary relative', textSizes[size])}>
        {/* Main text */}
        <span style={{ animation: 'glitchText 3s infinite' }}>
          {'</>'}
        </span>
        
        {/* Cyan ghost layer */}
        <span 
          className="absolute inset-0 text-cyan-400"
          style={{ 
            animation: 'glitchLayer1 3s infinite',
            clipPath: 'polygon(0 0, 100% 0, 100% 45%, 0 45%)',
            opacity: 0.8,
          }}
        >
          {'</>'}
        </span>
        
        {/* Red ghost layer */}
        <span 
          className="absolute inset-0 text-rose-400"
          style={{ 
            animation: 'glitchLayer2 3s infinite',
            clipPath: 'polygon(0 55%, 100% 55%, 100% 100%, 0 100%)',
            opacity: 0.8,
          }}
        >
          {'</>'}
        </span>
      </div>
      
      {/* Scan line */}
      <div 
        className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-white/5 to-transparent"
        style={{ 
          height: '10%',
          animation: 'scanLine 1.5s linear infinite',
        }}
      />
    </div>
  );
};

// Tab/Section loader - refined
export const TabLoader: React.FC<{ message?: string; className?: string }> = ({
  message,
  className,
}) => (
  <div className={cn('flex flex-col items-center justify-center py-16 gap-5', className)}>
    <div className="relative" style={{ width: 70, height: 45 }}>
      <div className="absolute inset-0 blur-2xl bg-primary/20 rounded-full" />
      {[...Array(6)].map((_, i) => {
        const delay = i * 0.12;
        const leftPos = (i / 5) * 58;
        
        return (
          <React.Fragment key={i}>
            <div
              className="absolute rounded-full bg-primary"
              style={{
                width: 8,
                height: 8,
                left: leftPos,
                animation: `helixFront 1.8s ease-in-out infinite`,
                animationDelay: `${delay}s`,
                boxShadow: '0 0 10px var(--primary)',
              }}
            />
            <div
              className="absolute rounded-full bg-primary/50"
              style={{
                width: 5,
                height: 5,
                left: leftPos + 1.5,
                animation: `helixBack 1.8s ease-in-out infinite`,
                animationDelay: `${delay}s`,
              }}
            />
          </React.Fragment>
        );
      })}
    </div>
    {message && (
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm tracking-wide text-muted-foreground">{message}</p>
        <div className="w-20 h-[2px] bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent"
            style={{ animation: 'progressSlide 1.5s ease-in-out infinite' }}
          />
        </div>
      </div>
    )}
  </div>
);

// Inline spinner for buttons - refined
export const InlineSpinner: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('flex gap-1 items-center', className)}>
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="h-1.5 w-1.5 rounded-full bg-current"
        style={{
          animation: 'inlinePulse 1.2s ease-in-out infinite',
          animationDelay: `${i * 0.15}s`,
        }}
      />
    ))}
  </div>
);

export default LoadingScreen;
