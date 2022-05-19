


export const tryParseJSONObject = (str: string): string | any => {
    try {
        const o: any = JSON.parse(str);
        if (o && typeof o === "object") {
            return o;
        }
    }
    catch (e) { }

    return str;
};