import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => {
  // DAW-style double-click to reset to the value it first rendered with.
  const initial = React.useRef(props.value ?? props.defaultValue);
  const onDoubleClick = () => {
    if (initial.current != null) props.onValueChange?.(initial.current as number[]);
  };
  return (
  <SliderPrimitive.Root
    ref={ref}
    title="Double-click to reset"
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
    onDoubleClick={onDoubleClick}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-white/10">
      <SliderPrimitive.Range className="absolute h-full bg-white/60" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-white/60 bg-white/90 ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
  );
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
