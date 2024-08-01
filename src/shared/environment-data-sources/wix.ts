import { EnvironmentEvents, TransactionCartItem } from "../types";

const wixTrackerDataSource = ({
    addToCartEvent,
    removeFromCartEvent,
    transactionEvent,
}: Partial<EnvironmentEvents>) => {

    function registerListeners(){
        window.wixDevelopersAnalytics.register('conversionListener', (e, p) => {
           console.log("e", e);
            console.log("p", p);

            if(e === "AddToCart"){
                addToCartEvent({
                    sku: (p.sku || "N/A").toString(),
                    name: (p.name || "N/A").toString(),
                    category: (p.category || "N/A").toString(),
                    unitPrice: parseFloat(p.price),
                    quantity: parseFloat(p.quantity),
                    currency: (p.currency || "USD").toString(),
                });
            }

            if(e === "RemoveFromCart"){
                removeFromCartEvent({
                    sku: (p.sku || "N/A").toString(),
                    name: (p.name || "N/A").toString(),
                    category: (p.category || "N/A").toString(),
                    unitPrice: parseFloat(p.price),
                    quantity: parseFloat(p.quantity),
                    currency: (p.currency || "USD").toString(),
                });
            }

            if(e === "Purchase"){
                transactionEvent({
                    id: (p.orderId || "N/A").toString(),
                    total: parseFloat(p.revenue || 0),
                    tax: parseFloat(p.tax || 0),
                    shipping: parseFloat(p.shipping || 0),
                    city: "N/A",
                    state: "N/A",
                    country: "N/A",
                    currency: (p.currency || "USD").toString(),
                    items: p.contents.map((product) => {
                        return {
                            orderId: (p.orderId || "N/A").toString(),
                            productId: (product.id || "N/A").toString(),
                            sku: (product.sku || "N/A").toString(),
                            name: (product.name || "N/A").toString(),
                            category: (product.category || "N/A").toString(),
                            unitPrice: parseFloat(product.price || 0),
                            quantity: parseFloat(product.quantity || 1),
                            currency: (p.currency || "USD").toString(),
                        } as TransactionCartItem;
                    })
                });
            }
        });
    }

    window.addEventListener('load', () => {
        registerListeners();
    });

};

export default wixTrackerDataSource;