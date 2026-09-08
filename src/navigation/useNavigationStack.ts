import { useCallback, useMemo, useState } from 'react';

import { AppRoute, TabKey } from '@/context/AppStoreContext';

/**
 * The app's navigation is a plain route stack held in state — no navigator
 * library. `push` grows it, `goBack` pops it (never past the root), `replace`
 * swaps the top entry, and `reset` drops the whole stack for a new root, which
 * is what sign-in and sign-out need.
 */
export function useNavigationStack(initialRoute: AppRoute) {
  const [stack, setStack] = useState<AppRoute[]>([initialRoute]);

  const push = useCallback(
    (route: AppRoute) => setStack((prev) => [...prev, route]),
    [],
  );

  const replace = useCallback(
    (route: AppRoute) =>
      setStack((prev) => [...prev.slice(0, Math.max(prev.length - 1, 0)), route]),
    [],
  );

  const goBack = useCallback(
    () => setStack((prev) => (prev.length > 1 ? prev.slice(0, prev.length - 1) : prev)),
    [],
  );

  const reset = useCallback((route: AppRoute) => setStack([route]), []);

  const openTab = useCallback(
    (tab: TabKey) => replace(`main-${tab}` as AppRoute),
    [replace],
  );

  const currentRoute = stack[stack.length - 1];

  return useMemo(
    () => ({ currentRoute, push, replace, goBack, reset, openTab }),
    [currentRoute, push, replace, goBack, reset, openTab],
  );
}
