import React, { useState, useEffect, useRef } from 'react';
import Route from './Route';
import NotFound from './NotFound';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

const pushEase: [number, number, number, number] = [0.32, 0.72, 0, 1];
const PUSH_DURATION = 0.3;
const pushTransition = { duration: PUSH_DURATION, ease: pushEase };

// What the entering/exiting page needs to know about the navigation:
// which page is on the other side of it, and whether we moved forward or back.
type NavInfo = { other: string; direction: 'push' | 'pop' };

// The page underneath a push parallaxes left and dims (native iOS style) so
// both layers move together — leaving it static makes the incoming page look
// like it "isn't on top" while it slides.
const COVERED = { x: '-24%', opacity: 0.85 };

const SLIDE_PAGES = [
  '/listing/', '/pay-link/', '/check-in/', '/preferences', '/trips', '/past-trips',
  '/notifications', '/verify-identity', '/import-listing', '/about-us',
  '/contact-us', '/terms', '/privacy-policy', '/refund-policy',
  '/catalogue', '/booking-flow',
];
const isSlidePage = (p: string) => SLIDE_PAGES.some((prefix) => p.startsWith(prefix));

// Pushed pages (details, settings, legal, flows) slide in/out from the right
// like a native navigation push. Enter and exit are exact mirrors so the back
// button reverses the open animation. Opacity stays 1 while sliding — fading
// a page that doesn't yet cover the screen flashes the background behind it.
const slideVariants: Variants = {
  enter: ({ other, direction }: NavInfo) =>
    direction === 'pop' && isSlidePage(other)
      ? { ...COVERED, zIndex: 0 } // re-revealed from under the page that just popped
      : { x: '100%', opacity: 1, zIndex: 10 },
  center: { x: 0, opacity: 1, zIndex: 10, transition: pushTransition },
  exit: ({ other, direction }: NavInfo) =>
    direction === 'push' && isSlidePage(other)
      ? { ...COVERED, zIndex: 0, transition: pushTransition } // covered by the next push
      : { x: '100%', opacity: 1, zIndex: 20, transition: pushTransition }, // popped away
};

// Root tabs (profile, messages, hosting) crossfade between each other,
// but parallax like a covered page when a slide page pushes over them.
// Fade-exit goes to 0 (not 0.85): the exiting tab can now sit ABOVE the
// always-mounted home page, so any leftover opacity pops when it unmounts.
const fadeVariants: Variants = {
  enter: ({ other, direction }: NavInfo) =>
    direction === 'pop' && isSlidePage(other)
      ? { ...COVERED, zIndex: 0 }
      : { opacity: 0.85, x: 0, zIndex: 0 },
  center: { opacity: 1, x: 0, zIndex: 0, transition: pushTransition },
  exit: ({ other }: NavInfo) =>
    isSlidePage(other)
      ? { ...COVERED, zIndex: 0, transition: pushTransition }
      : { opacity: 0, x: 0, zIndex: 0, transition: { duration: 0.22 } },
};

// The home page is special-cased: it stays permanently mounted. Unmounting it
// on every push (and remounting on every pop) rebuilt hundreds of image/motion
// nodes mid-transition — the frame drops and the image flash on back. Instead
// of entering/exiting the tree it just animates between three states.
// 'visibility' is non-animatable so framer applies it instantly on show and,
// via transitionEnd, only after the fade completes on hide.
const homeVariants: Variants = {
  center: { x: 0, opacity: 1, visibility: 'visible', transition: pushTransition },
  covered: { ...COVERED, visibility: 'visible', transition: pushTransition },
  hiddenTab: {
    x: 0,
    opacity: 0,
    transition: { duration: 0.22 },
    transitionEnd: { visibility: 'hidden' },
  },
};

// PageWrapper captures its own 'path' prop so the EXITING element
// still knows which variants to use (not the new path from the closure).
const PageWrapper: React.FC<{ pagePath: string; nav: NavInfo; children: React.ReactNode }> = ({ pagePath, nav, children }) => {
  const variants = isSlidePage(pagePath) ? slideVariants : fadeVariants;

  return (
    <motion.div
      custom={nav}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      style={{
        position: 'absolute',
        inset: 0,
        // No manual will-change here. Framer Motion already sets it for the
        // duration of an animation and clears it afterwards; hard-coding it
        // pins this full-screen element into its own GPU layer permanently.
        // Android discards GPU tile memory when the app is backgrounded, so
        // every permanently-promoted layer has to be re-rasterised on resume
        // — which showed up as the whole page blanking for a frame.
        // Edge shadow so the white-on-white slide reads as a layer moving
        // over the page behind it
        ...(isSlidePage(pagePath) ? { boxShadow: '-8px 0 32px rgba(0,0,0,0.12)' } : {}),
      }}
    >
      {children}
    </motion.div>
  );
};

