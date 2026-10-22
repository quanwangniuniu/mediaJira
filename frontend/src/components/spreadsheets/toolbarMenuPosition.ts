export function triggerVisibleFraction(trigger: DOMRect, container: DOMRect): number {
    const left = Math.max(trigger.left, container.left);
    const right = Math.min(trigger.right, container.right);
    const visible = Math.max(0, right - left);
    if (trigger.width <= 0) return 0;
    return visible / trigger.width;
}
  
export function isTriggerMeaningfullyVisible(
    trigger: DOMRect,
    container: DOMRect,
    minRatio = 0.5,
): boolean {
    return triggerVisibleFraction(trigger, container) >= minRatio;
}

export function placeMenuInViewport(args: {
    trigger: DOMRect;
    menuWidth: number;
    menuHeight: number;
    viewportWidth: number;
    viewportHeight: number;
    gap?: number;
    pad?: number;
  }): { top: number; left: number } {
    const gap = args.gap ?? 6;
    const pad = args.pad ?? 8;
    let top = args.trigger.bottom + gap;
    let left = args.trigger.left;
  
    if (top + args.menuHeight > args.viewportHeight - pad) {
      const above = args.trigger.top - gap - args.menuHeight;
      top = above >= pad ? above : Math.max(pad, args.viewportHeight - args.menuHeight - pad);
    }
    if (left + args.menuWidth > args.viewportWidth - pad) {
      left = args.viewportWidth - args.menuWidth - pad;
    }
    if (left < pad) left = pad;
    if (top < pad) top = pad;
    return { top, left };
  }