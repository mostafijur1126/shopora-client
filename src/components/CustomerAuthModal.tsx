import React, { useState } from "react";
import { Loader2, LockKeyhole, X } from "lucide-react";

interface CustomerAuthModalProps {
  onClose: () => void;
  onAuthenticate: (
    mode: "login" | "signup",
    credentials: { name?: string; email: string; password: string },
  ) => Promise<void>;
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  onClose,
  onAuthenticate,
}) => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      await onAuthenticate(mode, {
        ...(mode === "signup" ? { name: name.trim() } : {}),
        email: email.trim(),
        password,
      });
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to sign in. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-auth-title"
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden"
      >
        <div className="flex items-start justify-between gap-4 bg-[#00503a] px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
              <LockKeyhole className="h-5 w-5" />
            </span>
            <div>
              <h2 id="customer-auth-title" className="text-lg font-extrabold">
                {mode === "login" ? "Customer login" : "Create your account"}
              </h2>
              <p className="mt-1 text-xs text-emerald-100">
                Guest checkout is always available.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 p-6">
          {mode === "signup" && (
            <label className="block text-sm font-semibold text-gray-700">
              Full name
              <input
                autoComplete="name"
                required
                minLength={2}
                maxLength={150}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-gray-300 px-3 outline-none focus:border-[#00503a] focus:ring-2 focus:ring-[#00503a]/15"
              />
            </label>
          )}
          <label className="block text-sm font-semibold text-gray-700">
            Email
            <input
              type="email"
              autoComplete="email"
              required
              maxLength={200}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-gray-300 px-3 outline-none focus:border-[#00503a] focus:ring-2 focus:ring-[#00503a]/15"
            />
          </label>
          <label className="block text-sm font-semibold text-gray-700">
            Password
            <input
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={mode === "signup" ? 8 : 1}
              maxLength={72}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-gray-300 px-3 outline-none focus:border-[#00503a] focus:ring-2 focus:ring-[#00503a]/15"
            />
          </label>

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#00503a] font-bold text-white transition-colors hover:bg-[#003828] disabled:cursor-wait disabled:opacity-70"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "login" ? "Sign in" : "Create account"}
          </button>
          <p className="text-center text-sm text-gray-600">
            {mode === "login" ? "New to Shopora?" : "Already have an account?"}{" "}
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setError("");
                setMode((current) => current === "login" ? "signup" : "login");
              }}
              className="font-bold text-[#00503a] hover:underline"
            >
              {mode === "login" ? "Sign up" : "Log in"}
            </button>
          </p>
        </form>
      </section>
    </div>
  );
};
