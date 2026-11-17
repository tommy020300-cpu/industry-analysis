import * as React from "react";
import { cn } from "@/lib/utils";
export function Field({ label, note, children, className }: { label:string, note?:string, children:React.ReactNode, className?:string }) { return <label className={cn("field",className)}><span className="field-label">{label}{note&&<small>{note}</small>}</span>{children}</label> }
export function NativeSelect({className, ...props}:React.ComponentProps<"select">) {return <select className={cn("field-input field-select",className)} {...props}/>}
