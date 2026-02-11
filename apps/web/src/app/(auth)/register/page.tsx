import { RegisterForm } from "./register-form";

export const metadata = {
  title: "Register - CSFIRM",
  description: "Create your account",
};

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Get started with the CSFIRM platform
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
