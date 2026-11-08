use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, sqlx::FromRow, Debug, Clone)]
pub struct Product {
    pub id: i64,
    pub name: String,
    pub stock: i32,
    pub min_stock: i32,
    pub price: f64,
    pub category_id: Option<i64>,
    pub category_name: Option<String>,
}

