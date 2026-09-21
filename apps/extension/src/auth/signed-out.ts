/**
 * The code a failure carries when the session is over and the operator has to sign in again: nobody
 * signed in, Cognito refused the refresh token, or the service refused the ID token. Its own module so
 * the panel can know it without loading anything that talks to Cognito.
 */
export const SIGNED_OUT = "signed-out";
