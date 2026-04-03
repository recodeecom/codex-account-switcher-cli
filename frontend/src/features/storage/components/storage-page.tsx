import { Archive } from "lucide-react";

import { EmptyState } from "@/components/empty-state";

export function StoragePage() {
  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Storage</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Secure storage for devices and API environment values is coming soon.
        </p>
      </div>

      <EmptyState
        icon={Archive}
        title="Storage is coming soon"
        description="Codexina will add secure device storage and protected API env value storage in a future release."
      />
    </div>
  );
}
