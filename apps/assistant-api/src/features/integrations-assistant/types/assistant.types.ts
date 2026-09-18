/** The vocabulary the module shares with the extension. Kept local so the module has no
 *  cross-package runtime dependency to carry when it moves to amplication. */

export type WidgetGoal = "transaction" | "signup";
export type DeployTargetKind = "domain" | "app-id";

/** A verified MediaJel account. The only identity this service recognises. */
export interface Authorized {
  username: string;
  email: string;
  name: string;
  sub: string;
}

/** Attached to the request by CognitoGuard and read by the controller. */
export interface AuthorizedRequest {
  mjUser?: Authorized;
}
