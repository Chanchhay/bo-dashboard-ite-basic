import * as React from "react"

import { cn } from "@/lib/utils"
import { textareaClassName } from "@/components/ui/form-controls"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        textareaClassName,
        "flex field-sizing-content resize-none",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
