import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import * as SliderPrimitive from "@radix-ui/react-slider"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { X } from "lucide-react"
import { cn } from "../utils/cn"

/* -- Button -- */
export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "outline" | "danger" }
>(({ className, variant = "primary", ...props }, ref) => {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-40 cursor-pointer"
  const styles = {
    primary: "bg-white text-black hover:bg-white/90 shadow-lg shadow-white/10",
    ghost: "bg-white/5 text-white/80 hover:bg-white/10 hover:text-white",
    outline: "border border-white/10 bg-transparent text-white/80 hover:bg-white/5 hover:border-white/20",
    danger: "bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25",
  }
  return <button ref={ref} className={cn(base, styles[variant], className)} {...props} />
})
Button.displayName = "Button"

/* -- Badge -- */
export function Badge({ children, className, color }: { children: React.ReactNode; className?: string; color?: string }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider", className)}
      style={color ? { backgroundColor: `${color}18`, color, border: `1px solid ${color}35` } : {}}
    >
      {children}
    </span>
  )
}

/* -- Dialog (modal) - uses CSS classes from index.css, NOT Tailwind translate utilities -- */
export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogPortal = DialogPrimitive.Portal
export const DialogClose = DialogPrimitive.Close

export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay ref={ref} className={cn("modal-overlay", className)} {...props} />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { wide?: boolean; tall?: boolean }
>(({ className, children, wide, tall, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "modal-panel",
        wide && "modal-wide",
        tall && "modal-tall",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-2 text-white/40 hover:bg-white/10 hover:text-white transition-colors">
        <X className="h-4 w-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-lg font-bold text-white", className)} {...props} />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-white/50", className)} {...props} />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

/* -- Tabs -- */
export const Tabs = TabsPrimitive.Root
export const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.List ref={ref} className={cn("inline-flex gap-1 rounded-2xl bg-white/5 p-1", className)} {...props} />
  )
)
TabsList.displayName = TabsPrimitive.List.displayName
export const TabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn("rounded-xl px-3 py-1.5 text-xs font-semibold text-white/50 transition-all data-[state=active]:bg-white data-[state=active]:text-black", className)}
      {...props}
    />
  )
)
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

/* -- Slider -- */
export interface SliderProps extends Omit<React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>, "onValueChange"> {
  onValueChange?: (value: number[]) => void
}
export const Slider = React.forwardRef<React.ElementRef<typeof SliderPrimitive.Root>, SliderProps>(
  ({ className, onValueChange, ...props }, ref) => (
    <SliderPrimitive.Root ref={ref} className={cn("relative flex w-full touch-none select-none items-center", className)} onValueChange={onValueChange as any} {...props}>
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-white/10">
        <SliderPrimitive.Range className="absolute h-full bg-white" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border-2 border-white bg-surface shadow transition-colors focus:outline-none" />
    </SliderPrimitive.Root>
  )
)
Slider.displayName = SliderPrimitive.Root.displayName

/* -- Switch -- */
export interface SwitchProps extends Omit<React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>, "onCheckedChange"> {
  onCheckedChange?: (checked: boolean) => void
}
export const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitive.Root>, SwitchProps>(
  ({ className, onCheckedChange, ...props }, ref) => (
    <SwitchPrimitive.Root ref={ref} className={cn("peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none data-[state=checked]:bg-white data-[state=unchecked]:bg-white/15", className)} onCheckedChange={onCheckedChange as any} {...props}>
      <SwitchPrimitive.Thumb className="pointer-events-none block h-5 w-5 rounded-full bg-black shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" />
    </SwitchPrimitive.Root>
  )
)
Switch.displayName = SwitchPrimitive.Root.displayName
