
export const postMessageSource = (callback: (event: MessageEvent<any>) => void): void => {
    window.addEventListener("message", callback, false)
}