import { status } from "@/lib/account";
import { SignInForm } from "@/components/SignInForm";
import { AccountsClosed, AuthShell } from "@/components/auth/AuthShell";

export const metadata = { title: "Sign in - Hifz Trail" };

/** Sign in, or the truth about why you cannot yet: no form until there is somewhere for it to post to. */
export default function SignIn() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to bring your trail to this device.">
      {status().kind === "not-configured" ? <AccountsClosed /> : <SignInForm mode="login" />}
    </AuthShell>
  );
}
