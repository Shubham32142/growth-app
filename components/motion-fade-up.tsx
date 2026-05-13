"use client";

import * as React from "react";
import { motion } from "framer-motion";

interface FadeUpProps {
  delay?: number;
  duration?: number;
  distance?: number;
  className?: string;
  children: React.ReactNode;
}

/**
 * Tiny reusable wrapper that fades + slides its children up on mount.
 * Lets server components compose entrance animations without going fully
 * client-side themselves.
 */
export function FadeUp({
  delay = 0,
  duration = 0.28,
  distance = 8,
  className,
  children,
}: FadeUpProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: distance }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, ease: "easeOut", delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
