import { cn } from "@/lib/utils"
import type { ButtonHTMLAttributes } from "react"

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost"
}

export default function PixelButton({ className, variant = "primary", ...props }: Props) {
  return (
    <button
      {...props}
      className={cn(
        "group relative inline-flex select-none items-center justify-center gap-2 px-4 py-2 text-sm font-semibold tracking-wide outline-none",
        "border-2 border-zinc-200/20 bg-zinc-950 text-zinc-50 shadow-[0_6px_0_0_rgba(0,0,0,0.45)]",
        "active:translate-y-[2px] active:shadow-[0_4px_0_0_rgba(0,0,0,0.45)]",
        "transition-[transform,box-shadow,filter] duration-100",
        variant === "primary" && "hover:brightness-110",
        variant === "ghost" &&
          "border-zinc-200/15 bg-zinc-950/40 text-zinc-100 shadow-[0_6px_0_0_rgba(0,0,0,0.28)] hover:bg-zinc-950/55",
        className,
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-0 opacity-55",
          "bg-[linear-gradient(180deg,rgba(126,249,255,0.14),rgba(255,122,89,0.0)_60%)]",
        )}
      />
      <span className="relative">{props.children}</span>
      <span
        className={cn(
          "pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-200 group-hover:opacity-100",
          "bg-[linear-gradient(90deg,rgba(126,249,255,0.0),rgba(126,249,255,0.18),rgba(255,122,89,0.18),rgba(255,122,89,0.0))]",
        )}
      />
    </button>
  )
}

