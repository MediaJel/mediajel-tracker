
import { EcommerceContext } from "../../interface";

export default function dutchieSubdomainTracker(context: EcommerceContext) {
    const { appId, retailId } = context;

    function receiveMessage(event) {
        const rawData = JSON.parse(event.data);
        if (rawData.payload.event === "ec:addProduct") {
            const cartArray = rawData.payload.playload;
            for (let i = 0, l = cartArray.length; i < l; i++) {
                const cartItem = cartArray[i];
                window.tracker(
                    "trackAddToCart",
                    cartItem.id.toString(),
                    cartItem.name.toString() ?? "N/A",
                    cartItem.category.toString() ?? "N/A",
                    parseInt(cartItem.price) ?? 0,
                    parseInt(cartItem.quantity) ?? 1,
                    "USD"
                );
            }
        }
        if (
            rawData.payload.event == "ec:setAction" &&
            rawData.payload.playload[0] == "purchase"
        ) {
            const transaction = rawData.payload.playload[1];
            window.tracker(
                "addTrans",
                transaction.id,
                !retailId ? appId : retailId,
                transaction.revenue ?? 0,
                0,
                0,
                "N/A",
                "N/A",
                "USA",
                "USD"
            );
            window.tracker("trackTrans");
        }
    }
    window.addEventListener("message", receiveMessage, false);
}
