import { SIGNED_OUT } from "~/auth/signed-out";
import { Response } from "~/bridge/api";
import { endsSession } from "~/service/client";
import { clearSession } from "~/store/auth";

/**
 * A failed request as the panel receives it.
 *
 * A failure that means the session is over ends the session here — the stored tokens go — and is
 * answered as `signed-out`, which sends the panel to sign in with the reason. It used to come back as
 * one more error line under whatever the operator had pressed, while the panel went on showing them
 * signed in and every call after it failed the same way.
 */
export const failureAnswer = async (err: unknown): Promise<Extract<Response<never>, { ok: false }>> => {
  const error = err instanceof Error ? err.message : String(err);
  if (!endsSession(err)) return { ok: false, error, code: (err as { code?: string } | null)?.code };
  await clearSession();
  return { ok: false, error, code: SIGNED_OUT };
};
