/**
 * A CSS path for an element that a generated tag could poll for later: stable identifiers
 * first, structure only as a last resort, and never a machine-suffixed utility class.
 */

const STABLE_ATTRS = ["data-testid", "data-test", "data-qa", "name"] as const;

/** Utility/hashed classes (css-1x2y3, jsx-123, tailwind arbitrary values) make brittle anchors. */
const isStableClass = (name: string): boolean =>
  name.length > 0 && name.length <= 24 && !/[:[\]]/.test(name) && !/\d{3,}|^(css|jss|jsx|sc)-/.test(name);

const step = (el: Element): string => {
  if (el.id) return `#${CSS.escape(el.id)}`;

  for (const attr of STABLE_ATTRS) {
    const value = el.getAttribute(attr);
    if (value) return `${el.tagName.toLowerCase()}[${attr}="${CSS.escape(value)}"]`;
  }

  const classes = Array.from(el.classList).filter(isStableClass).slice(0, 2);
  let base = el.tagName.toLowerCase() + classes.map((name) => `.${CSS.escape(name)}`).join("");

  const parent = el.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children).filter((child) => child.tagName === el.tagName);
    if (siblings.length > 1) base += `:nth-of-type(${siblings.indexOf(el) + 1})`;
  }
  return base;
};

/** Walks up until an id (unique enough on its own) or four levels, whichever comes first. */
export const selectorFor = (target: Element | null): string => {
  if (!target) return "";
  const parts: string[] = [];
  let el: Element | null = target;

  for (let depth = 0; el && el !== document.documentElement && depth < 4; depth += 1) {
    const part = step(el);
    parts.unshift(part);
    if (part.startsWith("#")) break;
    el = el.parentElement;
  }
  return parts.join(" > ");
};
