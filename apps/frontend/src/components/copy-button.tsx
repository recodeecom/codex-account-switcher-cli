import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CopyButtonProps = {
  value: string;
  label?: string;
  onCopied?: () => void;
  className?: string;
};

export function CopyButton({ value, label = "Copy", onCopied, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      onCopied?.();
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" className={cn(className)} onClick={handleCopy}>
      {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
      {copied ? "Copied" : label}
    </Button>
  );
}
