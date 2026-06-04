import type { WheelEvent } from "react";

/** 仅在节点内部可滚动且未滚到边界时拦截滚轮，其余情况交给画布缩放 */
export function shouldStopWheelForNodeScroll(event: WheelEvent<HTMLElement>) {
  const element = event.currentTarget;
  const canScroll = element.scrollHeight > element.clientHeight + 1;

  if (!canScroll) {
    return false;
  }

  const atTop = element.scrollTop <= 0;
  const atBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 1;
  const scrollingUp = event.deltaY < 0;
  const scrollingDown = event.deltaY > 0;

  return (scrollingUp && !atTop) || (scrollingDown && !atBottom);
}

export function handleNodeContentWheel(event: WheelEvent<HTMLElement>) {
  if (shouldStopWheelForNodeScroll(event)) {
    event.stopPropagation();
  }
}
