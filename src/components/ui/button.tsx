import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/*
 * Styled from the app palette rather than shadcn's token set. `globals.css`
 * defines only background / foreground / primary / secondary / accent /
 * description / text / input, so classes like `bg-muted`, `text-primary-
 * foreground`, `ring-ring` and `bg-destructive` emitted nothing at all — the
 * outline and ghost variants had no hover, destructive had no styling, and the
 * default variant fell back to dark body text on the green fill.
 *
 * Radius and focus ring match the form controls in `form-controls.ts`, so a
 * button sits correctly beside an input.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-primary/90",
        outline:
          "border-[#c9cbc6] hover:border-[#9ea29b] dark:border-[#384252] dark:hover:border-[#526078] bg-white dark:bg-[#1e2330] text-[#16181c] dark:text-[#f8fafc] font-semibold hover:bg-[#f4f5f3] dark:hover:bg-[#252a38] shadow-xs dark:shadow-[0_2px_6px_rgba(0,0,0,0.25)] aria-expanded:bg-[#f4f5f3] dark:aria-expanded:bg-[#252a38]",
        // Secondary is amber; white on it fails contrast, so it wears dark ink.
        secondary:
          "bg-secondary text-[#3d2c00] hover:bg-secondary/85 aria-expanded:bg-secondary",
        ghost:
          "text-[#5c6660] dark:text-[#94a3b8] hover:bg-[#f2f3f1] dark:hover:bg-[#252a38] hover:text-[#1a222b] dark:hover:text-[#f8fafc] aria-expanded:bg-[#f2f3f1] dark:aria-expanded:bg-[#252a38] aria-expanded:text-[#1a222b] dark:aria-expanded:text-[#f8fafc]",
        destructive:
          "bg-[#fdeceb] dark:bg-[#d14341]/20 text-[#b3352f] dark:text-[#f87171] hover:bg-[#f9dbd9] dark:hover:bg-[#d14341]/30 focus-visible:ring-danger/30",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        // Lines up with the h-12 form controls.
        lg: "h-12 gap-2 px-5 text-base has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-10",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
