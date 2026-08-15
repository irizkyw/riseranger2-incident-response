import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-border/60 bg-muted/60 text-muted-foreground",
        destructive: "border-red-500/30 bg-red-500/10 text-red-400",
        outline: "border-border/80 text-foreground bg-black/40",
        cyber: "border-cyber-cyan/40 bg-cyber-cyan/10 text-cyber-cyan shadow-[0_0_8px_rgba(0,240,255,0.2)]",
        green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
        purple: "border-purple-500/30 bg-purple-500/10 text-purple-300",
        pink: "border-pink-500/30 bg-pink-500/10 text-pink-400",
        yellow: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
        blue: "border-blue-500/30 bg-blue-500/10 text-blue-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
