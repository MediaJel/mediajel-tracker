import { guard } from "src/shared/utils/guard";

export const xhrResponseSource = (callback: (xhrResponse: XMLHttpRequest) => void): void => {
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (...args: any[]): void {
    this.addEventListener("load", guard((): void => callback(this), "xhr-response"));
    origOpen.apply(this, args as Parameters<typeof origOpen>);
  };
};
