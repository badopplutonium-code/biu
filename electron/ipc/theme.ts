import type { IpcMainInvokeEvent } from "electron";

import { dialog, ipcMain } from "electron";
import log from "electron-log";
import fs from "node:fs";
import path from "node:path";

import { getUserDataPath } from "../utils";
import { channel } from "./channel";

/**
 * 支持的图片格式。
 * 全部为 Chromium 可作为 CSS background-image 直接渲染的格式，
 * 因此渲染端无需额外解码，直接走 file:// 引用即可。
 */
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "bmp", "gif", "avif", "ico", "svg"];

/** 背景图存放目录（位于应用数据目录下，避免污染用户原始文件） */
const THEME_DIR_NAME = "themes";
/** 背景图统一前缀，便于清理历史文件 */
const BACKGROUND_FILE_PREFIX = "background-";

const getThemeDir = () => path.join(getUserDataPath(), THEME_DIR_NAME);

const isSupportedExtension = (ext: string) => IMAGE_EXTENSIONS.includes(ext);

/**
 * 清理历史背景图。
 * 每次更换背景都会写入带时间戳的新文件（用于规避 file:// 缓存），
 * 因此必须同时清理旧文件，否则会随使用时长不断堆积。
 */
const cleanupBackgroundFiles = async (dir: string) => {
  try {
    const entries = await fs.promises.readdir(dir);
    await Promise.all(
      entries
        .filter(name => name.startsWith(BACKGROUND_FILE_PREFIX))
        .map(name => fs.promises.unlink(path.join(dir, name)).catch(() => undefined)),
    );
  } catch (error) {
    // 目录不存在属于正常情况（尚未设置过背景图）
    log.error("[theme] 清理历史背景图失败:", error);
  }
};

export function registerThemeHandlers() {
  /** 打开系统文件选择对话框，仅返回用户选择的源路径，不落盘 */
  ipcMain.handle(channel.theme.selectImage, async (_event: IpcMainInvokeEvent) => {
    const result = await dialog.showOpenDialog({
      title: "选择背景图片",
      properties: ["openFile"],
      filters: [{ name: "图片", extensions: IMAGE_EXTENSIONS }],
    });

    if (result.canceled) return null;

    return result.filePaths?.[0] ?? null;
  });

  /** 将用户选择的图片复制到应用数据目录，返回最终可用路径（带时间戳，规避缓存） */
  ipcMain.handle(channel.theme.applyImage, async (_event: IpcMainInvokeEvent, sourcePath: string) => {
    if (!sourcePath || !fs.existsSync(sourcePath)) {
      throw new Error("图片文件不存在");
    }

    const ext = path.extname(sourcePath).slice(1).toLowerCase();
    if (!isSupportedExtension(ext)) {
      throw new Error("不支持的图片格式");
    }

    const dir = getThemeDir();
    await fs.promises.mkdir(dir, { recursive: true });
    await cleanupBackgroundFiles(dir);

    const target = path.join(dir, `${BACKGROUND_FILE_PREFIX}${Date.now()}.${ext}`);
    await fs.promises.copyFile(sourcePath, target);

    return target;
  });

  /** 清除已保存的背景图 */
  ipcMain.handle(channel.theme.clearImage, async () => {
    await cleanupBackgroundFiles(getThemeDir());
    return true;
  });

  /**
   * 校验背景图是否仍然存在。
   * 用于应用启动时兜底：文件被手动删除后渲染端应回落到纯色背景，而不是留下空白。
   */
  ipcMain.handle(channel.theme.imageExists, async (_event: IpcMainInvokeEvent, imagePath: string) => {
    if (!imagePath) return false;

    try {
      if (!fs.existsSync(imagePath)) return false;

      const stat = await fs.promises.stat(imagePath);
      if (!stat.isFile() || stat.size === 0) return false;

      return isSupportedExtension(path.extname(imagePath).slice(1).toLowerCase());
    } catch (error) {
      log.error("[theme] 校验背景图失败:", error);
      return false;
    }
  });
}
