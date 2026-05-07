'use client'

import { motion, type Variants, type HTMLMotionProps } from 'framer-motion'

// ── Reusable variants ─────────────────────────────────────────────────────────

export const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

export const fadeIn: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1 },
}

export const staggerContainer: Variants = {
  hidden:  {},
  visible: {},
}

// ── Animate wrapper (default: fade + slide up) ───────────────────────────────

interface AnimateProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode
  delay?: number
  className?: string
}

export function Animate({ children, delay = 0, className, ...rest }: AnimateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

// ── Stagger container: wraps children and staggers their entrance ─────────────

interface StaggerProps {
  children: React.ReactNode
  className?: string
  delay?: number
}

export function Stagger({ children, className, delay = 0 }: StaggerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.08, delayChildren: delay } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ── FadeUpItem: child of Stagger ──────────────────────────────────────────────

export function FadeUpItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={fadeUp} className={className}>
      {children}
    </motion.div>
  )
}

// ── HoverCard: subtle lift on hover ──────────────────────────────────────────

export function HoverCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.2, ease: 'easeOut' } }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
