import { useEffect, useMemo, useState } from "react";

import { readableColor } from "color2k";
import { useShallow } from "zustand/react/shallow";

import { Themes } from "@/common/constants/theme";
import { hexToHsl, resolveTheme, isHex } from "@/common/utils/color";
import { useSettings } from "@/store/settings";

import BackgroundLayer from "./background-layer";
import { ThemeNameContext } from "./use-theme";

interface Props {
  children: React.ReactNode;
}

const Theme = ({ children }: Props) => {
  const {
    themeMode,
    fontFamily,
    primaryColor,
    borderRadius,
    backgroundColor,
    customBackgroundImage,
    backgroundImageBlur,
    backgroundImageMask,
  } = useSettings(
    useShallow(s => ({
      themeMode: s.themeMode,
      fontFamily: s.fontFamily,
      primaryColor: s.primaryColor,
      borderRadius: s.borderRadius,
      backgroundColor: s.backgroundColor,
      customBackgroundImage: s.customBackgroundImage,
      backgroundImageBlur: s.backgroundImageBlur,
      backgroundImageMask: s.backgroundImageMask,
    })),
  );

  const [systemTheme, setSystemTheme] = useState<"light" | "dark" | undefined>(undefined);
  // 背景图校验失败标记（例如用户手动删除了文件）
  const [backgroundImageInvalid, setBackgroundImageInvalid] = useState(false);

  // 当 themeMode 为 system 时，监听系统主题变化并更新本地 systemTheme
  useEffect(() => {
    if (themeMode !== "system") {
      return;
    }

    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      setSystemTheme(undefined);
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = (matches: boolean) => {
      setSystemTheme(matches ? "dark" : "light");
    };

    applyTheme(mediaQuery.matches);

    const mediaQueryHandler = (event: MediaQueryListEvent) => {
      applyTheme(event.matches);
    };

    mediaQuery.addEventListener("change", mediaQueryHandler);

    return () => {
      mediaQuery.removeEventListener("change", mediaQueryHandler);
    };
  }, [themeMode]);

  // 校验自定义背景图是否仍然存在：文件被手动删除时自动回落，避免留下空白背景
  // 采用「先乐观启用、校验失败再关闭」的策略，避免每次启动都要等一次 IPC 才显示背景
  useEffect(() => {
    setBackgroundImageInvalid(false);

    if (!customBackgroundImage || !window.electron?.isThemeImageExists) {
      return;
    }

    let cancelled = false;

    window.electron
      .isThemeImageExists(customBackgroundImage)
      .then(exists => {
        if (!cancelled && !exists) {
          setBackgroundImageInvalid(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBackgroundImageInvalid(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [customBackgroundImage]);

  const activeBackgroundImage = customBackgroundImage && !backgroundImageInvalid ? customBackgroundImage : "";

  const themeName = useMemo(() => resolveTheme(themeMode, systemTheme), [themeMode, systemTheme]);

  // 将主题相关样式应用到 :root 和 body，确保挂载在 body 上的组件可读取到
  useEffect(() => {
    const root = document.documentElement;

    root.classList.remove("light", "dark");
    root.classList.add(themeName);
    root.style.colorScheme = themeName;

    const rootStyle = root.style;
    const _primaryColor = isHex(primaryColor) ? primaryColor : (Themes[themeName].colors?.primary as string);
    const _backgroundColor = isHex(backgroundColor)
      ? backgroundColor
      : (Themes[themeName].colors?.background as string);

    if (_primaryColor) {
      rootStyle.setProperty("--heroui-primary", hexToHsl(_primaryColor));
    }
    if (_backgroundColor) {
      rootStyle.setProperty("--heroui-background", hexToHsl(_backgroundColor));
      const fgHex = readableColor(_backgroundColor);
      rootStyle.setProperty("--heroui-foreground", hexToHsl(fgHex));
    }
    rootStyle.setProperty("--heroui-radius-medium", `${borderRadius}px`);

    const validFontFamily = fontFamily === "system-default" ? "system-ui" : fontFamily;
    rootStyle.fontFamily = validFontFamily || rootStyle.fontFamily;
  }, [fontFamily, primaryColor, borderRadius, themeName, backgroundColor]);

  // 启用自定义背景时给 html 打标记，供 app.css 中的作用域样式（根底色透明、面板半透明）使用
  useEffect(() => {
    const root = document.documentElement;
    const enabled = Boolean(activeBackgroundImage);

    root.classList.toggle("custom-background", enabled);

    return () => {
      root.classList.remove("custom-background");
    };
  }, [activeBackgroundImage]);

  const contextValue = useMemo(() => ({ theme: themeName }), [themeName]);

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {activeBackgroundImage ? (
        <BackgroundLayer
          imagePath={activeBackgroundImage}
          blur={backgroundImageBlur ?? 40}
          mask={backgroundImageMask ?? 45}
          theme={themeName}
        />
      ) : null}
      <div className="relative z-10 h-full w-full">
        <ThemeNameContext value={contextValue}>{children}</ThemeNameContext>
      </div>
    </main>
  );
};

export default Theme;
