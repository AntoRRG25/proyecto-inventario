use sqlx::{Pool, Sqlite};
use crate::models::category::Category;

pub async fn get_all(pool: &Pool<Sqlite>) -> Result<Vec<Category>, String> {
    sqlx::query_as::<_, Category>(
        r#"
        SELECT 
            c.id, 
            c.name, 
            COUNT(p.id) as product_count 
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id
        GROUP BY c.id, c.name
        ORDER BY c.name ASC
        "#
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())
}

pub async fn create(pool: &Pool<Sqlite>, name: String) -> Result<(), String> {
    sqlx::query("INSERT INTO categories (name) VALUES (?)")
        .bind(name)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn update(pool: &Pool<Sqlite>, id: i64, name: String) -> Result<(), String> {
    sqlx::query("UPDATE categories SET name = ? WHERE id = ?")
        .bind(name)
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn delete(pool: &Pool<Sqlite>, id: i64) -> Result<(), String> {
    sqlx::query("DELETE FROM categories WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}
