import { SourceReference } from "iterable-h";
import { DocumentFragmentOptions, DocumentFragment } from "./fragment";
import { NativeElement } from "./native-element";

export interface ElementFactory {
  (options: DocumentFragmentOptions): NativeElement;
}

export const Elements: Record<SourceReference, ElementFactory> = {
  DocumentFragment
};

export * from "./native-element";
export * from "./fragment";
