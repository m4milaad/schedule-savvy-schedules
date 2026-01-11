import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  message?: string;
  variant?: 'morphing' | 'cascade' | 'orbit' | 'pulse';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fullScreen?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  variant = 'morphing',
  size = 'md',
  className,
  fullScreen = true,
}) => {
  const containerClasses = cn(
    'flex flex-col items-center justify-center gap-8',
    fullScreen && 'min-h-screen',
    className
  );

  const renderLoader = () => {
    switch (variant) {
      case 'cascade':
        return <CascadeLoader size={size} />;
      case 'orbit':
        return <OrbitLoader size={size} />;
      case 'pulse':
        return <PulseLoader size={size} />;
      default:
        return <MorphingLoader size={size} />;
    }
  };

  return (
    <div className={containerClasses}>
      {renderLoader()}
      {message && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm font-medium tracking-wide text-muted-foreground">
            {message}
          </p>
          <div className="w-24 h-[2px] bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full w-1/3 bg-primary rounded-full"
              style={{ animation: 'slideProgress 1.2s ease-in-out infinite' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Morphing cube that rotates and transforms
const MorphingLoader: React.FC<{ size: 'sm' | 'md' | 'lg' }> = ({ size }) => {
  const sizes = { sm: 32, md: 44, lg: 56 };
  const s = sizes[size];

  return (
    <div className="relative" style={{ width: s * 1.5, height: s * 1.5 }}>
      {/* Shadow */}
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-primary/20 rounded-full blur-md"
        style={{ 
          width: s, 
          height: s * 0.2,
          animation: 'shadowPulse 1.8s ease-in-out infinite',
        }}
      />
      {/* Main cube */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 bg-primary rounded-lg"
        style={{
          width: s,
          height: s,
          animation: 'morphCube 1.8s ease-in-out infinite',
          boxShadow: '0 0 20px var(--primary)',
        }}
      />
    </div>
  );
};

// Cascading squares falling in sequence
const CascadeLoader: React.FC<{ size: 'sm' | 'md' | 'lg' }> = ({ size }) => {
  const config = {
    sm: { boxSize: 10, gap: 4, count: 4 },
    md: { boxSize: 14, gap: 5, count: 4 },
    lg: { boxSize: 18, gap: 6, count: 4 },
  };
  
  const { boxSize, gap, count } = config[size];
  const totalWidth = count * boxSize + (count - 1) * gap;

  return (
    <div 
      className="flex items-end"
      style={{ gap, height: boxSize * 2.5 }}
    >
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="bg-primary rounded-sm"
          style={{
            width: boxSize,
            height: boxSize,
            animation: 'cascadeDrop 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.15}s`,
            boxShadow: '0 0 12px var(--primary)',
          }}
        />
      ))}
    </div>
  );
};

// Squares orbiting around center
const OrbitLoader: React.FC<{ size: 'sm' | 'md' | 'lg' }> = ({ size }) => {
  const config = {
    sm: { containerSize: 48, boxSize: 10, centerSize: 14 },
    md: { containerSize: 64, boxSize: 12, centerSize: 18 },
    lg: { containerSize: 80, boxSize: 14, centerSize: 22 },
  };
  
  const { containerSize, boxSize, centerSize } = config[size];

  return (
    <div className="relative" style={{ width: containerSize, height: containerSize }}>
      {/* Center square */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary rounded-md"
        style={{ 
          width: centerSize, 
          height: centerSize,
          animation: 'centerPulse 2s ease-in-out infinite',
          boxShadow: '0 0 15px var(--primary)',
        }}
      />
      
      {/* Orbiting squares */}
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="absolute top-1/2 left-1/2"
          style={{
            width: boxSize,
            height: boxSize,
            marginLeft: -boxSize / 2,
            marginTop: -boxSize / 2,
            animation: `orbit 2.4s linear infinite`,
            animationDelay: `${i * -0.6}s`,
          }}
        >
          <div 
            className="w-full h-full bg-primary/80 rounded-sm"
            style={{
              animation: 'counterRotate 2.4s linear infinite',
              animationDelay: `${i * -0.6}s`,
              boxShadow: '0 0 8px var(--primary)',
            }}
          />
        </div>
      ))}
    </div>
  );
};

// Grid of pulsing squares
const PulseLoader: React.FC<{ size: 'sm' | 'md' | 'lg' }> = ({ size }) => {
  const config = {
    sm: { boxSize: 12, gap: 4 },
    md: { boxSize: 16, gap: 5 },
    lg: { boxSize: 20, gap: 6 },
  };
  
  const { boxSize, gap } = config[size];

  return (
    <div 
      className="grid grid-cols-3"
      style={{ gap }}
    >
      {[...Array(9)].map((_, i) => {
        const row = Math.floor(i / 3);
        const col = i % 3;
        // Delay based on distance from center
        const centerDist = Math.abs(1 - row) + Math.abs(1 - col);
        const delay = centerDist * 0.15;
        
        return (
          <div
            key={i}
            className="bg-primary rounded-sm"
            style={{
              width: boxSize,
              height: boxSize,
              animation: 'gridPop 1.5s ease-in-out infinite',
              animationDelay: `${delay}s`,
              boxShadow: '0 0 10px var(--primary)',
            }}
          />
        );
      })}
    </div>
  );
};

// Tab/Section loader
export const TabLoader: React.FC<{ message?: string; className?: string }> = ({
  message,
  className,
}) => (
  <div className={cn('flex flex-col items-center justify-center py-16 gap-5', className)}>
    <div className="flex items-end gap-1.5" style={{ height: 35 }}>
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="bg-primary rounded-sm"
          style={{
            width: 12,
            height: 12,
            animation: 'cascadeDrop 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.15}s`,
            boxShadow: '0 0 8px var(--primary)',
          }}
        />
      ))}
    </div>
    {message && (
      <p className="text-sm text-muted-foreground">{message}</p>
    )}
  </div>
);

// Inline spinner for buttons
export const InlineSpinner: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('flex gap-1 items-center', className)}>
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="h-1.5 w-1.5 rounded-sm bg-current"
        style={{
          animation: 'inlineBounce 1s ease-in-out infinite',
          animationDelay: `${i * 0.12}s`,
        }}
      />
    ))}
  </div>
);

export default LoadingScreen;
