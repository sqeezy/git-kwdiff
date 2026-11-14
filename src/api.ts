import { isTauri } from './git'
import { mockConfigApi, mockGit } from './mock'
import { tauriConfig, tauriGit } from './tauri'

// One seam, two implementations. The browser dev server and the tests get the
// fixture; the desktop window gets git and the app data dir.
export const gitApi = isTauri() ? tauriGit : mockGit
export const configApi = isTauri() ? tauriConfig : mockConfigApi
