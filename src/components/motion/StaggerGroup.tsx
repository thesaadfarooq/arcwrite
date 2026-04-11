import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Reveal } from "./Reveal";

type Direction = "up" | "down" | "left" | "right";

interface StaggerGroupProps {
  children: React.ReactNode;
  stagger?: number;
  direction?: Direction;
  className?: string;
}

export function StaggerGroup({
  children,
  stagger = 0.1,
  direction = "up",
  className,
}: StaggerGroupProps) {
  const prefersReduced = useReducedMotion();
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const effectiveStagger = prefersReduced || isMobile ? 0 : stagger;

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
    >
      {React.Children.map(children, (child, index) => (
        <Reveal direction={direction} delay={index * effectiveStagger}>
          {child}
        </Reveal>
      ))}
    </motion.div>
  );
}
