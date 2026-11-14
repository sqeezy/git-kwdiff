mod config;
mod git;

pub use config::*;
pub use git::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(GitState::default())
        .invoke_handler(tauri::generate_handler![
            open_repo,
            refs,
            search,
            cancel_search,
            files,
            patch,
            roots,
            load_config,
            save_config
        ])
        .run(tauri::generate_context!())
        .expect("error while running kwdiff");
}
