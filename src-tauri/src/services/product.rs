use sqlx::{Pool, Sqlite};
use crate::models::product::Product;

pub async fn get_all(pool: &Pool<Sqlite>) -> Result<Vec<Product>, String> {
    sqlx::query_as::<_, Product>(
        r#"
        SELECT 
            p.id, 
            p.name, 
            p.stock, 
            p.min_stock,
            p.price, 
            p.category_id, 
            c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ORDER BY p.id DESC
        "#
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())
}

pub async fn create(
    pool: &Pool<Sqlite>,
    name: String,
    stock: i32,
    min_stock: i32,
    price: f64,
    category_id: Option<i64>,
) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO products (name, stock, min_stock, price, category_id) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(name)
    .bind(stock)
    .bind(min_stock)
    .bind(price)
    .bind(category_id)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn update(
    pool: &Pool<Sqlite>,
    id: i64,
    name: String,
    stock: i32,
    min_stock: i32,
    price: f64,
    category_id: Option<i64>,
) -> Result<(), String> {
    sqlx::query(
        "UPDATE products SET name = ?, stock = ?, min_stock = ?, price = ?, category_id = ? WHERE id = ?"
    )
    .bind(name)
    .bind(stock)
    .bind(min_stock)
    .bind(price)
    .bind(category_id)
    .bind(id)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn delete(pool: &Pool<Sqlite>, id: i64) -> Result<(), String> {
    sqlx::query("DELETE FROM products WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn adjust_stock(pool: &Pool<Sqlite>, id: i64, delta: i32) -> Result<(), String> {
    sqlx::query("UPDATE products SET stock = MAX(0, stock + ?) WHERE id = ?")
        .bind(delta)
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}
