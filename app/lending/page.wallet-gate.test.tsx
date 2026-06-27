import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test/test-utils";
import LendingPage from "./page";

// These tests mock wallet/session state by controlling /api/auth/session.

describe("Lending wallet connection gate", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();

    fetchMock.mockImplementation(async (url: string, opts?: any) => {
      // Lending page hydrates interest rates.
      if (String(url).startsWith("/api/markets")) {
        return {
          ok: true,
          json: async () => ({
            markets: [{ asset: "XLM", supplyApr: 7.2, borrowApr: 11.4 }],
          }),
        };
      }

      // Wallet gate checks for auth session.
      if (url === "/api/auth/session") {
        return {
          ok: true,
          json: async () => ({ session: { user: { walletAddress: null } } }),
        };
      }

      // Connect flow endpoints. For this test, we just return success.
      if (url === "/api/auth/challenge" && opts?.method === "POST") {
        return {
          ok: true,
          json: async () => ({ transaction: "dummy" }),
        };
      }

      if (url === "/api/auth/verify" && opts?.method === "POST") {
        return {
          ok: true,
          json: async () => ({ walletAddress: "GCONNECTED" }),
        };
      }

      return {
        ok: false,
        status: 404,
        json: async () => ({}),
      };
    });

    // @ts-expect-error - window.stellar is injected for tests.
    window.stellar = {
      getPublicKey: vi.fn().mockResolvedValue("GDUMMY"),
      signTransaction: vi.fn().mockResolvedValue("signed"),
    };

    // @ts-expect-error
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows connect wallet prompt when disconnected", async () => {
    render(<LendingPage />);

    // Wait for wallet gate to finish checking.
    expect(
      await screen.findByRole("button", { name: /connect wallet/i }),
    ).toBeInTheDocument();

    // Inputs should still exist (gate must not block exploration).
    expect(screen.getByLabelText(/amount to lend/i)).toBeInTheDocument();
  });

  it("re-enables submit after connect", async () => {
    render(<LendingPage />);

    const connectButton = await screen.findByRole("button", {
      name: /connect wallet/i,
    });

    fireEvent.click(connectButton);

    // After connect, the gate should re-check /api/auth/session and hide.
    // Mock update: next /api/auth/session call should show connected.
    fetchMock.mockImplementation(async (url: string, opts?: any) => {
      if (String(url).startsWith("/api/markets")) {
        return {
          ok: true,
          json: async () => ({
            markets: [{ asset: "XLM", supplyApr: 7.2, borrowApr: 11.4 }],
          }),
        };
      }

      if (url === "/api/auth/session") {
        return {
          ok: true,
          json: async () => ({ session: { user: { walletAddress: "GME" } } }),
        };
      }

      if (url === "/api/auth/challenge" && opts?.method === "POST") {
        return {
          ok: true,
          json: async () => ({ transaction: "dummy" }),
        };
      }

      if (url === "/api/auth/verify" && opts?.method === "POST") {
        return {
          ok: true,
          json: async () => ({ walletAddress: "GME" }),
        };
      }

      return {
        ok: false,
        status: 404,
        json: async () => ({}),
      };
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /connect wallet/i }),
      ).not.toBeInTheDocument();
    });

    // Submit should be reachable.
    const submit = screen.getByRole("button", { name: /review lending offer/i });
    expect(submit).toBeInTheDocument();
  });
});

