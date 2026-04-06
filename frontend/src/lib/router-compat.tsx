import { useContext, useMemo, useSyncExternalStore } from "react";
import type { MouseEvent, ReactNode } from "react";
import {
  UNSAFE_LocationContext,
  UNSAFE_NavigationContext,
  createPath,
  parsePath,
  type To,
  useInRouterContext,
} from "react-router-dom";

type NavigateOptions = { replace?: boolean };

type SearchParamsInit =
  | URLSearchParams
  | string
  | Record<string, string | number | boolean | null | undefined>
  | Array<[string, string]>;

type RouterLocation = {
  pathname: string;
  search: string;
  hash: string;
};

type RouterNavigator = {
  push: (to: To) => void;
  replace: (to: To) => void;
};

type NavigationContextValue = {
  navigator: RouterNavigator;
};

type LocationContextValue = {
  location: RouterLocation;
};

function subscribeToNoopStore() {
  return () => {};
}

function useHasHydrated() {
  return useSyncExternalStore(subscribeToNoopStore, () => true, () => false);
}

function subscribeToBrowserLocationChanges(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("popstate", onStoreChange);
  window.addEventListener("hashchange", onStoreChange);

  return () => {
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener("hashchange", onStoreChange);
  };
}

function getBrowserLocationSearch() {
  if (typeof window === "undefined") {
    return "";
  }
  return window.location.search;
}

function getBrowserLocationPathname() {
  if (typeof window === "undefined") {
    return "/";
  }
  return window.location.pathname;
}

function emitBrowserLocationChange() {
  if (typeof window === "undefined") {
    return;
  }

  const event =
    typeof PopStateEvent === "function"
      ? new PopStateEvent("popstate")
      : new Event("popstate");
  window.dispatchEvent(event);
}

type WindowWithNextData = Window & {
  __NEXT_DATA__?: unknown;
};

function isNextAppRuntime() {
  if (typeof window === "undefined") {
    return false;
  }

  const maybeNextWindow = window as WindowWithNextData;
  if (typeof maybeNextWindow.__NEXT_DATA__ !== "undefined") {
    return true;
  }

  return Boolean(document.getElementById("__NEXT_DATA__"));
}

function isJsdomRuntime() {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /jsdom/i.test(navigator.userAgent);
}

function toHref(to: To): string {
  if (typeof to === "string") {
    return to;
  }
  return createPath(to);
}

function navigateWithBrowserHistory(to: To, options?: NavigateOptions) {
  if (typeof window === "undefined") {
    return;
  }

  const href = toHref(to);
  const nextUrl = new URL(href, window.location.href);
  const sameOrigin = nextUrl.origin === window.location.origin;

  if (!sameOrigin) {
    if (options?.replace) {
      window.location.replace(nextUrl.toString());
    } else {
      window.location.assign(nextUrl.toString());
    }
    return;
  }

  const nextPathname = nextUrl.pathname;
  const currentPathname = window.location.pathname;
  const shouldDocumentNavigate =
    isNextAppRuntime() && nextPathname !== currentPathname && !isJsdomRuntime();
  if (shouldDocumentNavigate) {
    try {
      if (options?.replace) {
        window.location.replace(nextUrl.toString());
      } else {
        window.location.assign(nextUrl.toString());
      }
      return;
    } catch {
      // jsdom and constrained runtimes may not implement full navigation.
      // Fall back to history updates so tests and non-browser runtimes continue working.
    }
  }

  const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
  if (options?.replace) {
    window.history.replaceState(window.history.state, "", nextPath);
  } else {
    window.history.pushState(window.history.state, "", nextPath);
  }
  emitBrowserLocationChange();
}

function isToActive(to: To, pathname: string, search: string) {
  const normalizedTo = typeof to === "string" ? parsePath(to) : to;

  const targetPathname = normalizedTo.pathname ?? pathname;
  if (targetPathname !== pathname) {
    return false;
  }

  if (normalizedTo.search != null) {
    return normalizedTo.search === search;
  }

  return true;
}

