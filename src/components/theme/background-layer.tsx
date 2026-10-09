import React from "react";

interface Props {
  /** 已复制到应用数据目录的图片绝对路径 */
  imagePath: string;
  /** 模糊强度（px） */
  blur: number;
  /** 遮罩浓度（百分比，0-100） */
  mask: number;
  /** 当前解析后的主题，用于决定遮罩颜色 */
  theme: "light" | "dark";
}

/** 将本地绝对路径转换为可用于 CSS 的 file:// URL（Windows 反斜杠需替换） */
export const toFileUrl = (targetPath: string) => `file://${targetPath.replace(/\\/g, "/")}`;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * 自定义主题背景层。
 *
 * 结构与全屏播放页的模糊背景一致：图片铺满 → 高斯模糊 → 叠一层主题色遮罩保证文字可读性。
 * 与全屏播放页的差异在于：
 * 1. 图片向外扩张 2 倍模糊半径，使模糊产生的边缘透明衰减完全落在可视区域之外，
 *    因此无需放大裁剪即可获得干净的铺满效果（模糊为 0 时扩张为 0，不做任何缩放）；
 * 2. 遮罩颜色跟随主题：深色主题压黑、浅色主题提白。
 */
const BackgroundLayer = ({ imagePath, blur, mask, theme }: Props) => {
  const blurValue = clamp(blur, 0, 80);
  const maskOpacity = clamp(mask, 0, 100) / 100;
  const bleed = blurValue * 2;
  const scrim = theme === "dark" ? `rgba(0, 0, 0, ${maskOpacity})` : `rgba(255, 255, 255, ${maskOpacity})`;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div
        className="absolute bg-cover bg-center bg-no-repeat"
        style={{
          inset: `-${bleed}px`,
          backgroundImage: `url("${toFileUrl(imagePath)}")`,
          filter: `blur(${blurValue}px)`,
          willChange: "filter",
          transition: "filter 200ms ease",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: scrim,
          transition: "background-color 200ms ease",
        }}
      />
    </div>
  );
};

export default BackgroundLayer;
