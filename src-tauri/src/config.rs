// One JSON file in the app data dir: the recents list, the last repository, and
// the branch filter each repository was left on.
use serde::{Deserialize, Serialize};
use tauri::Manager;

use crate::git::GitError;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RepoBranch {
    pub root: String,
    pub branch: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct Config {
    #[serde(default)]
    pub recents: Vec<String>,
    #[serde(default)]
    pub last: Option<String>,
    #[serde(default)]
    pub branches: Vec<RepoBranch>,
}

fn config_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, GitError> {
    app.path()
        .app_data_dir()
        .map(|dir| dir.join("config.json"))
        .map_err(|error| GitError::Io { message: error.to_string() })
}

#[tauri::command]
pub fn load_config(app: tauri::AppHandle) -> Result<Config, GitError> {
    let path = config_path(&app)?;
    let Ok(text) = std::fs::read_to_string(&path) else {
        // First launch, or a wiped config: an empty one, not an error.
        return Ok(Config::default());
    };
    serde_json::from_str(&text).map_err(|error| GitError::Io { message: error.to_string() })
}

#[tauri::command]
pub fn save_config(app: tauri::AppHandle, config: Config) -> Result<(), GitError> {
    let path = config_path(&app)?;
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir).map_err(|error| GitError::Io { message: error.to_string() })?;
    }
    let text = serde_json::to_string_pretty(&config)
        .map_err(|error| GitError::Io { message: error.to_string() })?;
    std::fs::write(&path, text).map_err(|error| GitError::Io { message: error.to_string() })
}

// The UI never sends a config write: Rust records what it already knows.
pub fn record_open(app: &tauri::AppHandle, root: &str) {
    let mut config = load_config(app.clone()).unwrap_or_default();
    config.recents.retain(|entry| entry != root);
    config.recents.insert(0, root.to_string());
    config.recents.truncate(10);
    config.last = Some(root.to_string());
    let _ = save_config(
        app.clone(),
        Config { recents: config.recents, last: config.last, branches: config.branches },
    );
}

pub fn record_branch(app: &tauri::AppHandle, root: &str, branch: Option<&str>) {
    let mut config = load_config(app.clone()).unwrap_or_default();
    config.branches.retain(|entry| entry.root != root);
    if let Some(branch) = branch {
        config.branches.push(RepoBranch { root: root.to_string(), branch: branch.to_string() });
    }
    let _ = save_config(
        app.clone(),
        Config { recents: config.recents, last: config.last, branches: config.branches },
    );
}
