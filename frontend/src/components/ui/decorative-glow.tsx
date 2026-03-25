import { cn } from "@/lib/utils"

type GlowVariant = "default" | "subtle" | "rich"

interface DecorativeGlowProps {
  variant?: GlowVariant
  className?: string
}

/**
 * Decorative background glow orbs for card/panel containers.
 * Parent must have `relative overflow-hidden`.
 */
export function DecorativeGlow({
  variant = "default",
  className,
}: DecorativeGlowProps) {
  return (
    <div className={cn("pointer-events-none absolute inset-0", className)}>
      {variant === "default" && (
        <>
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-sky-100/70 blur-[80px]" />
          <div className="absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-indigo-100/70 blur-[80px]" />
        </>
      )}

      {variant === "subtle" && (
        <>
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-sky-100/50 blur-[60px]" />
          <div className="absolute -left-12 -bottom-12 h-32 w-32 rounded-full bg-indigo-100/50 blur-[60px]" />
        </>
      )}

      {variant === "rich" && (
        <>
          <div className="absolute -right-20 -top-24 h-44 w-44 rounded-full bg-indigo-100/70 blur-[60px]" />
          <div className="absolute -left-12 -bottom-20 h-36 w-36 rounded-full bg-sky-100/70 blur-[60px]" />
          <div className="absolute right-24 top-8 h-12 w-12 rounded-full bg-amber-100/80 blur-xl" />
          <div className="absolute left-10 top-16 h-6 w-6 rounded-full bg-emerald-100/90 blur-lg" />
          <div className="absolute bottom-10 left-1/2 h-8 w-8 rounded-full bg-rose-100/80 blur-lg" />
        </>
      )}
    </div>
  )
}
