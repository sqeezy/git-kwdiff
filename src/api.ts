import { isTauri } from './git'
import { mockGit } from './mock'
import { tauriGit } from './tauri'

// One seam, two implementations. The browser dev server and the tests get the
// fixture; the desktop window gets git.
export const gitApi = isTauri() ? tauriGit : mockGit
