// Plain (server-safe) module: the inline script that sets the theme before first paint.
/** Runs before the page paints, so there is no flash of the wrong theme. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("jobintel.theme");var d=t==="dark"||((!t||t==="system")&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){}})();`;
