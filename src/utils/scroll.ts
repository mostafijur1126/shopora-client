export const getScrollBehavior = (): ScrollBehavior =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";

export const scrollToTop = (): void => {
  window.scrollTo({ top: 0, behavior: getScrollBehavior() });
};

export const scrollElementIntoView = (
  element: Element | null | undefined,
  options: Omit<ScrollIntoViewOptions, "behavior"> = {},
): void => {
  element?.scrollIntoView({ ...options, behavior: getScrollBehavior() });
};
