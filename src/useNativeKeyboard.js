import { useEffect } from "react";
export default function useNativeKeyboard(enabled) {
  useEffect(() => {
    if (!enabled) return;
    let baseline = window.visualViewport?.height || innerHeight;
    let width = innerWidth;
    let timers = [];
    const fit = () => {
      const height = window.visualViewport?.height || innerHeight;
      if (Math.abs(innerWidth - width) > 100) baseline = height;
      width = innerWidth;
      baseline = Math.max(baseline, height);
      document.documentElement.classList.toggle(
        "native-keyboard-open",
        height < baseline - 150,
      );
      const active = document.activeElement;
      if (
        active?.matches(
          "input:not([type=checkbox]):not([type=radio]),textarea,select",
        )
      )
        active.scrollIntoView({
          block: "center",
          inline: "nearest",
          behavior: "smooth",
        });
    };
    const schedule = () => {
      timers.forEach(clearTimeout);
      timers = [setTimeout(fit, 100), setTimeout(fit, 350)];
    };
    document.addEventListener("focusin", schedule);
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    return () => {
      timers.forEach(clearTimeout);
      document.removeEventListener("focusin", schedule);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      document.documentElement.classList.remove("native-keyboard-open");
    };
  }, [enabled]);
}
