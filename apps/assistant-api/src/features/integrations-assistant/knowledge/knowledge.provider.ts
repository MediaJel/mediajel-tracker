import { Injectable } from "@nestjs/common";

import {
  CONVENTIONS,
  FRICTIONLESS_TYPES,
  HELPER_SIGNATURES,
  TEMPLATE_DATALAYER,
  TEMPLATE_SIGNUP,
  TEMPLATE_XHR,
} from "./knowledge.constants";

/**
 * What the model is told about MediaJel integrations, behind one seam.
 *
 * The seam exists for one reason: in amplication-nestjs-microservices this is replaced by
 * knowledge-base's VectorSearchService + embeddings, so the assistant retrieves the relevant
 * templates and conventions instead of sending all of them every time, and the AI Gateway can
 * answer integration questions from the same corpus. Nothing above this interface knows which
 * implementation is bound, so that swap is a provider binding and no more.
 */
export interface IntegrationsKnowledge {
  /** The ambient payload types the generated file compiles against. */
  types(): Promise<string>;
  /** The allowlisted helpers a tag may import. */
  helpers(): Promise<string>;
  /** The house rules a tag must follow. */
  conventions(): Promise<string>;
  /** Real shipped tags, as structural examples. */
  templates(goal: "transaction" | "signup"): Promise<string[]>;
}

export const INTEGRATIONS_KNOWLEDGE = Symbol("INTEGRATIONS_KNOWLEDGE");

/**
 * The constants implementation: everything, every time. Correct and cache-friendly at this
 * corpus size — three templates and one type block — and honest about being the floor rather
 * than pretending to retrieve.
 */
@Injectable()
export class StaticIntegrationsKnowledge implements IntegrationsKnowledge {
  async types(): Promise<string> {
    return FRICTIONLESS_TYPES;
  }

  async helpers(): Promise<string> {
    return HELPER_SIGNATURES;
  }

  async conventions(): Promise<string> {
    return CONVENTIONS;
  }

  /**
   * All three travel regardless of goal. The sign-up template teaches the shape of a sign-up
   * tag, but the dataLayer and XHR templates teach how to *observe* a page, which is the harder
   * half of either job — dropping them for sign-ups would make those tags worse.
   */
  async templates(): Promise<string[]> {
    return [TEMPLATE_DATALAYER, TEMPLATE_XHR, TEMPLATE_SIGNUP];
  }
}
