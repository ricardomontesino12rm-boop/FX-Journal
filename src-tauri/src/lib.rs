use std::{
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use chrono::Utc;
use regex::Regex;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::{Manager, State};

struct AppState {
    db: Mutex<Connection>,
    uploads_dir: PathBuf,
}

#[derive(Serialize)]
struct ApiSuccess {
    success: bool,
}

#[derive(Serialize, Deserialize)]
struct AccountPayload {
    name: String,
    #[serde(rename = "type")]
    account_type: String,
    initial_balance: f64,
}

#[derive(Serialize, Deserialize)]
struct TradePayload {
    account_id: i64,
    pair: String,
    direction: String,
    entry_price: Option<f64>,
    exit_price: Option<f64>,
    lot_size: Option<f64>,
    pnl_net: Option<f64>,
    pnl_percentage: Option<f64>,
    status: String,
    setup: Option<String>,
    session: Option<String>,
    mistake: Option<String>,
    rr_ratio: Option<f64>,
    entry_date: String,
    exit_date: Option<String>,
    notes: Option<String>,
    psychology_score: i64,
}

#[derive(Serialize, Deserialize)]
struct StudyCasePayload {
    title: Option<String>,
    content: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct UploadPayload {
    file_name: String,
    mime_type: String,
    base64_data: String,
    trade_id: Option<i64>,
    description: Option<String>,
}

#[derive(Serialize)]
struct UploadedImage {
    file_path: String,
}

fn open_or_init_db(base_dir: &Path) -> Result<Connection, String> {
    fs::create_dir_all(base_dir).map_err(|e| e.to_string())?;
    let uploads_dir = base_dir.join("uploads");
    fs::create_dir_all(&uploads_dir).map_err(|e| e.to_string())?;
    let db_path = base_dir.join("journal.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    conn.execute_batch(
        "
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        initial_balance REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        pair TEXT NOT NULL,
        direction TEXT NOT NULL,
        entry_price REAL,
        exit_price REAL,
        lot_size REAL,
        pnl_net REAL,
        pnl_percentage REAL,
        status TEXT NOT NULL,
        setup TEXT,
        session TEXT,
        mistake TEXT,
        rr_ratio REAL,
        entry_date DATETIME NOT NULL,
        exit_date DATETIME,
        notes TEXT,
        psychology_score INTEGER CHECK(psychology_score >= 1 AND psychology_score <= 10),
        FOREIGN KEY(account_id) REFERENCES accounts(id)
      );
      CREATE TABLE IF NOT EXISTS trade_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trade_id INTEGER,
        file_path TEXT NOT NULL,
        description TEXT,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(trade_id) REFERENCES trades(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS study_cases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    ",
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE trade_images SET file_path = REPLACE(file_path, '/uploads/', '/api/images/') WHERE file_path LIKE '/uploads/%'",
        [],
    )
    .map_err(|e| e.to_string())?;

    Ok(conn)
}

fn hydrate_notes_with_data_urls(notes: Option<String>, uploads_dir: &Path) -> Option<String> {
    let Some(raw_notes) = notes else {
        return None;
    };
    let re = Regex::new(r"/api/images/([A-Za-z0-9._-]+)").ok()?;
    let mut transformed = raw_notes.clone();
    for cap in re.captures_iter(&raw_notes) {
        let Some(filename) = cap.get(1).map(|m| m.as_str()) else {
            continue;
        };
        let img_path = uploads_dir.join(filename);
        if let Ok(bytes) = fs::read(&img_path) {
            let ext = filename.split('.').next_back().unwrap_or("jpeg").to_lowercase();
            let mime = match ext.as_str() {
                "png" => "image/png",
                "gif" => "image/gif",
                "webp" => "image/webp",
                _ => "image/jpeg",
            };
            let data_url = format!("data:{mime};base64,{}", BASE64.encode(bytes));
            transformed = transformed.replace(&format!("/api/images/{filename}"), &data_url);
        }
    }
    Some(transformed)
}

fn extract_image_files(notes: &str) -> Vec<String> {
    let re = Regex::new(r"/api/images/([A-Za-z0-9._-]+)").unwrap();
    re.captures_iter(notes)
        .filter_map(|cap| cap.get(1).map(|m| m.as_str().to_string()))
        .collect()
}

fn ensure_trade_payload(payload: &TradePayload) -> Result<(), String> {
    let allowed_directions = ["long", "short"];
    let allowed_statuses = ["open", "win", "loss", "breakeven"];
    if payload.account_id <= 0 {
        return Err("Invalid account.".into());
    }
    if payload.pair.trim().is_empty() {
        return Err("Pair is required.".into());
    }
    if !allowed_directions.contains(&payload.direction.as_str()) {
        return Err("Invalid direction.".into());
    }
    if !allowed_statuses.contains(&payload.status.as_str()) {
        return Err("Invalid status.".into());
    }
    if payload.psychology_score < 1 || payload.psychology_score > 10 {
        return Err("Psychology score must be between 1 and 10.".into());
    }
    Ok(())
}

#[tauri::command]
fn list_accounts(state: State<'_, AppState>) -> Result<Vec<serde_json::Value>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, type, initial_balance, created_at FROM accounts ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, i64>(0)?,
                "name": row.get::<_, String>(1)?,
                "type": row.get::<_, String>(2)?,
                "initial_balance": row.get::<_, f64>(3)?,
                "created_at": row.get::<_, String>(4)?
            }))
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn create_account(payload: AccountPayload, state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO accounts (name, type, initial_balance) VALUES (?, ?, ?)",
        params![payload.name.trim(), payload.account_type.trim(), payload.initial_balance],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    let mut stmt = conn
        .prepare("SELECT id, name, type, initial_balance, created_at FROM accounts WHERE id = ?")
        .map_err(|e| e.to_string())?;
    stmt.query_row([id], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_, i64>(0)?,
            "name": row.get::<_, String>(1)?,
            "type": row.get::<_, String>(2)?,
            "initial_balance": row.get::<_, f64>(3)?,
            "created_at": row.get::<_, String>(4)?
        }))
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn update_account(id: i64, payload: AccountPayload, state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE accounts SET name = ?, type = ?, initial_balance = ? WHERE id = ?",
        params![payload.name.trim(), payload.account_type.trim(), payload.initial_balance, id],
    )
    .map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, type, initial_balance, created_at FROM accounts WHERE id = ?")
        .map_err(|e| e.to_string())?;
    stmt.query_row([id], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_, i64>(0)?,
            "name": row.get::<_, String>(1)?,
            "type": row.get::<_, String>(2)?,
            "initial_balance": row.get::<_, f64>(3)?,
            "created_at": row.get::<_, String>(4)?
        }))
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_account(id: i64, state: State<'_, AppState>) -> Result<ApiSuccess, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut ids = Vec::<i64>::new();
    let mut stmt = conn
        .prepare("SELECT id, notes FROM trades WHERE account_id = ?")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([id], |row| Ok((row.get::<_, i64>(0)?, row.get::<_, Option<String>>(1)?)))
        .map_err(|e| e.to_string())?;
    let mut files_to_delete = Vec::<String>::new();
    for row in rows {
        let (trade_id, notes) = row.map_err(|e| e.to_string())?;
        ids.push(trade_id);
        if let Some(notes) = notes {
            files_to_delete.extend(extract_image_files(&notes));
        }
    }
    for filename in files_to_delete {
        let _ = fs::remove_file(state.uploads_dir.join(filename));
    }
    conn.execute("DELETE FROM trades WHERE account_id = ?", [id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM accounts WHERE id = ?", [id])
        .map_err(|e| e.to_string())?;
    Ok(ApiSuccess { success: true })
}

#[tauri::command]
fn list_trades(account_id: Option<i64>, state: State<'_, AppState>) -> Result<Vec<serde_json::Value>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(filter_id) = account_id {
        let mut stmt = conn.prepare("SELECT t.*, a.name FROM trades t JOIN accounts a ON t.account_id = a.id WHERE t.account_id = ? ORDER BY t.entry_date DESC").map_err(|e| e.to_string())?;
        let rows = stmt.query_map([filter_id], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, i64>(0)?, "account_id": row.get::<_, i64>(1)?, "pair": row.get::<_, String>(2)?,
                "direction": row.get::<_, String>(3)?, "entry_price": row.get::<_, Option<f64>>(4)?,
                "exit_price": row.get::<_, Option<f64>>(5)?, "lot_size": row.get::<_, Option<f64>>(6)?,
                "pnl_net": row.get::<_, Option<f64>>(7)?, "pnl_percentage": row.get::<_, Option<f64>>(8)?,
                "status": row.get::<_, String>(9)?, "setup": row.get::<_, Option<String>>(10)?,
                "session": row.get::<_, Option<String>>(11)?, "mistake": row.get::<_, Option<String>>(12)?,
                "rr_ratio": row.get::<_, Option<f64>>(13)?, "entry_date": row.get::<_, String>(14)?,
                "exit_date": row.get::<_, Option<String>>(15)?, "notes": row.get::<_, Option<String>>(16)?,
                "psychology_score": row.get::<_, i64>(17)?, "account_name": row.get::<_, String>(18)?
            }))
        })
        .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
    } else {
        let mut stmt = conn.prepare("SELECT t.*, a.name FROM trades t JOIN accounts a ON t.account_id = a.id ORDER BY t.entry_date DESC").map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, i64>(0)?, "account_id": row.get::<_, i64>(1)?, "pair": row.get::<_, String>(2)?,
                "direction": row.get::<_, String>(3)?, "entry_price": row.get::<_, Option<f64>>(4)?,
                "exit_price": row.get::<_, Option<f64>>(5)?, "lot_size": row.get::<_, Option<f64>>(6)?,
                "pnl_net": row.get::<_, Option<f64>>(7)?, "pnl_percentage": row.get::<_, Option<f64>>(8)?,
                "status": row.get::<_, String>(9)?, "setup": row.get::<_, Option<String>>(10)?,
                "session": row.get::<_, Option<String>>(11)?, "mistake": row.get::<_, Option<String>>(12)?,
                "rr_ratio": row.get::<_, Option<f64>>(13)?, "entry_date": row.get::<_, String>(14)?,
                "exit_date": row.get::<_, Option<String>>(15)?, "notes": row.get::<_, Option<String>>(16)?,
                "psychology_score": row.get::<_, i64>(17)?, "account_name": row.get::<_, String>(18)?
            }))
        })
        .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn get_trade(id: i64, state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT t.*, a.name FROM trades t JOIN accounts a ON t.account_id = a.id WHERE t.id = ?")
        .map_err(|e| e.to_string())?;
    let uploads_dir = state.uploads_dir.clone();
    stmt.query_row([id], |row| {
        let notes = row.get::<_, Option<String>>(16)?;
        Ok(serde_json::json!({
            "id": row.get::<_, i64>(0)?, "account_id": row.get::<_, i64>(1)?, "pair": row.get::<_, String>(2)?,
            "direction": row.get::<_, String>(3)?, "entry_price": row.get::<_, Option<f64>>(4)?,
            "exit_price": row.get::<_, Option<f64>>(5)?, "lot_size": row.get::<_, Option<f64>>(6)?,
            "pnl_net": row.get::<_, Option<f64>>(7)?, "pnl_percentage": row.get::<_, Option<f64>>(8)?,
            "status": row.get::<_, String>(9)?, "setup": row.get::<_, Option<String>>(10)?,
            "session": row.get::<_, Option<String>>(11)?, "mistake": row.get::<_, Option<String>>(12)?,
            "rr_ratio": row.get::<_, Option<f64>>(13)?, "entry_date": row.get::<_, String>(14)?,
            "exit_date": row.get::<_, Option<String>>(15)?,
            "notes": hydrate_notes_with_data_urls(notes, &uploads_dir),
            "psychology_score": row.get::<_, i64>(17)?, "account_name": row.get::<_, String>(18)?
        }))
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn create_trade(payload: TradePayload, state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    ensure_trade_payload(&payload)?;
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let initial_balance: f64 = conn
        .query_row(
            "SELECT initial_balance FROM accounts WHERE id = ?",
            [payload.account_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Account not found.".to_string())?;

    let mut final_pct = payload.pnl_percentage;
    if payload.pnl_net.is_some() && payload.pnl_percentage.is_none() {
        let history_total: f64 = conn
            .query_row(
                "SELECT COALESCE(SUM(pnl_net), 0) FROM trades WHERE account_id = ? AND pnl_net IS NOT NULL AND entry_date < ?",
                params![payload.account_id, payload.entry_date],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        let current_balance = initial_balance + history_total;
        if current_balance > 0.0 {
            final_pct = Some(payload.pnl_net.unwrap_or(0.0) / current_balance * 100.0);
        }
    }

    conn.execute(
      "INSERT INTO trades (account_id, pair, direction, entry_price, exit_price, lot_size, pnl_net, pnl_percentage, status, setup, session, mistake, rr_ratio, entry_date, exit_date, notes, psychology_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      params![
        payload.account_id, payload.pair.trim(), payload.direction.trim(), payload.entry_price, payload.exit_price, payload.lot_size,
        payload.pnl_net, final_pct, payload.status.trim(), payload.setup, payload.session, payload.mistake, payload.rr_ratio,
        payload.entry_date, payload.exit_date, payload.notes.unwrap_or_default(), payload.psychology_score
      ],
    ).map_err(|e| e.to_string())?;

    let new_id = conn.last_insert_rowid();
    drop(conn);
    get_trade(new_id, state)
}

#[tauri::command]
fn update_trade(id: i64, payload: TradePayload, state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    ensure_trade_payload(&payload)?;
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let exists: Option<i64> = conn
        .query_row("SELECT id FROM trades WHERE id = ?", [id], |row| row.get(0))
        .optional()
        .map_err(|e| e.to_string())?;
    if exists.is_none() {
        return Err("Trade not found.".into());
    }

    let initial_balance: f64 = conn
        .query_row(
            "SELECT initial_balance FROM accounts WHERE id = ?",
            [payload.account_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Account not found.".to_string())?;
    let mut final_pct = payload.pnl_percentage;
    if payload.pnl_net.is_some() && payload.pnl_percentage.is_none() {
        let history_total: f64 = conn
            .query_row(
                "SELECT COALESCE(SUM(pnl_net), 0) FROM trades WHERE account_id = ? AND id != ? AND pnl_net IS NOT NULL AND entry_date < ?",
                params![payload.account_id, id, payload.entry_date],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        let current_balance = initial_balance + history_total;
        if current_balance > 0.0 {
            final_pct = Some(payload.pnl_net.unwrap_or(0.0) / current_balance * 100.0);
        }
    }

    conn.execute(
      "UPDATE trades SET account_id = ?, pair = ?, direction = ?, pnl_net = ?, pnl_percentage = ?, status = ?, setup = ?, session = ?, mistake = ?, rr_ratio = ?, entry_date = ?, exit_date = ?, notes = ?, psychology_score = ? WHERE id = ?",
      params![
        payload.account_id, payload.pair.trim(), payload.direction.trim(), payload.pnl_net, final_pct, payload.status.trim(),
        payload.setup, payload.session, payload.mistake, payload.rr_ratio, payload.entry_date, payload.exit_date, payload.notes.unwrap_or_default(), payload.psychology_score, id
      ],
    ).map_err(|e| e.to_string())?;
    drop(conn);
    get_trade(id, state)
}

#[tauri::command]
fn delete_trade(id: i64, state: State<'_, AppState>) -> Result<ApiSuccess, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let notes: Option<String> = conn
        .query_row("SELECT notes FROM trades WHERE id = ?", [id], |row| row.get(0))
        .optional()
        .map_err(|e| e.to_string())?
        .flatten();
    if let Some(notes) = notes {
        for filename in extract_image_files(&notes) {
            let _ = fs::remove_file(state.uploads_dir.join(filename));
        }
    }
    conn.execute("DELETE FROM trade_images WHERE trade_id = ?", [id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM trades WHERE id = ?", [id])
        .map_err(|e| e.to_string())?;
    Ok(ApiSuccess { success: true })
}

#[tauri::command]
fn get_tags(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let read_distinct = |column: &str| -> Result<Vec<serde_json::Value>, String> {
        let sql = format!("SELECT DISTINCT {column} as value FROM trades WHERE {column} IS NOT NULL AND {column} != ''");
        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| {
                let value: String = row.get(0)?;
                Ok(serde_json::json!({ "value": value, "label": value }))
            })
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
    };
    Ok(serde_json::json!({
      "sessions": read_distinct("session")?,
      "setups": read_distinct("setup")?,
      "mistakes": read_distinct("mistake")?
    }))
}

#[tauri::command]
fn list_study_cases(state: State<'_, AppState>) -> Result<Vec<serde_json::Value>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, title, created_at, updated_at FROM study_cases ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, i64>(0)?,
                "title": row.get::<_, String>(1)?,
                "created_at": row.get::<_, String>(2)?,
                "updated_at": row.get::<_, String>(3)?
            }))
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_study_case(id: i64, state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, title, content, created_at, updated_at FROM study_cases WHERE id = ?")
        .map_err(|e| e.to_string())?;
    let uploads_dir = state.uploads_dir.clone();
    stmt.query_row([id], |row| {
        let content = row.get::<_, Option<String>>(2)?;
        Ok(serde_json::json!({
          "id": row.get::<_, i64>(0)?,
          "title": row.get::<_, String>(1)?,
          "content": hydrate_notes_with_data_urls(content, &uploads_dir),
          "created_at": row.get::<_, String>(3)?,
          "updated_at": row.get::<_, String>(4)?
        }))
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn create_study_case(payload: StudyCasePayload, state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO study_cases (title, content) VALUES (?, ?)",
        params![
            payload.title.unwrap_or_else(|| "Untitled Case".to_string()),
            payload.content.unwrap_or_default()
        ],
    )
    .map_err(|e| e.to_string())?;
    let new_id = conn.last_insert_rowid();
    drop(conn);
    get_study_case(new_id, state)
}

#[tauri::command]
fn update_study_case(id: i64, payload: StudyCasePayload, state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE study_cases SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![payload.title.unwrap_or_else(|| "Untitled Case".to_string()), payload.content.unwrap_or_default(), id],
    )
    .map_err(|e| e.to_string())?;
    drop(conn);
    get_study_case(id, state)
}

#[tauri::command]
fn delete_study_case(id: i64, state: State<'_, AppState>) -> Result<ApiSuccess, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM study_cases WHERE id = ?", [id])
        .map_err(|e| e.to_string())?;
    Ok(ApiSuccess { success: true })
}

#[tauri::command]
fn upload_image(payload: UploadPayload, state: State<'_, AppState>) -> Result<UploadedImage, String> {
    let bytes = BASE64.decode(payload.base64_data).map_err(|e| e.to_string())?;
    let sanitized_name = payload.file_name.replace(' ', "_");
    let filename = format!("{}_{}", Utc::now().timestamp_millis(), sanitized_name);
    let file_path = state.uploads_dir.join(&filename);
    fs::write(&file_path, bytes).map_err(|e| e.to_string())?;
    let db_path = format!("/api/images/{filename}");
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO trade_images (trade_id, file_path, description) VALUES (?, ?, ?)",
        params![payload.trade_id, db_path, payload.description.unwrap_or_default()],
    )
    .map_err(|e| e.to_string())?;
    let _ = payload.mime_type;
    Ok(UploadedImage { file_path: format!("/api/images/{filename}") })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_data = app
                .path()
                .app_data_dir()
                .map_err(|e| e.to_string())?;
            let conn = open_or_init_db(&app_data)?;
            let uploads_dir = app_data.join("uploads");
            app.manage(AppState {
                db: Mutex::new(conn),
                uploads_dir,
            });
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_accounts,
            create_account,
            update_account,
            delete_account,
            list_trades,
            get_trade,
            create_trade,
            update_trade,
            delete_trade,
            get_tags,
            list_study_cases,
            get_study_case,
            create_study_case,
            update_study_case,
            delete_study_case,
            upload_image
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
