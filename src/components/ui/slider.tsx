import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const sliderVariants = cva(
  "relative flex w-full touch-none select-none items-center",
  {
    variants: {
      variant: {
        default: "",
        cyan: "",
        magenta: "",
        orange: "",
        green: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const getColors = (variant: string | null | undefined) => {
  switch (variant) {
    case 'cyan':
      return {
        range: 'bg-[hsl(187,100%,50%)]',
        thumb: 'border-[hsl(187,100%,50%)] shadow-[0_0_10px_hsl(187,100%,50%,0.5)]',
      };
    case 'magenta':
      return {
        range: 'bg-[hsl(328,100%,50%)]',
        thumb: 'border-[hsl(328,100%,50%)] shadow-[0_0_10px_hsl(328,100%,50%,0.5)]',
      };
    case 'orange':
      return {
        range: 'bg-[hsl(25,100%,60%)]',
        thumb: 'border-[hsl(25,100%,60%)] shadow-[0_0_10px_hsl(25,100%,60%,0.5)]',
      };
    case 'green':
      return {
        range: 'bg-[hsl(142,70%,50%)]',
        thumb: 'border-[hsl(142,70%,50%)] shadow-[0_0_10px_hsl(142,70%,50%,0.5)]',
      };
    default:
      return {
        range: 'bg-primary',
        thumb: 'border-primary',
      };
  }
};

interface SliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>,
    VariantProps<typeof sliderVariants> {}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, variant, ...props }, ref) => {
  const colors = getColors(variant);
  
  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(sliderVariants({ variant }), className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted">
        <SliderPrimitive.Range className={cn("absolute h-full", colors.range)} />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb 
        className={cn(
          "block h-4 w-4 rounded-full border-2 bg-background ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-110 cursor-grab active:cursor-grabbing",
          colors.thumb
        )} 
      />
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
