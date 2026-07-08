import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

// Site-wide consistent scroll-reveal motion settings.
export const REVEAL_EASE = [0.22, 1, 0.36, 1] as const;
export const REVEAL_DURATION = 0.55;
export const REVEAL_OFFSET = 20;

const variants: Variants = {
  hidden: { opacity: 0, y: REVEAL_OFFSET },
  visible: { opacity: 1, y: 0, transition: { duration: REVEAL_DURATION, ease: REVEAL_EASE } },
};

export function Reveal({
  children,
  delay = 0,
  className = "",
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) {
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={variants}
      transition={{ delay }}
    >
      {children}
    </Comp>
  );
}
