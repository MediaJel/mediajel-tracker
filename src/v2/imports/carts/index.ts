import { QueryStringContext } from "../../../shared/types";


export default async (context: QueryStringContext): Promise<void> => {
    const { appId, environment, retailId } = context;
    switch (environment) {
        //* STABLE
        case "buddi": import("./buddi").then(({ default: load }): void => load({ appId, retailId }));
            break;
        default: throw new Error("Undefined environment")
    }
}