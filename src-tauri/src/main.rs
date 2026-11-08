mod app_state;
mod db;
mod models;
mod routes;
mod services;

use serde::Serialize;
use std::sync::Arc;
use app_state::AppState;
use tauri::{Manager, State};
use crate::models::product::Product;
use crate::models::category::Category;

// ================= NETWORK SERVER STATE =================

use std::sync::Mutex;
use tokio::sync::oneshot;

/// Holds the shutdown sender for the running network server.
/// When `Some`, the server is active. When `None`, it's stopped.
pub struct NetworkServerState {
    pub shutdown_tx: Mutex<Option<oneshot::Sender<()>>>,
    pub port: Mutex<u16>,
    pub active: Mutex<bool>,
}

impl Default for NetworkServerState {
    fn default() -> Self {
        Self {
            shutdown_tx: Mutex::new(None),
            port: Mutex::new(8765),
            active: Mutex::new(false),
        }
    }
}

// ================= STATS =================

#[derive(Serialize)]
pub struct Stats {
    pub total_products: i64,
    pub total_categories: i64,
    pub total_stock_value: f64,
    pub total_units: i64,
    pub low_stock_count: i64,
}

// ================= PRODUCT COMMANDS =================

#[tauri::command]
async fn get_products(state: State<'_, Arc<AppState>>) -> Result<Vec<Product>, String> {
    services::product::get_all(&state.db).await
}

#[tauri::command]
async fn create_product(
    state: State<'_, Arc<AppState>>,
    name: String,
    stock: i32,
    min_stock: Option<i32>,
    price: f64,
    category_id: Option<i64>,
) -> Result<(), String> {
    services::product::create(&state.db, name, stock, min_stock.unwrap_or(10), price, category_id).await
}

#[tauri::command]
async fn update_product(
    state: State<'_, Arc<AppState>>,
    id: i64,
    name: String,
    stock: i32,
    min_stock: Option<i32>,
    price: f64,
    category_id: Option<i64>,
) -> Result<(), String> {
    services::product::update(&state.db, id, name, stock, min_stock.unwrap_or(10), price, category_id).await
}

#[tauri::command]
async fn delete_product(
    state: State<'_, Arc<AppState>>,
    id: i64,
) -> Result<(), String> {
    services::product::delete(&state.db, id).await
}

#[tauri::command]
async fn adjust_product_stock(
    state: State<'_, Arc<AppState>>,
    id: i64,
    delta: i32,
) -> Result<(), String> {
    services::product::adjust_stock(&state.db, id, delta).await
}

// ================= CATEGORY COMMANDS =================

#[tauri::command]
async fn get_categories(state: State<'_, Arc<AppState>>) -> Result<Vec<Category>, String> {
    services::category::get_all(&state.db).await
}

#[tauri::command]
async fn create_category(
    state: State<'_, Arc<AppState>>,
    name: String,
) -> Result<(), String> {
    services::category::create(&state.db, name).await
}

#[tauri::command]
async fn update_category(
    state: State<'_, Arc<AppState>>,
    id: i64,
    name: String,
) -> Result<(), String> {
    services::category::update(&state.db, id, name).await
}

#[tauri::command]
async fn delete_category(
    state: State<'_, Arc<AppState>>,
    id: i64,
) -> Result<(), String> {
    services::category::delete(&state.db, id).await
}

// ================= STATS COMMAND =================

#[tauri::command]
async fn get_stats(state: State<'_, Arc<AppState>>) -> Result<Stats, String> {
    let total_products: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM products")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);

    let total_categories: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM categories")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);

    let total_stock_value: f64 = sqlx::query_scalar("SELECT COALESCE(SUM(price * stock), 0.0) FROM products")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0.0);

    let total_units: i64 = sqlx::query_scalar("SELECT COALESCE(SUM(stock), 0) FROM products")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);

    let low_stock_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM products WHERE stock < min_stock")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);

    Ok(Stats {
        total_products,
        total_categories,
        total_stock_value,
        total_units,
        low_stock_count,
    })
}

// ================= PDF SAVE COMMAND =================

/// Receives the PDF bytes from the frontend and opens a native "Save As" dialog
/// to let the user choose where to write the file on disk.
#[tauri::command]
async fn save_pdf(
    app: tauri::AppHandle,
    pdf_bytes: Vec<u8>,
    default_name: String,
) -> Result<(), String> {
    use tauri_plugin_dialog::DialogExt;

    let path = app
        .dialog()
        .file()
        .set_file_name(&default_name)
        .add_filter("PDF", &["pdf"])
        .blocking_save_file();

    match path {
        Some(file_path) => {
            let resolved = file_path.as_path()
                .ok_or_else(|| "Ruta de archivo inválida".to_string())?;
            std::fs::write(resolved, &pdf_bytes)
                .map_err(|e| format!("Error al guardar el archivo: {}", e))
        }
        None => {
            // User cancelled the dialog — not an error
            Ok(())
        }
    }
}

