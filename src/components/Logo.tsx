import { useRef } from "react";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

type Props = {
  className?: string | undefined;
  size?: number | undefined;
  onTripleTap?: (() => void) | undefined;
};

export function Logo({
  className,
  size = 48,
  onTripleTap,
}: Props) {
  const taps = useRef<number[]>([]);

  const handleClick = () => {
    const now = Date.now();

    // Keep only taps from the last 2 seconds
    taps.current = [
      ...taps.current,
      now,
    ].filter(
      (time) => now - time <= 2000
    );

    // 3 taps = open Admin Access
    if (taps.current.length >= 3) {
      taps.current = [];

      if (onTripleTap) {
        onTripleTap();
      } else {
        window.location.href = "/admin-access";
      }
    }
  };

  return (
    <img
      src={logo}
      alt="Hypnotism course logo"
      width={size}
      height={size}
      onClick={handleClick}
      className={cn(
        "no-select select-none cursor-pointer",
        className
      )}
      style={{
        width: size,
        height: size,
        WebkitUserSelect: "none",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
      }}
      draggable={false}
    />
  );
}
