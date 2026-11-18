import { status } from "@/lib/account";
import { SignInForm } from "@/components/SignInForm";
import { AccountsClosed, AuthShell } from "@/components/auth/AuthShell";

export const metadata = { title: "Create an account - Hifz Trail" };

export default function SignUp() {
  return (
    <AuthShell title="Create your free account" subtitle="Keep your trail safe and use it on every device. It takes a minute.">
      {status().kind === "not-configured" ? <AccountsClosed /> : <SignInForm mode="register" />}
    </AuthShell>
  );
}