// ================= NETWORK SERVER COMMANDS =================

#[derive(Serialize)]
pub struct NetworkStatus {
    pub active: bool,
    pub port: u16,
    pub local_ip: Option<String>,
}

/// Returns the current state of the network server and the local IP.
#[tauri::command]
fn get_network_status(net: State<'_, Arc<NetworkServerState>>) -> NetworkStatus {
    let active = *net.active.lock().unwrap();
    let port = *net.port.lock().unwrap();
    let local_ip = local_ip_address::local_ip().ok().map(|ip| ip.to_string());
    NetworkStatus { active, port, local_ip }
}

/// Starts the Axum network server on 0.0.0.0:<port>, serving the API and
/// the compiled UI static files so remote browsers can access the full app.
#[tauri::command]
async fn start_network_server(
    app_state: State<'_, Arc<AppState>>,
    net: State<'_, Arc<NetworkServerState>>,
    app: tauri::AppHandle,
    port: u16,
) -> Result<(), String> {
    // Already running — stop first
    {
        let active = *net.active.lock().unwrap();
        if active {
            return Err("El servidor ya está activo. Detenlo antes de cambiar el puerto.".to_string());
        }
    }

    // Validate port range
    if port < 1024 || port > 65535 {
        return Err("Puerto inválido. Usa un valor entre 1024 y 65535.".to_string());
    }

    *net.port.lock().unwrap() = port;

    use axum::{Router, routing::get, Json};
    use tower_http::cors::{Any, CorsLayer};
    use tower_http::services::ServeDir;

    let app_state_clone = Arc::clone(&app_state);
    let net_clone = Arc::clone(&net);

    // Resolve the path to the compiled UI dist folder bundled with the app
    let resource_dir = app.path().resource_dir()
        .map_err(|e| format!("No se encontró el directorio de recursos: {}", e))?;
    let ui_dist = resource_dir.join("ui/dist");

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Build the router: API routes + static UI files fallback
    let app_state_for_products = Arc::clone(&app_state_clone);
    let app_state_for_categories = Arc::clone(&app_state_clone);

    let router = Router::new()
        .route("/api/products", get(move || {
            let s = Arc::clone(&app_state_for_products);
            async move {
                let data = services::product::get_all(&s.db).await.unwrap_or_default();
                Json(data)
            }
        }))
        .route("/api/categories", get(move || {
            let s = Arc::clone(&app_state_for_categories);
            async move {
                let data = services::category::get_all(&s.db).await.unwrap_or_default();
                Json(data)
            }
        }))
        .fallback_service(ServeDir::new(&ui_dist).append_index_html_on_directories(true))
        .layer(cors);

    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .map_err(|e| format!("No se pudo iniciar el servidor en el puerto {}: {}", port, e))?;

    let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();

    // Store the shutdown sender
    *net.shutdown_tx.lock().unwrap() = Some(shutdown_tx);
    *net.active.lock().unwrap() = true;

    // Spawn the server in the background
    tokio::spawn(async move {
        axum::serve(listener, router)
            .with_graceful_shutdown(async {
                let _ = shutdown_rx.await;
            })
            .await
            .ok();

        // Mark as stopped when server exits
        *net_clone.active.lock().unwrap() = false;
        *net_clone.shutdown_tx.lock().unwrap() = None;
    });

    Ok(())
}

/// Stops the running network server gracefully.
#[tauri::command]
async fn stop_network_server(
    net: State<'_, Arc<NetworkServerState>>,
) -> Result<(), String> {
    let tx = net.shutdown_tx.lock().unwrap().take();
    match tx {
        Some(sender) => {
            let _ = sender.send(());
            *net.active.lock().unwrap() = false;
            Ok(())
        }
        None => Err("El servidor no está activo.".to_string()),
    }
}

// ================= MAIN =================

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_data_dir)?;

            let database_path = app_data_dir.join("inventory.db");
            let pool = tauri::async_runtime::block_on(
                db::connection::create_pool(&database_path),
            )?;
            tauri::async_runtime::block_on(db::migrate::migrate(&pool));

            app.manage(Arc::new(AppState { db: pool }));
            app.manage(Arc::new(NetworkServerState::default()));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_products,
            create_product,
            update_product,
            delete_product,
            adjust_product_stock,
            get_categories,
            create_category,
            update_category,
            delete_category,
            get_stats,
            save_pdf,
            get_network_status,
            start_network_server,
            stop_network_server
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
