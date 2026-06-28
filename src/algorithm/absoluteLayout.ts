/**
 * Absolute positioning — ported from `yoga/algorithm/AbsoluteLayout.cpp`.
 *
 * Lays out a child whose `positionType === Absolute` relative to the
 * containing flex node. The child is removed from the flex flow (its
 * size doesn't contribute to siblings' layout) and positioned via its
 * own `position[Left/Top/Right/Bottom]` style plus its computed size.
 *
 * TUI subset: 4 physical edges (Left/Right/Top/Bottom), no Start/End.
 */

import { type Direction, MeasureMode, PhysicalEdge } from '../enums.js';
import type { Node } from '../node/node.js';
import { resolveValue } from '../value.js';
import { calculateLayoutImpl } from './calculateLayoutImpl.js';

export function layoutAbsoluteChild(
  child: Node,
  availableInnerMain: number,
  availableInnerCross: number,
  axisMain: boolean,
  ownerDirection: Direction,
  generationCount: number,
): void {
  // Resolve the child's own width/height from its style.
  let childWidth = resolveValue(child.style.width, availableInnerMain);
  let childHeight = resolveValue(child.style.height, availableInnerCross);

  // If width/height is undefined/auto and child has a measure func,
  // defer to it (use availableInnerMain as max constraint).
  if (!Number.isFinite(childWidth) && child.measureFunc) {
    const wMode = Number.isFinite(availableInnerMain) ? MeasureMode.AtMost : MeasureMode.Undefined;
    const hMode = Number.isFinite(availableInnerCross) ? MeasureMode.AtMost : MeasureMode.Undefined;
    const result = child.measureFunc(availableInnerMain, wMode, availableInnerCross, hMode);
    childWidth = result.width;
    childHeight = result.height;
  }
  if (!Number.isFinite(childWidth)) childWidth = 0;
  if (!Number.isFinite(childHeight)) childHeight = 0;

  // Recurse: layout the child with its resolved size (this fills child.layout).
  calculateLayoutImpl(
    child,
    childWidth,
    childHeight,
    ownerDirection,
    MeasureMode.Exactly,
    MeasureMode.Exactly,
    generationCount,
  );

  // Now position the child inside the container.
  // Read all 4 edges from style.position[edge] (Left/Right/Top/Bottom).
  // If both Left and Right are set, the child's width is constrained.
  // If only one is set, position from that edge.
  const left = child.style.position[PhysicalEdge.Left]!;
  const right = child.style.position[PhysicalEdge.Right]!;
  const top = child.style.position[PhysicalEdge.Top]!;
  const bottom = child.style.position[PhysicalEdge.Bottom]!;

  const containerMainSize = availableInnerMain;
  const containerCrossSize = availableInnerCross;

  // Main-axis (the axis the container's flexDirection runs along)
  // For Row-direction containers, main = X (Left/Right).
  // For Column-direction containers, main = Y (Top/Bottom).
  if (axisMain) {
    // Row: place via Left + Right.
    const leftVal = resolveValue(left, containerMainSize);
    const rightVal = resolveValue(right, containerMainSize);
    if (Number.isFinite(leftVal) && Number.isFinite(rightVal)) {
      // Both set → child width = container - left - right (and use it)
      childWidth = Math.max(0, containerMainSize - leftVal - rightVal);
      child._layoutResults.measuredDimensions[0] = childWidth;
      child.layout.width = childWidth;
    }
    if (Number.isFinite(leftVal)) {
      child._layoutResults.position[0] = leftVal;
      child.layout.left = leftVal;
    } else if (Number.isFinite(rightVal)) {
      child._layoutResults.position[0] = containerMainSize - rightVal - childWidth;
      child.layout.left = containerMainSize - rightVal - childWidth;
    } else {
      // No position set — default to Left: 0.
      child._layoutResults.position[0] = 0;
      child.layout.left = 0;
    }
  } else {
    // Column: place via Top + Bottom.
    const topVal = resolveValue(top, containerMainSize);
    const bottomVal = resolveValue(bottom, containerMainSize);
    if (Number.isFinite(topVal) && Number.isFinite(bottomVal)) {
      childHeight = Math.max(0, containerMainSize - topVal - bottomVal);
      child._layoutResults.measuredDimensions[1] = childHeight;
      child.layout.height = childHeight;
    }
    if (Number.isFinite(topVal)) {
      child._layoutResults.position[1] = topVal;
      child.layout.top = topVal;
    } else if (Number.isFinite(bottomVal)) {
      child._layoutResults.position[1] = containerMainSize - bottomVal - childHeight;
      child.layout.top = containerMainSize - bottomVal - childHeight;
    } else {
      child._layoutResults.position[1] = 0;
      child.layout.top = 0;
    }
  }

  // Cross-axis (perpendicular to container's flex direction)
  if (axisMain) {
    // Cross = Y. Position from Top/Bottom (or default to 0).
    const topVal = resolveValue(top, containerCrossSize);
    const bottomVal = resolveValue(bottom, containerCrossSize);
    if (Number.isFinite(topVal)) {
      child._layoutResults.position[1] = topVal;
      child.layout.top = topVal;
    } else if (Number.isFinite(bottomVal)) {
      child._layoutResults.position[1] = containerCrossSize - bottomVal - childHeight;
      child.layout.top = containerCrossSize - bottomVal - childHeight;
    } else {
      child._layoutResults.position[1] = 0;
      child.layout.top = 0;
    }
    // For Row-direction, also honor CrossStart/CrossEnd via alignItems?
    // TUI subset: default to FlexStart (offset = 0).
  } else {
    // Cross = X. Position from Left/Right.
    const leftVal = resolveValue(left, containerCrossSize);
    const rightVal = resolveValue(right, containerCrossSize);
    if (Number.isFinite(leftVal)) {
      child._layoutResults.position[0] = leftVal;
      child.layout.left = leftVal;
    } else if (Number.isFinite(rightVal)) {
      child._layoutResults.position[0] = containerCrossSize - rightVal - childWidth;
      child.layout.left = containerCrossSize - rightVal - childWidth;
    } else {
      child._layoutResults.position[0] = 0;
      child.layout.left = 0;
    }
  }

  // Update right/bottom derived from left/top + width/height
  child.layout.right = child.layout.left + child.layout.width;
  child.layout.bottom = child.layout.top + child.layout.height;
  child._hasNewLayout = true;
  child._isDirty = false;
}
