import { BrowserWindow } from "electron";
import isDev from "electron-is-dev";
import log from "electron-log";
import electronUpdater, { type UpdateDownloadedEvent } from "electron-updater";
import path from "node:path";

import { channel } from "../ipc/channel";

const { autoUpdater } = electronUpdater;

let checkForUpdatesInterval: NodeJS.Timeout | null = null;

/**
 * 运行时的自动检查开关。
 * 由 setupAutoUpdater 注入，用于在不重启应用的情况下响应用户设置变更。
 */
let shouldAutoCheck: () => boolean = () => true;

/** 供外部（如设置变更时）动态更新开关状态 */
function setAutoCheckEnabledGetter(getter: () => boolean) {
  shouldAutoCheck = getter;
}

function setupAutoUpdater({
  getMainWindow,
  getAutoCheckEnabled,
}: {
  getMainWindow: () => BrowserWindow | null;
  getAutoCheckEnabled?: () => boolean;
}) {
  if (getAutoCheckEnabled) {
    setAutoCheckEnabledGetter(getAutoCheckEnabled);
  }

  autoUpdater.logger = log;
  log.transports.file.level = "info";
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.autoRunAppAfterInstall = true;
  autoUpdater.allowPrerelease = true;

  if (isDev) {
    autoUpdater.updateConfigPath = path.resolve(process.cwd(), "electron/updater/dev-app-update.yml");
    autoUpdater.forceDevUpdateConfig = true;
    autoUpdater.autoRunAppAfterInstall = false;
  }

  autoUpdater.on("update-available", info => {
    const mainWindow = getMainWindow();
    mainWindow?.webContents.send(channel.app.onUpdateAvailable, {
      latestVersion: info.version,
      releaseNotes: info.releaseNotes,
    });
  });

  autoUpdater.on("download-progress", progressObj => {
    const mainWindow = getMainWindow();
    mainWindow?.webContents.send(channel.app.updateMessage, {
      status: "downloading",
      processInfo: progressObj,
    });
  });

  autoUpdater.on("error", error => {
    const mainWindow = getMainWindow();
    mainWindow?.webContents.send(channel.app.updateMessage, {
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    });
  });

  autoUpdater.on("update-downloaded", (info: UpdateDownloadedEvent) => {
    const mainWindow = getMainWindow();
    mainWindow?.webContents.send(channel.app.updateMessage, {
      status: "downloaded",
      downloadInfo: {
        filePath: info.downloadedFile,
      },
    });
  });

  // 启动时按用户设置决定是否自动检查
  if (shouldAutoCheck()) {
    autoUpdater.checkForUpdates();
  } else {
    log.info("[updater] 自动检查更新已关闭，跳过启动检查");
  }

  checkForUpdatesInterval = setInterval(
    () => {
      if (!shouldAutoCheck()) return;
      autoUpdater.checkForUpdates();
    },
    1 * 60 * 60 * 1000,
  );
}

const stopCheckForUpdates = () => {
  if (checkForUpdatesInterval) {
    clearInterval(checkForUpdatesInterval);
    checkForUpdatesInterval = null;
  }
};

export { autoUpdater, setupAutoUpdater, setAutoCheckEnabledGetter, stopCheckForUpdates };