interface RouterProps {
  children: React.ReactNode;
}

const getRouteKey = (currentPath: string) => {
  if (currentPath === '/hosting/verify') {
    return '/hosting/verify';
  }
  if (currentPath.startsWith('/hosting')) {
    return '/hosting-dashboard';
  }
  return currentPath;
};

const Router: React.FC<RouterProps> = ({ children }) => {
  const [path, setPath] = useState(window.location.pathname);
  // popstate doesn't say which way we moved, so keep our own stack of visited
  // paths: navigating to the path one below the top is a pop, anything else a push.
  const pathRef = useRef(window.location.pathname);
  const stackRef = useRef<string[]>([window.location.pathname]);
  const navRef = useRef<NavInfo>({ other: window.location.pathname, direction: 'push' });
  // Stable object identity per navigation — recreating these on every render
  // makes framer re-resolve (and restart) in-flight animations each time any
  // parent state changes, which can freeze the transition entirely.
  const exitCustomRef = useRef<NavInfo>({ other: window.location.pathname, direction: 'push' });

  useEffect(() => {
    const onLocationChange = () => {
      const newPath = window.location.pathname;
      const prev = pathRef.current;
      if (newPath === prev) return;

      const stack = stackRef.current;
      if (stack.length >= 2 && stack[stack.length - 2] === newPath) {
        stack.pop();
        navRef.current = { other: prev, direction: 'pop' };
      } else {
        stack.push(newPath);
        navRef.current = { other: prev, direction: 'push' };
      }
      exitCustomRef.current = { other: newPath, direction: navRef.current.direction };
      pathRef.current = newPath;
      setPath(newPath);
    };
    window.addEventListener('popstate', onLocationChange);
    return () => window.removeEventListener('popstate', onLocationChange);
  }, []);

  const matchRoute = (targetPath: string): React.ReactElement | null => {
    let matched: React.ReactElement | null = null;
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.type === Route && !matched) {
        const { path: routePath, render } = child.props as {
          path: string;
          render: (props: any) => React.ReactElement;
        };
        const regex = new RegExp(`^${routePath.replace(/:\w+/g, '([^/]+)')}$`);
        const match = targetPath.match(regex);
        if (match) matched = render({ match });
      }
    });
    return matched;
  };

  const isHome = path === '/';
  const homeElement = matchRoute('/');
  const activeElement = isHome ? null : matchRoute(path);
  const homeState = isHome ? 'center' : isSlidePage(path) ? 'covered' : 'hiddenTab';

  return (
    // The home page lives OUTSIDE AnimatePresence so it is never unmounted:
    // it keeps its DOM, images, and scroll position across navigation and only
    // animates center/covered/hidden. All other pages enter/exit as before.
    // - Entering pages get their NavInfo via PageWrapper's `custom` prop
    //   (other = the page we came FROM).
    // - Exiting pages get theirs from AnimatePresence's `custom` prop, which
    //   overrides the child's at exit time (other = the page we're going TO).
    <>
      <motion.div
        initial={false}
        animate={homeState}
        variants={homeVariants}
        // will-change deliberately omitted — see PageWrapper. This one mattered
        // most: home is permanently mounted, so it was a permanently-promoted
        // full-screen layer (images, gradients, blurs) for the app's whole life.
        style={{ position: 'absolute', inset: 0, zIndex: 0 }}
      >
        {homeElement}
      </motion.div>
      {/* mode="sync": enter and exit run simultaneously so the push slide
          overlaps the parallax of the page it covers. */}
      <AnimatePresence mode="sync" initial={false} custom={exitCustomRef.current}>
        {!isHome && (
          <PageWrapper key={getRouteKey(path)} pagePath={path} nav={navRef.current}>
            {activeElement || <NotFound />}
          </PageWrapper>
        )}
      </AnimatePresence>
    </>
  );
};

export default Router;
