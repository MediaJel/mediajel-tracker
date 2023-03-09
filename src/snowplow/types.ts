
interface Transaction {
    orderId: string;
    totalValue: number;
    affiliation?: string;
    taxValue?: number;
    shipping?: number;
    city?: string;
    state?: string;
    country?: string;
    currency?: string;
    items?: TransactionItem[];
}

interface TransactionItem {
    
}

interface SnowplowTracker {
    trackTransaction: (transaction: Transaction) => void;

}