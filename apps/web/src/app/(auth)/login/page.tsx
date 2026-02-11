import { LoginForm } from "./login-form";

export const metadata = {
  title: "Sign In - CSFIRM",
  description: "Sign in to your account",
};

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Sign in to your account
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Access the CSFIRM platform to manage your firm
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
