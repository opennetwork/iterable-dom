import { DOMVContext } from "./context";
import { hydrate, VNode } from "iterable-h";
import { asyncExtendedIterable } from "iterable";

export function replace(context: DOMVContext, state: AsyncIterable<VNode>): Promise<void> {
  // Top level re-renders will cause a complete tree render, it may result
  // in the exact same dom elements, if that is what was requested
  return asyncExtendedIterable(state).forEach(async node => {
    const fragment = context.window.document.createDocumentFragment();
    await context.hydrate(node, undefined, undefined, fragment);
    while (context.root.firstChild) {
      context.root.lastChild.remove();
    }
    context.root.appendChild(fragment);
  });
}
