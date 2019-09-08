import {
  ContextSourceOptions,
  SourceReference,
  NativeVNode,
  ScalarVNode,
  isNativeVNode,
  VNode,
  Tree
} from "iterable-h";
import { asyncExtendedIterable } from "iterable";

export interface NativeElementConstructor {
  (window: Window, root: ParentNode, source: SourceReference, options: ContextSourceOptions<any>): AsyncIterable<NativeElement>;
}

export interface NativeElementHydrate {
  (node: VNode, tree?: Tree, hydrateChildren?: () => Promise<void>): Promise<void>;
}

export interface NativeElementHydrateFactory {
  (window: Window, root: ParentNode, source: SourceReference, options: ContextSourceOptions<any>, instance: NativeElement): NativeElementHydrate;
}

export interface NativeElement extends NativeVNode, NativeElementConstructor {
  source: ScalarVNode;
  hydrate: NativeElementHydrate;
}

export function isNativeElement(value: unknown): value is NativeElement {
  function isNativeElementLike(value: unknown): value is NativeVNode & { hydrate?: unknown } {
    return isNativeVNode(value);
  }
  return (
    typeof value === "function" &&
    isNativeElementLike(value) &&
    typeof value.hydrate === "function"
  );
}

const NativeElementConstructor = Symbol("Native Element Constructor");

// If we wanted to identify it
//
// In JavaScript without types we cannot know what this function is going to return without invoking it
//
// By marking the constructor we have given us something to check against
export function isNativeElementConstructor(value: unknown): value is NativeElementConstructor {
  function isNativeElementConstructorLike(value: unknown): value is NativeElementConstructor & { [NativeElementConstructor]?: unknown } {
    return typeof value === "function";
  }
  return (
    isNativeElementConstructorLike(value) &&
    value[NativeElementConstructor] === true
  );
}

export function createNativeElement(factory: NativeElementHydrateFactory): NativeElementConstructor {
  const element: NativeElementConstructor & { [NativeElementConstructor]?: true } = function constructor(window: Window, root: ParentNode, source: SourceReference, options: ContextSourceOptions<any>): AsyncIterable<NativeElement> {
    const instance: NativeElementConstructor & Partial<NativeVNode> & { hydrate?: Function } = function(window: Window, root: Element, source: SourceReference, options: ContextSourceOptions<any>): AsyncIterable<NativeElement> {
      // This allows the same element to be constructed again from scratch but with new options
      return constructor(window, root, source, options);
    };
    instance.source = source;
    let hydrate: NativeElementHydrate;
    instance.reference = options.reference;
    instance.hydrate = (...args: Parameters<NativeElementHydrate>) => {
      if (!isNativeElement(instance)) {
        throw new Error("Something went wrong while accessing the instance");
      }
      // Don't create the instance until it is required
      if (!hydrate) {
        hydrate = factory(window, root, source, options, instance);
      }
      return hydrate(...args);
    };
    console.log(instance);
    if (!isNativeElement(instance)) {
      throw new Error("Something went wrong while constructing the instance");
    }
    return asyncExtendedIterable([instance]);
  };
  element[NativeElementConstructor] = true;
  return element;
}
