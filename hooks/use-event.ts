"use client";

import { useEffect } from "react";

type UseEventOptions<K extends keyof WindowEventMap> = {
  name: K;
  handler?: ((event: WindowEventMap[K]) => void) | null;
  target?: Window | null;
  options?: boolean | AddEventListenerOptions;
};

export function useEvent<K extends keyof WindowEventMap>({
  name,
  handler,
  target,
  options,
}: UseEventOptions<K>) {
  useEffect(() => {
    if (!handler || !target) {
      return;
    }

    const listener: EventListener = (event) => handler(event as WindowEventMap[K]);
    target.addEventListener(name, listener, options);

    return () => target.removeEventListener(name, listener, options);
  }, [name, handler, options, target]);
}
