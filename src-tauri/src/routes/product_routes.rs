#![allow(dead_code)]

use axum::{
    extract::State,
    routing::get,
    Json, Router,
};
use std::sync::Arc;

use crate::{
    app_state::AppState,
    models::product::Product,
    services::product as product_service,
};

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(get_all).post(create))
}

async fn get_all(
    State(state): State<Arc<AppState>>,
) -> Json<Vec<Product>> {
    let products = product_service::get_all(&state.db).await.unwrap_or_default();
    Json(products)
}

async fn create(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<Product>,
) {
    let _ = product_service::create(
        &state.db,
        payload.name,
        payload.stock,
        payload.min_stock,
        payload.price,
        payload.category_id,
    )
    .await;
}
