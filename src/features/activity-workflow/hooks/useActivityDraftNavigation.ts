"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function useActivityDraftNavigation(unsaved: () => boolean) {
  const router = useRouter();
  const blocked = useRef(unsaved);
  blocked.current = unsaved;
  const bypass = useRef(false);
  const [destination, setDestination] = useState<string | null>(null);

  useEffect(() => {
    const currentUrl = window.location.href;
    const currentState: unknown = window.history.state;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!blocked.current() || bypass.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const click = (event: MouseEvent) => {
      if (!blocked.current() || bypass.current || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const target = new URL(anchor.href, window.location.href);
      if (!["http:", "https:"].includes(target.protocol) || (target.pathname === window.location.pathname && target.search === window.location.search)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setDestination(target.href);
    };
    const pop = (event: PopStateEvent) => {
      if (!blocked.current() || bypass.current) return;
      const target = window.location.href;
      if (target === currentUrl) return;
      // Keep the editor mounted while the user decides, before Next handles the pop.
      event.stopImmediatePropagation();
      window.history.pushState(currentState, "", currentUrl);
      setDestination(target);
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    window.addEventListener("popstate", pop, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
      window.removeEventListener("popstate", pop, true);
    };
  }, []);

  const navigate = useCallback((href: string) => {
    bypass.current = true;
    setDestination(null);
    const url = new URL(href, window.location.href);
    if (url.origin === window.location.origin) router.push(`${url.pathname}${url.search}${url.hash}`);
    else window.location.assign(url.href);
  }, [router]);

  const request = (href: string) => {
    if (blocked.current()) setDestination(href);
    else navigate(href);
  };
  return { destination, navigate, request, cancel: () => setDestination(null) };
}
