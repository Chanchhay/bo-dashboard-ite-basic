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
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-accent aria-invalid:ring-2 aria-invalid:ring-accent/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-primary/90",
        outline:
          "border-[#e8e8e8] bg-white text-[#1a222b] hover:bg-[#f7f8f7] aria-expanded:bg-[#f7f8f7]",
        // Secondary is amber; white on it fails contrast, so it wears dark ink.
        secondary:
          "bg-secondary text-[#3d2c00] hover:bg-secondary/85 aria-expanded:bg-secondary",
        ghost:
          "text-[#5c6660] hover:bg-[#f2f3f1] hover:text-[#1a222b] aria-expanded:bg-[#f2f3f1] aria-expanded:text-[#1a222b]",
        destructive:
          "bg-[#fdeceb] text-[#b3352f] hover:bg-[#f9dbd9] focus-visible:ring-accent/30",
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
