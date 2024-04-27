import { QueryStringContext } from "../../../shared/types";

export default async (context: QueryStringContext): Promise<void> => {
    const { environment } = context;

    switch (environment) {
        case "liquidm": import("./liquidm").then(({ default: load }): void => load(context));
            break;
        case "ttd": import("./ttd").then(({ default: load }): void => load());
            break;
        case "mantis": import("./mantis").then(({ default: load }): void => load(context));
            break;
        case "simplifi": import("./simplifi").then(({ default: load }): void => load(context));
            break;

        default:
            console.warn("Undefined Impression environment");
            break;
    }
}