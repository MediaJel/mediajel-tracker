import { Transactions, Impressions } from "../../shared/types";

export const chooseCart = async (context: Transactions) => {
    const { appId, environment, retailId } = context;


    switch (environment) {
        //* STABLE
        case "jane": {
            const { default: func } = await import("../imports/carts/jane");
            func({ appId, retailId });
            break;
        }
        //* STABLE
        case "dutchie-subdomain": {
            const { default: func } = await import(
                "../imports/carts/dutchie-subdomain"
            );
            func({ appId, retailId });
            break;
        }
        //* STABLE
        case "dutchie-iframe": {
            const { default: func } = await import(
                "../imports/carts/dutchie-iframe"
            );
            func({ appId, retailId });
            break;
        }
        //* STABLE
        case "meadow": {
            const { default: func } = await import("../imports/carts/meadow");
            func({ appId, retailId });
            break;
        }
        //* STABLE
        case "tymber": {
            const { default: func } = await import("../imports/carts/tymber");
            func({ appId, retailId });
            break;
        }
        //* STABLE
        case "woocommerce": {
            const { default: func } = await import(
                "../imports/carts/woocommerce"
            );
            func({ appId, retailId });
            break;
        }
        //* STABLE 
        case "greenrush": {
            const { default: func } = await import("../imports/carts/greenrush");
            func({ appId, retailId });
            break;
        }
        //* STABLE
        case "buddi": {
            const { default: func } = await import("../imports/carts/buddi");
            func({ appId, retailId });
            break;
        }
        //* STABLE
        case "shopify": {
            const { default: func } = await import("../imports/carts/shopify");
            func({ appId, retailId });
            break;
        }
        //* STABLE
        case "lightspeed": {
            const { default: func } = await import("../imports/carts/lightspeed");
            func({ appId, retailId });
            break;
        }
        //* STABLE
        case "olla": {
            const { default: func } = await import("../imports/carts/olla");
            func({ appId, retailId });
            break;
        }
        default:
            console.error("Undefined environment");
            break;
    }
}

export const chooseImpression = async (context: Impressions) => {
    const { environment } = context;

    switch (environment) {
        case "liquidm": {
            const { default: func } = await import("../imports/impressions/liquidm");
            func();
            break;
        }
        case "ttd": {
            const { default: func } = await import("../imports/impressions/ttd");
            func();
            break;
        }
        default:
            console.error("Undefined environment");
            break;
    }
}
