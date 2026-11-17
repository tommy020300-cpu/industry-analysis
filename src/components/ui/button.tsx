import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva("button-base", { variants: {
  variant: { default: "button-primary", secondary: "button-secondary", outline: "button-outline", ghost: "button-ghost", destructive: "button-destructive" },
  size: { default: "button-md", sm: "button-sm", lg: "button-lg", icon: "button-icon" },
}, defaultVariants: { variant: "default", size: "default" }});

export type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean };
export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
