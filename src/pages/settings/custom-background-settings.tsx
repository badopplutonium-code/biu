import React, { useEffect, useState } from "react";
import { Controller, useWatch } from "react-hook-form";
import type { Control, UseFormSetValue } from "react-hook-form";

import { addToast, Button, Slider } from "@heroui/react";
import { RiDeleteBin6Line, RiImageAddLine } from "@remixicon/react";

import { toFileUrl } from "@/components/theme/background-layer";

interface Props {
  control: Control<AppSettings>;
  setValue: UseFormSetValue<AppSettings>;
}

const DEFAULT_BLUR = 40;
const DEFAULT_MASK = 45;

const CustomBackgroundSettings = ({ control, setValue }: Props) => {
  const imagePath = useWatch({ control, name: "customBackgroundImage" }) || "";
  const [isBusy, setIsBusy] = useState(false);
  // 图片文件被手动删除时给出提示，避免用户看到「选了图却没有任何效果」
  const [isImageMissing, setIsImageMissing] = useState(false);

  // 校验图片是否仍然存在（用户可能手动清理过应用数据目录）
  useEffect(() => {
    if (!imagePath || !window.electron?.isThemeImageExists) {
      setIsImageMissing(false);
      return;
    }

    let cancelled = false;

    window.electron
      .isThemeImageExists(imagePath)
      .then(exists => {
        if (!cancelled) setIsImageMissing(!exists);
      })
      .catch(() => {
        if (!cancelled) setIsImageMissing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [imagePath]);

  const handleSelect = async () => {
    if (isBusy) return;

    if (!window.electron?.selectThemeImage || !window.electron?.applyThemeImage) {
      addToast({ color: "danger", title: "当前环境不支持选择本地图片" });
      return;
    }

    try {
      const sourcePath = await window.electron.selectThemeImage();
      if (!sourcePath) return;

      setIsBusy(true);
      const finalPath = await window.electron.applyThemeImage(sourcePath);
      setValue("customBackgroundImage", finalPath, { shouldDirty: true, shouldTouch: true });
      setIsImageMissing(false);
      addToast({ color: "success", title: "背景已设置" });
    } catch (error) {
      addToast({
        color: "danger",
        title: "设置背景失败",
        description: error instanceof Error ? error.message : "请稍后重试",
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleClear = async () => {
    if (isBusy) return;

    setIsBusy(true);
    try {
      await window.electron?.clearThemeImage?.();
      setValue("customBackgroundImage", "", { shouldDirty: true, shouldTouch: true });
      setIsImageMissing(false);
      addToast({ color: "success", title: "已清除自定义背景" });
    } catch (error) {
      addToast({
        color: "danger",
        title: "清除背景失败",
        description: error instanceof Error ? error.message : "请稍后重试",
      });
    } finally {
      setIsBusy(false);
    }
  };

  const renderRow = (label: string, value: number, maxValue: number, unit: string, onChange: (v: number) => void) => (
    <div className="flex w-full flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-500">{label}</span>
        <span className="text-zinc-500 tabular-nums">
          {Math.round(value)}
          {unit}
        </span>
      </div>
      <Slider
        aria-label={label}
        size="sm"
        color="primary"
        minValue={0}
        maxValue={maxValue}
        step={1}
        value={value}
        onChange={v => onChange(v as number)}
        isDisabled={!imagePath}
        classNames={{ track: "h-1" }}
      />
    </div>
  );

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="mr-6 space-y-1">
        <div className="text-medium font-medium">自定义主题背景</div>
        <div className="text-sm text-zinc-500">
          选择一张本地图片作为应用背景，界面面板会自动半透明化，透出虚化后的背景
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="border-default bg-default-100/40 flex h-[72px] w-[128px] flex-none items-center justify-center overflow-hidden rounded-medium border">
          {imagePath && !isImageMissing ? (
            <img src={toFileUrl(imagePath)} alt="背景预览" className="h-full w-full object-cover" />
          ) : (
            <span className="text-zinc-500 text-xs">{isImageMissing ? "图片已失效" : "未设置"}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="flat"
            color="primary"
            isLoading={isBusy}
            startContent={isBusy ? undefined : <RiImageAddLine size={16} />}
            onPress={handleSelect}
          >
            {imagePath ? "更换图片" : "选择图片"}
          </Button>
          {imagePath ? (
            <Button
              size="sm"
              variant="flat"
              color="danger"
              isDisabled={isBusy}
              startContent={<RiDeleteBin6Line size={16} />}
              onPress={handleClear}
            >
              清除
            </Button>
          ) : null}
        </div>
      </div>

      {isImageMissing ? (
        <div className="text-sm text-warning">背景图片文件已不存在，请重新选择或点击「清除」。</div>
      ) : null}

      <div className="border-default/40 flex w-full max-w-[520px] flex-col gap-4 border-l pl-4">
        <Controller
          control={control}
          name="backgroundImageBlur"
          render={({ field }) => {
            const value = typeof field.value === "number" ? field.value : DEFAULT_BLUR;
            return renderRow("模糊强度", value, 80, " px", v => field.onChange(v));
          }}
        />
        <Controller
          control={control}
          name="backgroundImageMask"
          render={({ field }) => {
            const value = typeof field.value === "number" ? field.value : DEFAULT_MASK;
            return renderRow("遮罩浓度", value, 100, " %", v => field.onChange(v));
          }}
        />
      </div>
    </div>
  );
};

export default CustomBackgroundSettings;
