use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, sqlx::FromRow, Debug, Clone)]
pub struct Category {
    pub id: i64,
    pub name: String,
    pub product_count: Option<i64>,
}

