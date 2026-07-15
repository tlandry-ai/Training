import type React from 'react'
import { BLOCK_COLORS, type BlockType } from '@/lib/plan'

export function Panel({
  children,
  className = '',
  dark = false,
}: {
  children: React.ReactNode
  className?: string
  dark?: boolean
}) {
  return (
    <div
      className={`mb-3.5 rounded-lg border p-4 ${
        dark ? 'border-ink bg-ink text-oat' : 'border-border bg-paper text-ink'
      } ${className}`}
    >
      {children}
    </div>
  )
}

export function Eyebrow({
  children,
  muted = false,
}: {
  children: React.ReactNode
  muted?: boolean
}) {
  return (
    <div
      className={`mb-3 font-sans text-[10px] font-bold uppercase tracking-[0.18em] ${
        muted ? 'text-oat/60' : 'text-ink-soft'
      }`}
    >
      {children}
    </div>
  )
}

export function EyebrowRow({
  label,
  right,
  muted = false,
}: {
  label: string
  right?: React.ReactNode
  muted?: boolean
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <span
        className={`font-sans text-[10px] font-bold uppercase tracking-[0.18em] ${
          muted ? 'text-oat/60' : 'text-ink-soft'
        }`}
      >
        {label}
      </span>
      {right != null && (
        <span className="font-serif text-[15px] font-semibold text-ink">
          {right}
        </span>
      )}
    </div>
  )
}

export function Track({ pct }: { pct: number }) {
  return (
    <div className="mb-3.5 h-[3px] overflow-hidden rounded-sm bg-oat-deep">
      <i
        className="block h-full rounded-sm bg-green transition-[width] duration-300"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  )
}

export function ProgressBar({
  value,
  className = '',
}: {
  value: number
  className?: string
}) {
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-accent ${className}`}
    >
      <div
        className="h-full rounded-full bg-primary transition-all duration-500"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}

export function Pill({
  type,
  label,
  faded = false,
  small = false,
}: {
  type: BlockType
  label?: string
  faded?: boolean
  small?: boolean
}) {
  const c = BLOCK_COLORS[type]
  return (
    <span
      className={`inline-flex items-center rounded-full font-sans font-medium leading-none ${
        small ? 'px-1.5 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[11px]'
      }`}
      style={{
        backgroundColor: c.bg,
        color: c.text,
        opacity: faded ? 0.4 : 1,
      }}
    >
      {label ?? c.name}
    </span>
  )
}
