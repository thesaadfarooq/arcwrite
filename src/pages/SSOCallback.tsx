import { AuthenticateWithRedirectCallback } from "@clerk/react";

export default function SSOCallback() {
  return (
    <AuthenticateWithRedirectCallback
      signInForceRedirectUrl="/dashboard"
      signUpForceRedirectUrl="/dashboard"
    />
  );
}
