// The whole git surface of kwdiff: seven commands, fixed argv, no shell.
//
// Not compiled in the session that wrote it (no Rust toolchain on the phone);
// the Windows CI job is its first build.
use std::path::Path;
use std::process::Stdio;

use serde::Serialize;
use tokio::io::AsyncReadExt;
use tokio::process::{Child, Command};
use tokio::sync::Mutex;

#[derive(Debug, thiserror::Error)]
pub enum GitError {
    #[error("git is not on PATH")]
    GitMissing,
    #[error("not a git repository: {path}")]
    NotARepository { path: String },
    #[error("{message}")]
    Search { message: String },
    #[error("{message}")]
    Io { message: String },
}

// The UI branches on `kind`, so it is serialised flat, not as a Rust enum.
impl Serialize for GitError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeStruct;
        let (kind, message) = match self {
            GitError::GitMissing => ("git-missing", self.to_string()),
            GitError::NotARepository { .. } => ("not-a-repo", self.to_string()),
            GitError::Search { .. } => ("search", self.to_string()),
            GitError::Io { .. } => ("io", self.to_string()),
        };
        let mut state = serializer.serialize_struct("GitError", 2)?;
        state.serialize_field("kind", kind)?;
        state.serialize_field("message", &message)?;
        state.end()
    }
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Commit {
    pub sha: String,
    pub date: String,
    pub author: String,
    pub subject: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FilePatch {
    pub path: String,
    pub added: u32,
    pub removed: u32,
    pub is_new: bool,
}

#[derive(Serialize, Clone)]
pub struct RootOf {
    pub sha: String,
    pub root: String,
}

#[derive(Serialize, Clone)]
pub struct Ref {
    pub name: String,
    pub kind: String,
}

#[derive(Serialize, Clone)]
pub struct Repo {
    pub name: String,
    pub root: String,
}

// At most one search runs at a time; a newer id kills the older child.
#[derive(Default)]
pub struct GitState {
    repo: Mutex<Option<String>>,
    current: Mutex<Option<(u64, Child)>>,
}

async fn repo_of(state: &GitState) -> Result<String, GitError> {
    state
        .repo
        .lock()
        .await
        .clone()
        .ok_or_else(|| GitError::Io { message: "no repository open".into() })
}

fn base(repo: &str) -> Command {
    let mut command = Command::new("git");
    command
        .current_dir(repo)
        .env("GIT_PAGER", "cat")
        .env("GIT_TERMINAL_PROMPT", "0")
        .arg("--no-pager")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    #[cfg(windows)]
    {
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        command.creation_flags(CREATE_NO_WINDOW);
    }
    command
}

fn io_error(error: std::io::Error) -> GitError {
    if error.kind() == std::io::ErrorKind::NotFound {
        GitError::GitMissing
    } else {
        GitError::Io { message: error.to_string() }
    }
}

async fn output(repo: &str, args: &[String]) -> Result<String, GitError> {
    let out = base(repo)
        .args(args)
        .output()
        .await
        .map_err(io_error)?;
    if !out.status.success() {
        return Err(GitError::Io {
            message: String::from_utf8_lossy(&out.stderr).trim().to_string(),
        });
    }
    Ok(String::from_utf8_lossy(&out.stdout).into_owned())
}

async fn kill_current(state: &GitState) {
    let taken = { state.current.lock().await.take() };
    if let Some((_, mut child)) = taken {
        let _ = child.kill().await;
        let _ = child.wait().await;
    }
}

// Spawns a git process, registers it as the live one, reads it to the end.
async fn run_tracked(state: &GitState, id: u64, repo: &str, args: &[String]) -> Result<String, GitError> {
    kill_current(state).await;

    let mut child = base(repo)
        .args(args)
        .spawn()
        .map_err(io_error)?;
    let mut stdout = match child.stdout.take() {
        Some(stdout) => stdout,
        None => {
            return Err(GitError::Io { message: "git produced no stdout".into() });
        }
    };

    {
        let mut slot = state.current.lock().await;
        *slot = Some((id, child));
    }

    let mut buffer = Vec::new();
    let read = stdout.read_to_end(&mut buffer).await;

    let taken = { state.current.lock().await.take() };
    if let Some((_, mut child)) = taken {
        let _ = child.wait().await;
    }
    read.map_err(io_error)?;

    Ok(String::from_utf8_lossy(&buffer).into_owned())
}

#[tauri::command]
pub async fn open_repo(
    state: tauri::State<'_, GitState>,
    app: tauri::AppHandle,
    path: String,
) -> Result<Repo, GitError> {
    let root = base(&path)
        .args(["rev-parse", "--show-toplevel"])
        .output()
        .await
        .map_err(io_error)?;

    if !root.status.success() {
        return Err(GitError::NotARepository { path });
    }
    let root = String::from_utf8_lossy(&root.stdout).trim().to_string();
    let name = Path::new(&root)
        .file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_else(|| root.clone());

    *state.repo.lock().await = Some(root.clone());
    crate::config::record_open(&app, &root);

    Ok(Repo { name, root })
}

#[tauri::command]
pub async fn refs(repo: String) -> Result<Vec<Ref>, GitError> {
    let raw = output(&repo, &["for-each-ref".into(), "--format=%(refname)".into()]).await?;

    Ok(raw
        .lines()
        .filter_map(|line| {
            let (name, kind) = if let Some(rest) = line.strip_prefix("refs/heads/") {
                (rest, "local")
            } else if let Some(rest) = line.strip_prefix("refs/remotes/") {
                (rest, "remote")
            } else if let Some(rest) = line.strip_prefix("refs/tags/") {
                (rest, "tag")
            } else {
                return None;
            };
            Some(Ref { name: name.to_string(), kind: kind.to_string() })
        })
        .collect())
}

#[tauri::command]
pub async fn search(
    app: tauri::AppHandle,
    state: tauri::State<'_, GitState>,
    id: u64,
    repo: String,
    keyword: String,
    code: bool,
    branch: Option<String>,
) -> Result<Vec<Commit>, GitError> {
    crate::config::record_branch(&app, &repo, branch.as_deref());
    let mut args: Vec<String> = vec!["log".into()];
    match &branch {
        Some(branch) => args.push(branch.clone()),
        None => args.push("--all".into()),
    }
    args.extend([
        "-i".into(),
        "--grep".into(),
        keyword.clone(),
        "--date=short".into(),
        "--format=%H%x09%ad%x09%an%x09%s".into(),
        "--max-count=2000".into(),
        "--exclude=refs/stash".into(),
    ]);

    let mut raw = run_tracked(&state, id, &repo, &args).await?;

    // -a is a union, not an intersection: messages and changed lines separately.
    if code {
        let mut code_args: Vec<String> = vec!["log".into()];
        match &branch {
            Some(branch) => code_args.push(branch.clone()),
            None => code_args.push("--all".into()),
        }
        code_args.extend([
            "-i".into(),
            format!("-S{keyword}"),
            "--date=short".into(),
            "--format=%H%x09%ad%x09%an%x09%s".into(),
            "--max-count=2000".into(),
        ]);
        raw.push('\n');
        raw.push_str(&run_tracked(&state, id, &repo, &code_args).await?);
    }

    let mut commits: Vec<Commit> = Vec::new();
    for line in raw.lines() {
        let mut fields = line.split('\t');
        let (Some(sha), Some(date), Some(author), Some(subject)) =
            (fields.next(), fields.next(), fields.next(), fields.next())
        else {
            continue;
        };
        if commits.iter().any(|commit| commit.sha == sha) {
            continue;
        }
        commits.push(Commit {
            sha: sha.to_string(),
            date: date.to_string(),
            author: author.to_string(),
            subject: subject.to_string(),
        });
    }
    Ok(commits)
}

#[tauri::command]
pub async fn cancel_search(state: tauri::State<'_, GitState>, _id: u64) -> Result<(), GitError> {
    kill_current(&state).await;
    Ok(())
}

#[tauri::command]
pub async fn files(
    state: tauri::State<'_, GitState>,
    shas: Vec<String>,
) -> Result<Vec<FilePatch>, GitError> {
    let repo = repo_of(&state).await?;
    let mut files: Vec<FilePatch> = Vec::new();
    for sha in &shas {
        let raw = output(
            &repo,
            &[
                "show".into(),
                "--numstat".into(),
                "--format=".into(),
                sha.clone(),
            ],
        )
        .await?;
        for line in raw.lines() {
            let mut fields = line.split('\t');
            let (Some(added), Some(removed), Some(path)) = (fields.next(), fields.next(), fields.next())
            else {
                continue;
            };
            let added: u32 = added.parse().unwrap_or(0);
            let removed: u32 = removed.parse().unwrap_or(0);
            match files.iter_mut().find(|file| file.path == path) {
                Some(existing) => {
                    existing.added += added;
                    existing.removed += removed;
                }
                None => files.push(FilePatch {
                    path: path.to_string(),
                    added,
                    removed,
                    is_new: added > 0 && removed == 0,
                }),
            }
        }
    }
    files.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(files)
}

#[tauri::command]
pub async fn patch(
    state: tauri::State<'_, GitState>,
    shas: Vec<String>,
    path: String,
) -> Result<tauri::ipc::Response, GitError> {
    let repo = repo_of(&state).await?;
    let mut text = String::new();
    for sha in &shas {
        text.push_str(&output(
            &repo,
            &[
                "show".into(),
                "--format=# %h %s".into(),
                sha.clone(),
                "--".into(),
                path.clone(),
            ],
        )
        .await?);
        text.push('\n');
    }
    Ok(tauri::ipc::Response::new(text.into_bytes()))
}

#[tauri::command]
pub async fn roots(
    state: tauri::State<'_, GitState>,
    shas: Vec<String>,
) -> Result<Vec<RootOf>, GitError> {
    let repo = repo_of(&state).await?;
    let mut roots = Vec::new();
    for sha in &shas {
        let raw = output(
            &repo,
            &["rev-list".into(), "--max-parents=0".into(), sha.clone()],
        )
        .await?;
        if let Some(root) = raw.lines().next() {
            roots.push(RootOf { sha: sha.clone(), root: root.to_string() });
        }
    }
    Ok(roots)
}
