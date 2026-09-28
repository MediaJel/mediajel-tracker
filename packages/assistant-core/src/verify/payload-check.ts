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
  /** What is wrong, said to the operator: the field, what is wrong with it, and what it costs. */
  problems: string[];
  /** The validator's own words for the same failures, for whoever wants them. */
  raw: string[];
  hints: string[];
}

/**
 * The checks, in the operator's language.
 *
 * This verdict is the gate in front of `master`: a tag that fires an empty id ships bad data for as
 * long as it runs. It used to print zod's own sentences — "id: Too small: expected string to have
 * >=1 characters" — which say what a library rejected, not what the tag got wrong or what it costs.
 * The library's words are kept, one disclosure away, for whoever is debugging the check itself.
 */
const FIELDS: Record<string, { name: string; costs: string }> = {
  id: {
    name: "The transaction id",
    costs: "MediaJel counts one transaction per id, so this sale cannot be told apart from the next one.",
  },
  total: { name: "The order total", costs: "Revenue is reported from it." },
  tax: { name: "The tax", costs: "It is taken out of the revenue this sale reports." },
  shipping: { name: "The shipping", costs: "It is taken out of the revenue this sale reports." },
  currency: { name: "The currency", costs: "Without it the amounts are read as dollars." },
  city: { name: "The buyer's city", costs: "Location reporting reads it." },
  state: { name: "The buyer's state", costs: "Location reporting reads it." },
  country: { name: "The buyer's country", costs: "Location reporting reads it." },
  items: { name: "The basket", costs: "Per-product reporting reads it." },
  uuid: { name: "The sign-up's id", costs: "MediaJel counts one sign-up per id." },
};

/** What the validator objected to, in words that name the value rather than the rule. */
const CAUSES: Record<string, string> = {
  too_small: "is empty",
  too_big: "is longer than the tag accepts",
  invalid_type: "is the wrong kind of value",
  invalid_format: "is not in the shape the tag expects",
};

const causeOf = (code: string): string => CAUSES[code] ?? "is not something the tag can send";

/** A field's failure as one sentence; a check that names no field keeps its own words. */
const said = (path: string, code: string, message: string): string => {
  const field = FIELDS[path];
  if (!field) return path ? `${path} ${causeOf(code)}.` : `${message}.`;
  return `${field.name} ${causeOf(code)}. ${field.costs}`;
};

export const checkPayload = (call: InterceptedCall, goal: WidgetGoal, marked: TimelineEvent[]): PayloadVerdict => {
  const problems: string[] = [];
  const raw: string[] = [];
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
      const path = issue.path.join(".");
      problems.push(said(path, issue.code, issue.message));
      raw.push(`${path || "payload"}: ${issue.message}`);
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

  return { ok: problems.length === 0, problems, raw, hints };
};
