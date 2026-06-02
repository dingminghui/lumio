"use client";

import { Palette, X } from "lucide-react";
import { useState } from "react";
import { HexColorPicker } from "react-colorful";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { normalizeHex } from "@/utils/canvas";

const BG_PRESETS = ["#f5f5f5", "#000000", "#ffffff", "#00e000", "#9d5cff", "#d3c2ea"];

type BgColorControlProps = {
  bgColor: string;
  onBgColorChange: (color: string) => void;
  showDots: boolean;
  onShowDotsChange: (value: boolean) => void;
};

export function BgColorControl({
  bgColor,
  onBgColorChange,
  showDots,
  onShowDotsChange,
}: BgColorControlProps) {
  const [isColorOpen, setIsColorOpen] = useState(false);
  const [hexValue, setHexValue] = useState(bgColor);

  const submitHexInput = () => {
    const next = normalizeHex(hexValue);
    if (!next) {
      setHexValue(bgColor);
      return;
    }
    onBgColorChange(next);
  };

  return (
    <Popover
      open={isColorOpen}
      onOpenChange={(nextOpen) => {
        setIsColorOpen(nextOpen);
        if (nextOpen) {
          setHexValue(bgColor);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          aria-label="画布背景色"
          title="画布背景色"
          size="icon-sm"
          variant={isColorOpen ? "secondary" : "ghost"}
        >
          <Palette className="text-foreground/80" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-60 p-0">
        <div className="flex items-center justify-between border-b border-b-zinc-200 py-1.5 pr-3 pl-4">
          <PopoverTitle>画布背景色</PopoverTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="关闭"
            onClick={() => setIsColorOpen(false)}
          >
            <X />
          </Button>
        </div>
        <div className="space-y-3 px-3.5 pb-3">
          <HexColorPicker
            color={bgColor}
            onChange={onBgColorChange}
            className="w-full!"
          />
          <div className="flex items-center gap-2">
            {BG_PRESETS.map((preset) => (
              <Button
                key={preset}
                type="button"
                title={preset}
                aria-label={`选择背景色 ${preset}`}
                className="size-6.5 rounded-full border border-border transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                style={{ backgroundColor: preset }}
                onClick={() => onBgColorChange(preset)}
              />
            ))}
          </div>
          <InputGroup className="bg-zinc-100 ring-0! outline-0!">
            <InputGroupAddon>
              <InputGroupText>#</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              value={hexValue.replace(/^#/, "")}
              onChange={(event) => setHexValue(event.target.value)}
              onBlur={submitHexInput}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitHexInput();
                }
              }}
              aria-label="背景色 HEX"
            />
          </InputGroup>
          <div className="flex items-center justify-between px-0.5">
            <span className="text-sm text-foreground">显示点阵</span>
            <Switch checked={showDots} onCheckedChange={onShowDotsChange} />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
