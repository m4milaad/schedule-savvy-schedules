import React from "react";
import { motion, type MotionProps } from "framer-motion";

interface PageTransitionProps extends MotionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Lightweight wrapper for page/tab transitions.
 * Used by AdminDashboard (and can be reused elsewhere).
 */
export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12, scale: 0.995 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.995 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

