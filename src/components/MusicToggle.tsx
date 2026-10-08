import { useEffect, useState } from "react";
import { Music, VolumeX } from "lucide-react";
import { startMusic, stopMusic } from "@/lib/sound";

const PREF = "hyp-music";

export function MusicToggle() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(PREF) === "off") return;
    // Browsers only allow sound after the first touch/click.
    const begin = () => {
      startMusic();
      setOn(true);
      window.removeEventListener("pointerdown", begin);
    };
    window.addEventListener("pointerdown", begin);
    return () => window.removeEventListener("pointerdown", begin);
  }, []);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (on) {
      stopMusic();
      localStorage.setItem(PREF, "off");
      setOn(false);
    } else {
      startMusic();
      localStorage.setItem(PREF, "on");
      setOn(true);
    }
  };

  return (
    <button
      onPointerDown={(e) => e.stopPropagation()}
      onClick={toggle}
      aria-label={on ? "Turn music off" : "Turn music on"}
      className="fixed bottom-4 left-4 z-40 flex size-11 items-center justify-center rounded-full surface-card text-primary animate-glow"
    >
      {on ? <Music className="size-5 animate-pulse" /> : <VolumeX className="size-5" />}
    </button>
  );
}
