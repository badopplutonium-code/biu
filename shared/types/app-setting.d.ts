type AudioQuality = "auto" | "lossless" | "high" | "medium" | "low";
type ThemeMode = "system" | "light" | "dark";
type PageTransition = "none" | "fade" | "slide" | "scale" | "slideUp";

type ProxyType = "none" | "http" | "socks4" | "socks5";

interface ProxySettings {
  type: ProxyType;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
}

interface AppSettings {
  fontFamily: string;
  primaryColor: string;
  /** 自定义背景色（为空表示使用主题默认） */
  backgroundColor: string;
  borderRadius: number;
  downloadPath?: string;
  closeWindowOption: "hide" | "exit";
  autoStart: boolean;
  audioQuality: AudioQuality;
  hiddenMenuKeys: string[];
  displayMode: "card" | "list" | "compact";
  ffmpegPath?: string;
  themeMode: ThemeMode;
  pageTransition: PageTransition;
  showSearchHistory: boolean;
  proxySettings: ProxySettings;
  sideMenuCollapsed: boolean;
  sideMenuWidth: number;
  sideMenuCollectionFolded: {
    created: boolean;
    collected: boolean;
  };
  reportPlayHistory: boolean;
  /** 本地音乐目录列表 */
  localMusicDirs: string[];
  /** 是否在启动时自动检查更新 */
  autoCheckUpdate: boolean;
  /** 是否记住播放进度（关闭后每次播放都从头开始） */
  resumePlayback: boolean;
  /** 自定义主题背景图路径（已复制到应用数据目录，为空表示不启用） */
  customBackgroundImage: string;
  /** 自定义背景图模糊强度（px） */
  backgroundImageBlur: number;
  /** 自定义背景图遮罩浓度（百分比） */
  backgroundImageMask: number;
}
