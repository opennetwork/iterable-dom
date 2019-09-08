import {
  ContextSourceOptions,
  SourceReference,
  NativeVNode,
  ScalarVNode,
  isNativeVNode,
  VNode,
  Tree, isSourceReference
} from "iterable-h";

export interface NativeElementHydrate {
  (node: VNode, tree?: Tree, hydrateChildren?: () => Promise<void>): Promise<void>;
}

const NativeElement = Symbol("Native DOM Element");

export interface NativeElementLike {
  hydrate: NativeElementHydrate;
  [NativeElement]: true;
  native: true;
}

export interface NativeElement extends NativeVNode, NativeElementLike {
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
  return (
    isNativeElementLike(value) &&
    typeof value.hydrate === "function" &&
    isSourceReference(value.source) &&
    value[NativeElement] === true
  );
}

export function isNativeElementLike(value: unknown): value is NativeElementLike {
  function isNativeElementLikeLike(value: unknown): value is { hydrate?: unknown, [NativeElement]?: unknown, native?: unknown } {
    return isNativeVNode(value);
  }
  return (
    isNativeElementLikeLike(value) &&
    typeof value.hydrate === "function" &&
    value[NativeElement] === true &&
    value.native === true
  );
}

export function createNativeElement(source: SourceReference, hydrate: NativeElementHydrate): NativeElement {
  return {
    source,
    hydrate,
    reference: source,
    native: true,
    [NativeElement]: true
  };
}
