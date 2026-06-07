import { BLOCK_COLORS, type BlockType } from '@/lib/plan'

export function ProgressBar({
  value,
  className = '',
}: {
  value: number // 0-100
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
      className={`inline-flex items-center rounded-full font-mono font-medium leading-none ${
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

export function SectionCard({
  title,
  children,
  action,
}: {
  title?: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between">
          {title && (
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