function normalizeSearchParams(input: SearchParamsInit): URLSearchParams {
  if (input instanceof URLSearchParams) {
    return new URLSearchParams(input);
  }
  if (Array.isArray(input) || typeof input === "string") {
    return new URLSearchParams(input);
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) {
      continue;
    }
    params.set(key, String(value));
  }
  return params;
}

export function useNavigate() {
  const inRouterContext = useInRouterContext();
  const navigationContext = useContext(UNSAFE_NavigationContext) as
    | NavigationContextValue
    | null;

  return (to: To, options?: NavigateOptions) => {
    if (inRouterContext && navigationContext) {
      if (options?.replace) {
        navigationContext.navigator.replace(to);
      } else {
        navigationContext.navigator.push(to);
      }
      return;
    }

    navigateWithBrowserHistory(to, options);
  };
}

export function useSearchParams(): [
  URLSearchParams,
  (next: SearchParamsInit, options?: NavigateOptions) => void,
] {
  const inRouterContext = useInRouterContext();
  const navigationContext = useContext(UNSAFE_NavigationContext) as
    | NavigationContextValue
    | null;
  const locationContext = useContext(UNSAFE_LocationContext) as LocationContextValue | null;
  const browserSearch = useSyncExternalStore(
    subscribeToBrowserLocationChanges,
    getBrowserLocationSearch,
    getBrowserLocationSearch,
  );

  const search = inRouterContext ? (locationContext?.location.search ?? "") : browserSearch;
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);

  const setCompatSearchParams = (next: SearchParamsInit, options?: NavigateOptions) => {
    const nextSearchParams = normalizeSearchParams(next);
    const nextSearch = nextSearchParams.toString();

    if (inRouterContext && navigationContext && locationContext) {
      const currentLocation = locationContext.location;
      const nextTo: To = {
        pathname: currentLocation.pathname,
        search: nextSearch ? `?${nextSearch}` : "",
        hash: currentLocation.hash,
      };

      if (options?.replace) {
        navigationContext.navigator.replace(nextTo);
      } else {
        navigationContext.navigator.push(nextTo);
      }
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const nextTo = {
      pathname: window.location.pathname,
      search: nextSearch ? `?${nextSearch}` : "",
      hash: window.location.hash,
    };
    navigateWithBrowserHistory(nextTo, options);
  };

  return [searchParams, setCompatSearchParams];
}

type NavLinkRenderState = {
  isActive: boolean;
};

type NavLinkProps = {
  to: To;
  className?: string | ((state: NavLinkRenderState) => string);
  children?: ReactNode | ((state: NavLinkRenderState) => ReactNode);
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export function NavLink({ to, className, children, onClick }: NavLinkProps) {
  const inRouterContext = useInRouterContext();
  const locationContext = useContext(UNSAFE_LocationContext) as LocationContextValue | null;
  const navigationContext = useContext(UNSAFE_NavigationContext) as
    | NavigationContextValue
    | null;
  const hasHydrated = useHasHydrated();

  const browserPathname = useSyncExternalStore(
    subscribeToBrowserLocationChanges,
    getBrowserLocationPathname,
    getBrowserLocationPathname,
  );
  const browserSearch = useSyncExternalStore(
    subscribeToBrowserLocationChanges,
    getBrowserLocationSearch,
    getBrowserLocationSearch,
  );

  const routerLocation = locationContext?.location ?? null;
  const routerNavigator = navigationContext?.navigator ?? null;
  const canUseRouterNavigation =
    inRouterContext && routerNavigator !== null && routerLocation !== null;
  const isActive = canUseRouterNavigation
    ? isToActive(to, routerLocation!.pathname, routerLocation!.search)
    : hasHydrated && isToActive(to, browserPathname, browserSearch);

  return (
    <a
      href={toHref(to)}
      className={
        typeof className === "function"
          ? className({ isActive })
          : className
      }
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) {
          return;
        }

        if (
          event.button !== 0 ||
          event.metaKey ||
          event.altKey ||
          event.ctrlKey ||
          event.shiftKey
        ) {
          return;
        }

        event.preventDefault();
        if (canUseRouterNavigation) {
          routerNavigator!.push(to);
          return;
        }
        navigateWithBrowserHistory(to);
      }}
    >
      {typeof children === "function"
        ? children({ isActive })
        : children}
    </a>
  );
}
