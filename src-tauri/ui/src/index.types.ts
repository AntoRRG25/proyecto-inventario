export interface NetworkStatus {
    active: boolean;
    port: number;
    local_ip: string | null;
}
export interface Category {
    id: number;
    name: string;
    product_count?: number;
}

export interface Product {
    id: number;
    name: string;
    stock: number;
    min_stock: number;
    price: number;
    category_id?: number | null;
    category_name?: string | null;
}
export interface Stats {
    total_products: number;
    total_categories: number;
    total_stock_value: number;
    total_units: number;
    low_stock_count: number;
}
export interface LowStockReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: Product[];
}

export interface SelectedItem {
    product: Product;
    selected: boolean;
    orderQuantity: number;
}

/** Tracks user-applied changes over the default derived values. */
export interface ItemOverride {
    selected: boolean;
    orderQuantity: number;
}
