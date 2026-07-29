import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"
import { controlClassName } from "@/components/ui/form-controls"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        controlClassName,
        "min-w-0 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground disabled:pointer-events-none",
        className
      )}
      {...props}
    />
  )
}

export { Input }
