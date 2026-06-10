"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ReadingManagerClient from "./reading-manager-client";
import { createClient } from "../lib/supabase/client";

type SignedInShellProps = {
  userId: string;
};

export default function SignedInShell({ userId }: SignedInShellProps) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [isPending, startTransition] = useTransition();
  const [supabase] = useState(() => createClient());

  const signOut = async () => {
    setStatus("");
    const { error } = await supabase.auth.signOut();

    if (error) {
      setStatus(error.message);
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <>
      {status ? <div className="auth-inline-status">{status}</div> : null}
      <ReadingManagerClient ownerUserId={userId} onSignOut={signOut} isSigningOut={isPending} />
    </>
  );
}
