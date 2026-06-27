"use client";

import { useEffect, useState } from "react";
import Button from "@/components/shared/ui/Button";

type Props = {
  /** Accessible label for the prompt */
  label?: string;
  /** Button text */
  connectText?: string;
};

/**
 * Wallet gate for unauthenticated users.
 *
 * Current implementation derives connection state from the presence of an
 * authenticated session (walletAddress) via `/api/auth/session`.
 */
export default function WalletConnectGate({
  label = "Connect wallet",
  connectText = "Connect wallet",
}: Props) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const res = await fetch("/api/auth/session");
        if (!res.ok) return;
        const data = await res.json();
        const addr = data?.session?.user?.walletAddress;
        if (!cancelled) setWalletAddress(addr ?? null);
      } catch {
        // ignore; stay disconnected
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    checkSession();
    return () => {
      cancelled = true;
    };
  }, []);

  // When checking, keep content interactive (no hard block yet).
  if (checking) return null;

  // Connected
  if (walletAddress) return null;

  const handleConnect = async () => {
    // Reuse the existing wallet connect flow used in TopNav.
    // That flow expects `window.stellar` (Freighter) and talks to the
    // auth challenge/verify endpoints.
    const stellar = window.stellar;
    if (!stellar) {
      // eslint-disable-next-line no-alert
      alert("Wallet provider not detected (Freighter). Please install it.");
      return;
    }

    const pubKey = await stellar.getPublicKey();
    if (!pubKey) return;

    const challengeResponse = await fetch("/api/auth/challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress: pubKey }),
    });

    if (!challengeResponse.ok) {
      const errData = await challengeResponse.json().catch(() => ({}));
      // eslint-disable-next-line no-alert
      alert(errData?.error || "Failed to generate challenge");
      return;
    }

    const { transaction } = await challengeResponse.json();

    const signedTransaction = await stellar.signTransaction(transaction, {
      network: "TESTNET",
    });

    const verifyResponse = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transaction: signedTransaction }),
    });

    if (!verifyResponse.ok) {
      const errData = await verifyResponse.json().catch(() => ({}));
      // eslint-disable-next-line no-alert
      alert(errData?.error || "Verification failed");
      return;
    }

    // Refresh gate state.
    const res = await fetch("/api/auth/session");
    if (!res.ok) return;
    const data = await res.json();
    const addr = data?.session?.user?.walletAddress ?? null;
    setWalletAddress(addr);
  };

  return (
    <div
      role="region"
      aria-label={label}
      className="absolute inset-0 z-10 rounded-xl bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-6"
    >
      <div className="w-full max-w-md text-center space-y-4">
        <div
          className="text-sm font-semibold text-gray-900"
          id="wallet-connect-prompt-title"
        >
          Wallet connection required
        </div>
        <div className="text-xs text-gray-600">
          Connect your wallet to submit lend/borrow/repay/withdraw transactions.
        </div>
        <Button
          type="button"
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleConnect}
        >
          {connectText}
        </Button>
      </div>
    </div>
  );
}

