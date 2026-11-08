use std::path::Path;
use sqlx::{Pool, Sqlite, sqlite::{SqliteConnectOptions, SqlitePoolOptions}};

pub async fn create_pool(database_path: &Path) -> Result<Pool<Sqlite>, sqlx::Error> {
    let options = SqliteConnectOptions::new()
        .filename(database_path)
        .create_if_missing(true);

    SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await
}
