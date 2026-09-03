"use client";
import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const Checkbox=React.forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>,React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>>(({className,...props},ref)=><CheckboxPrimitive.Root ref={ref} className={cn("peer size-5 shrink-0 rounded border border-[#819B56] bg-white shadow-sm outline-none data-[state=checked]:bg-[#1D4F36] data-[state=checked]:text-white focus-visible:ring-2 focus-visible:ring-[#819B56]",className)} {...props}><CheckboxPrimitive.Indicator className="grid place-items-center"><Check className="size-4"/></CheckboxPrimitive.Indicator></CheckboxPrimitive.Root>);
Checkbox.displayName="Checkbox";
export{Checkbox};
