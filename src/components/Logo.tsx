import { useRef } from "react";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  size?: number;
  onTripleTap?: () => void;
};

export function Logo({ className, size = 48, onTripleTap }: Props) {
  const taps = useRef<number[]>([]);

  const handleClick = () => {
    if (!onTripleTap) return;
    const now = Date.now();
    taps.current = [...taps.current, now].filter((t) => now - t <= 2000);
    if (taps.current.length >= 3) {
      taps.current = [];
      onTripleTap();
    }
  };

  return (
    <img
      src={logo}
      alt="Hypnotism course logo: concentric spiral forming an eye"
      width={size}
      height={size}
      onClick={handleClick}
      className={cn("no-select select-none", onTripleTap && "cursor-pointer", className)}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}
