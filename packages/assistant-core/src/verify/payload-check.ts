import { InterceptedCall } from "@mediajel/assistant-core/verify/interceptor";
import { TimelineEvent, WidgetGoal } from "@mediajel/assistant-core/types";
import { z } from "zod";

/**
 * Sanity checks on what the generated code actually fired. Failures block Deploy — a tag
 * that sends an empty id ships bad data forever; hints do not block, they inform.
 */

const TransactionCheck = z.object({
  id: z.string().min(1),
  total: z.number().finite(),
  tax: z.number().finite(),
  shipping: z.number().finite(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  currency: z.string().min(1),
  items: z.array(
    z.object({
      orderId: z.string(),
      sku: z.string(),
      name: z.string(),
      category: z.string(),
      unitPrice: z.number().finite(),
      quantity: z.number().finite(),
      currency: z.string(),
    }),
  ),
});

const SignupCheck = z
  .object({
    uuid: z.string().min(1),
    emailAddress: z.string().optional(),
    hashedEmailAddress: z.string().optional(),
  })
  .refine((value) => !!value.emailAddress || !!value.hashedEmailAddress, {
    message: "neither emailAddress nor hashedEmailAddress present",
  });

export interface PayloadVerdict {
  ok: boolean;
  problems: string[];
  hints: string[];
}

export const checkPayload = (call: InterceptedCall, goal: WidgetGoal, marked: TimelineEvent[]): PayloadVerdict => {
  const problems: string[] = [];
  const hints: string[] = [];

  if (goal === "transaction" && call.name !== "trackTrans") {
    hints.push(`the code called ${call.name}, not trackTrans`);
  }
  if (goal === "signup" && call.name !== "trackSignUp") {
    hints.push(`the code called ${call.name}, not trackSignUp`);
  }

  const schema = call.name === "trackSignUp" ? SignupCheck : TransactionCheck;
  const parsed = schema.safeParse(call.payload);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      problems.push(`${issue.path.join(".") || "payload"}: ${issue.message}`);
    }
  }

  // Does the payload trace back to the pinned evidence? Purely informative.
  const evidence = JSON.stringify(marked);
  const payload = call.payload as Record<string, unknown> | null;
  if (payload && typeof payload === "object") {
    const id = String((payload as { id?: unknown }).id ?? "");
    if (id && evidence.includes(id)) hints.push(`id "${id}" matches the pinned evidence`);
    else if (id) hints.push(`id "${id}" does not appear in the pinned evidence — is it the right field?`);
    if (call.fromReplay)
      hints.push("fired from a dataLayer entry that predates this run (a replay, not a fresh action)");
  }

  return { ok: problems.length === 0, problems, hints };
};
