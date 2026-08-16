import { useState, useEffect } from 'react';

export const useNavigation = () => {
  const [pathname, setPathname] = useState(window.location.pathname);
  const [search, setSearch] = useState(window.location.search);

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
      setSearch(window.location.search);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    const navEvent = new PopStateEvent('popstate');
    window.dispatchEvent(navEvent);
  };

  const back = () => {
    const pathBeforeBack = window.location.pathname;
    window.history.back();
    // Safety net: on some Android WebView configurations, history.back() can
    // silently no-op (no popstate fires) when the only prior entry is a
    // client-side pushState — not a real page load — leaving the user stuck
    // on the page they tried to leave. If nothing happened after a beat,
    // force a deterministic navigation home instead of leaving them stranded.
    setTimeout(() => {
      if (window.location.pathname === pathBeforeBack) {
        navigate('/');
      }
    }, 400);
  };

  return { pathname, search, navigate, back };
};
