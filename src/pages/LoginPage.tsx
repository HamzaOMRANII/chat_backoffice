import { useState, type FormEvent } from "react";
import { Logo, Wordmark } from "../components/Logo";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";

export function LoginPage() {
  const [notice, setNotice] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    // Admin accounts arrive in milestone M1; until then the form is shown for review only.
    setNotice("Admin sign-in opens in the next release.");
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

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-4 rounded-card border border-line-strong bg-panel px-5 py-[22px] shadow-[8px_8px_0_#ffffff10]"
        >
          <h2 className="m-0 text-2xl font-extrabold tracking-[-0.02em]">Administrator sign in</h2>
          <TextField label="Admin username" name="username" autoComplete="username" autoCapitalize="none" required />
          <TextField label="Password" name="password" type="password" autoComplete="current-password" required />
          <Button type="submit" block>
            Continue
          </Button>
          <p className="m-0 text-center text-[13px] text-dim" role="status">
            {notice || "Next step: a 6-digit code sent to the admin email"}
          </p>
        </form>

        <p className="m-0 text-center font-mono text-[11px] text-faint">
          Restricted area · every action is logged
        </p>
      </div>
    </main>
  );
}
