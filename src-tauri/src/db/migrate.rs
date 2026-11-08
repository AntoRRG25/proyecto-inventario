use sqlx::{Pool, Sqlite};

pub async fn migrate(pool: &Pool<Sqlite>) {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE
        );
        "#,
    )
    .execute(pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          stock INTEGER NOT NULL,
          min_stock INTEGER NOT NULL DEFAULT 10,
          price REAL NOT NULL,
          category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL
        );
        "#,
    )
    .execute(pool)
    .await
    .unwrap();

    // Check if category_id column exists in existing products table (for schema migration)
    let _ = sqlx::query("ALTER TABLE products ADD COLUMN category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;")
        .execute(pool)
        .await;

    // Check if min_stock column exists in existing products table (for schema migration)
    let _ = sqlx::query("ALTER TABLE products ADD COLUMN min_stock INTEGER NOT NULL DEFAULT 10;")
        .execute(pool)
        .await;
}

