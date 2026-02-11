import type { ReactNode } from "react";

export const metadata = {
  title: "Authentication - CSFIRM",
  description: "Sign in or register for the CSFIRM platform",
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950">
      {/* Header / Logo */}
      <div className="flex justify-center pt-12 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
            CS
          </div>
          <span className="text-2xl font-bold tracking-tight text-foreground">
            CSFIRM
          </span>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-sm text-muted-foreground">CSFIRM Platform</p>
      </footer>
    </div>
  );
}
