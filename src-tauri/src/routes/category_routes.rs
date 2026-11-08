#![allow(dead_code)]

use axum::{
    extract::State,
    routing::get,
    Json, Router,
};
use std::sync::Arc;

use crate::{
    app_state::AppState,
    models::category::Category,
    services::category,
};

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(get_all).post(create))
}

async fn get_all(
    State(state): State<Arc<AppState>>,
) -> Json<Vec<Category>> {
    let categories = category::get_all(&state.db).await.unwrap_or_default();
    Json(categories)
}

async fn create(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<Category>,
) {
    let _ = category::create(
        &state.db,
        payload.name,
    )
    .await;
}
