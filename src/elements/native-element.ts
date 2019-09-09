import {
  SourceReference,
  NativeVNode,
  isNativeVNode,
  VNode,
  Tree, isSourceReference
} from "iterable-h";

export interface NativeElementHydrate {
  (node: VNode, tree?: Tree, hydrateChildren?: () => Promise<void>): Promise<void>;
}

const NativeElement = Symbol("Native DOM Element");

export interface NativeElement extends NativeVNode {
  node: Node | Element | ParentNode;
  source: SourceReference;
  hydrate: NativeElementHydrate;
  [NativeElement]: true;
}

// If we wanted to identify it
//
// In JavaScript without types we cannot know what this function is going to return without invoking it
//
// By marking the constructor we have given us something to check against
export function isNativeElement(value: unknown): value is NativeElement {
  function isNativeElementLike(value: unknown): value is NativeVNode & Partial<NativeElement> {
    return isNativeVNode(value);
  }
  return !!(
    isNativeElementLike(value) &&
    typeof value.hydrate === "function" &&
    isSourceReference(value.source) &&
    value.node &&
    value[NativeElement] === true
  );
}

export function createNativeElement(source: SourceReference, hydrate: NativeElementHydrate, node: Element | Node | ParentNode): NativeElement {
  return {
    node,
    source,
    hydrate,
    reference: source,
    native: true,
    [NativeElement]: true
  };
}
