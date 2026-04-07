import { KeyRound } from "lucide-react";
import { type FormEvent, useState } from "react";

import { AlertMessage } from "@/components/alert-message";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { MedusaAdminLoginRequestSchema } from "@/features/medusa-auth/schemas";
import { useMedusaAdminAuthStore } from "@/features/medusa-auth/hooks/use-medusa-admin-auth";

type MedusaAdminLoginDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MedusaAdminLoginDialog({
  open,
  onOpenChange,
}: MedusaAdminLoginDialogProps) {
  const login = useMedusaAdminAuthStore((state) => state.login);
  const loading = useMedusaAdminAuthStore((state) => state.loading);
  const error = useMedusaAdminAuthStore((state) => state.error);
  const clearError = useMedusaAdminAuthStore((state) => state.clearError);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setValidationError(null);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = MedusaAdminLoginRequestSchema.safeParse({ email, password });
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Please provide valid credentials.";
      setValidationError(message);
      return;
    }

    setValidationError(null);
    clearError();
    await login(parsed.data.email, parsed.data.password);
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          clearError();
          resetForm();
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />
            Medusa Admin Sign In
          </DialogTitle>
          <DialogDescription>
            Authenticate against your Medusa backend admin user credentials.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="medusa-admin-email">
              Email
            </label>
            <Input
              id="medusa-admin-email"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
              type="email"
              placeholder="admin@example.com"
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="medusa-admin-password">
              Password
            </label>
            <Input
              id="medusa-admin-password"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              type="password"
              autoComplete="current-password"
              placeholder="Enter password"
              disabled={loading}
            />
          </div>

          {validationError ? <AlertMessage variant="error">{validationError}</AlertMessage> : null}
          {error ? <AlertMessage variant="error">{error}</AlertMessage> : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Spinner size="sm" className="mr-2" /> : null}
            Sign in
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
