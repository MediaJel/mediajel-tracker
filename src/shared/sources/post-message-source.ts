import { guard } from "src/shared/utils/guard";

export const postMessageSource = (callback: (event: MessageEvent<any>) => void): void => {
  window.addEventListener("message", guard(callback, "post-message"), false);
};
