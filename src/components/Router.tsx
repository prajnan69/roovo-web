import React, { useState, useEffect } from 'react';
import Route from './Route';
import NotFound from './NotFound';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

const ease: [number, number, number, number] = [0.4, 0, 0.2, 1];

// Listing pages always slide in/out from the right
const listingVariants: Variants = {
  enter:  { opacity: 0, x: 44, zIndex: 10 },
  center: { opacity: 1, x: 0,  zIndex: 10, transition: { duration: 0.38, ease } },
  exit:   { opacity: 0, x: 44, zIndex: 10, transition: { duration: 0.28, ease } },
};

// Home/other pages sit behind and simply fade
const fadeVariants: Variants = {
  enter:  { opacity: 0.85, x: 0, zIndex: 0 },
  center: { opacity: 1,    x: 0, zIndex: 0, transition: { duration: 0.22 } },
  exit:   { opacity: 0.85, x: 0, zIndex: 0, transition: { duration: 0.22 } },
};

// PageWrapper captures its own 'path' prop so the EXITING element
// still knows which variants to use (not the new path from the closure).
const PageWrapper: React.FC<{ pagePath: string; children: React.ReactNode }> = ({ pagePath, children }) => {
  const isListing = pagePath.startsWith('/listing/');
  const variants = isListing ? listingVariants : fadeVariants;

  return (
    <motion.div
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      style={{ position: 'absolute', inset: 0, willChange: 'transform, opacity' }}
    >
      {children}
    </motion.div>
  );
};

interface RouterProps {
  children: React.ReactNode;
}

const Router: React.FC<RouterProps> = ({ children }) => {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onLocationChange = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onLocationChange);
    return () => window.removeEventListener('popstate', onLocationChange);
  }, []);

  let matchedComponent: React.ReactElement | null = null;

  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === Route && !matchedComponent) {
      const { path: routePath, render } = child.props as {
        path: string;
        render: (props: any) => React.ReactElement;
      };
      const regex = new RegExp(`^${routePath.replace(/:\w+/g, '([^/]+)')}$`);
      const match = path.match(regex);
      if (match) matchedComponent = render({ match });
    }
  });

  return (
    // mode="sync": enter and exit run simultaneously so the slide-in overlaps the fade-out
    <AnimatePresence mode="sync" initial={false}>
      <PageWrapper key={path} pagePath={path}>
        {matchedComponent || <NotFound />}
      </PageWrapper>
    </AnimatePresence>
  );
};

export default Router;
