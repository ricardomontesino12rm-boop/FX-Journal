import os from 'os';
import path from 'path';

export function getAppDataPath() {
  const appName = 'FXJournal';
  const platform = os.platform();
  
  // If we are explicitly passing an env var (e.g., from Electron Main Process)
  if (process.env.APP_DATA_PATH) {
    return process.env.APP_DATA_PATH;
  }

  let basePath = '';

  if (platform === 'win32') {
    basePath = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  } else if (platform === 'darwin') {
    basePath = path.join(os.homedir(), 'Library', 'Application Support');
  } else {
    // Linux
    basePath = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  }

  return path.join(basePath, appName);
}
