const wixTrackerDataSource = ({
    addToCartEvent,
    removeFromCartEvent,
    transactionEvent,
}: {
    addToCartEvent: (data: any) => void;
    removeFromCartEvent: (data: any) => void;
    transactionEvent: (data: any) => void;
}) => {

    function registerListeners() {
        window.wixDevelopersAnalytics.register('conversionListener', (e, p) => {
           console.log("e", e);
            console.log("p", p);
        });
    }

    window.addEventListener('load', () => {
        registerListeners();
    });

    window.wixDevelopersAnalytics.register('AddToCart', (e, p) => {
        addToCartEvent({
            sku: (p.sku || "N/A").toString(),
            name: (p.name || "N/A").toString(),
            category: (p.category || "N/A").toString(),
            unitPrice: parseFloat(p.price),
            quantity: parseFloat(p.quantity),
            currency: (p.currency || "USD").toString(),
        });
    });

    window.wixDevelopersAnalytics.register('RemoveFromCart', (e, p) => {
        removeFromCartEvent({
            sku: (p.sku || "N/A").toString(),
            name: (p.name || "N/A").toString(),
            category: (p.category || "N/A").toString(),
            unitPrice: parseFloat(p.price),
            quantity: parseFloat(p.quantity),
            currency: (p.currency || "USD").toString(),
        });
    });

    window.wixDevelopersAnalytics.register('Transaction', (e, p) => {
        transactionEvent(p);
    });
};