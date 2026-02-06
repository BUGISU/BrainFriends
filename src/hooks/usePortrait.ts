"use client";

import { useEffect, useState } from "react";

export function usePortrait() {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const update = () => setIsPortrait(window.innerHeight > window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return isPortrait;
}
