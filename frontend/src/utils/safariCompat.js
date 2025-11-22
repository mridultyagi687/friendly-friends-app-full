/**
 * Safari compatibility utilities
 */

// Detect Safari browser
export const isSafari = () => {
  if (typeof window === 'undefined') return false;
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

// Get backdrop-filter style with Safari support
export const getBackdropFilter = (blur = '10px') => {
  const isSafariBrowser = isSafari();
  return {
    WebkitBackdropFilter: `blur(${blur})`,
    backdropFilter: `blur(${blur})`,
  };
};

// Check if backdrop-filter is supported
export const supportsBackdropFilter = () => {
  if (typeof window === 'undefined' || typeof CSS === 'undefined') return false;
  return CSS.supports('backdrop-filter', 'blur(1px)') || 
         CSS.supports('-webkit-backdrop-filter', 'blur(1px)');
};

// Get style object with Safari-compatible backdrop-filter
export const withBackdropFilter = (style, blur = '10px') => {
  const isSafariBrowser = isSafari();
  return {
    ...style,
    ...(isSafariBrowser ? { WebkitBackdropFilter: `blur(${blur})` } : {}),
    backdropFilter: `blur(${blur})`,
  };
};

