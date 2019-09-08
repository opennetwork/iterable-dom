import { ContextSourceOptions, SourceReference, VNode } from "iterable-h";

export interface ElementFactory {
  (window: Window, root: ParentNode, source: SourceReference, options: ContextSourceOptions<any>): AsyncIterable<VNode>;
}

export const Elements: Record<SourceReference, ElementFactory> = {

};

export * from "./native-element";
export * from "./fragment";
