
export const xhrSource = (callback: Function): void => {
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (): void {
        this.addEventListener('load', (): void => callback(this));
        origOpen.apply(this, arguments);
    }
}