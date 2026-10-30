import { useState, type FormEvent } from "react";
import { Logo, Wordmark } from "../components/Logo";
import { Button } from "../components/Button";
import { CodeInput } from "../components/CodeInput";
import { TextField } from "../components/TextField";
import { Notice } from "../components/ui";
import { api, deviceInfo } from "../lib/api";

type Challenge = { challengeId: string; emailHint: string };

/** Administrator sign-in: password, then the 6-digit code sent to the admin email. */
export function LoginPage({ onSignedIn }: { onSignedIn: (admin: string) => void }) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function onPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    void run(async () => {
      setChallenge(
        await api<Challenge>("/auth/login", {
          body: {
            username: String(form.get("username") ?? "")
              .trim()
              .toLowerCase(),
            password: form.get("password"),
            device: deviceInfo(),
          },
        }),
      );
    });
  }

  function onCode(e: FormEvent) {
    e.preventDefault();
    void run(async () => {
      try {
        const res = await api<{ admin: { username: string } }>("/auth/verify-code", { body: { challengeId: challenge!.challengeId, code } });
        onSignedIn(res.admin.username);
      } catch (err) {
        setCode("");
        throw err;
      }
    });
  }

  return (
    <main className="bg-grid grid min-h-dvh place-items-center px-4 py-10">
      <div className="flex w-full max-w-[420px] flex-col gap-7">
        <header className="flex items-center gap-3.5">
          <Logo size={56} />
          <div className="flex flex-col gap-1">
            <h1 className="m-0 text-[22px]">
              <Wordmark />
            </h1>
            <p className="eyebrow m-0">backoffice</p>
          </div>
        </header>

        {challenge ? (
          <form onSubmit={onCode} className="flex flex-col gap-4 rounded-card border border-line-strong bg-panel px-5 py-[22px] shadow-[8px_8px_0_#ffffff10]">
            <h2 className="m-0 text-2xl font-extrabold tracking-[-0.02em]">Email code</h2>
            <p className="m-0 text-sm text-ink-soft">
              Sent to <span className="font-mono text-ink">{challenge.emailHint}</span>. It works for 5 minutes.
            </p>
            <CodeInput value={code} onChange={setCode} />
            {error ? <Notice tone="error">{error}</Notice> : null}
            <Button type="submit" block disabled={busy || code.length !== 6}>
              {busy ? "Checking…" : "Sign in"}
            </Button>
            <button type="button" onClick={() => setChallenge(null)} className="min-h-10 bg-transparent text-sm font-semibold text-link">
              Start again
            </button>
          </form>
        ) : (
          <form
            onSubmit={onPassword}
            className="flex flex-col gap-4 rounded-card border border-line-strong bg-panel px-5 py-[22px] shadow-[8px_8px_0_#ffffff10]"
          >
            <h2 className="m-0 text-2xl font-extrabold tracking-[-0.02em]">Administrator sign in</h2>
            <TextField label="Admin username" name="username" autoComplete="username" autoCapitalize="none" required />
            <TextField label="Password" name="password" type="password" autoComplete="current-password" required />
            {error ? <Notice tone="error">{error}</Notice> : null}
            <Button type="submit" block disabled={busy}>
              {busy ? "Checking…" : "Continue"}
            </Button>
            <p className="m-0 text-center text-[13px] text-dim">Next step: a 6-digit code sent to the admin email</p>
          </form>
        )}

        <p className="m-0 text-center font-mono text-[11px] text-faint">Restricted area · every action is logged</p>
      </div>
    </main>
  );
}
