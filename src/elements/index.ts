import { SourceReference } from "iterable-h";
import { DocumentFragmentOptions, DocumentFragment } from "./fragment";
import { NativeElement } from "./native-element";
import { NamedElement } from "./named";

export interface ElementFactory {
  (options: DocumentFragmentOptions): AsyncIterable<NativeElement>;
}

export const Elements: Record<SourceReference, ElementFactory> = {
  "document-fragment": DocumentFragment,
  "span": NamedElement,
  "button": NamedElement,
  "div": NamedElement,
  "table": NamedElement,
  "tr": NamedElement,
  "td": NamedElement,
  "th": NamedElement,
  "body": NamedElement,
  "html": NamedElement,
  "meta": NamedElement,
  "style": NamedElement,
  "script": NamedElement,
  "label": NamedElement,
  "input": NamedElement,
  "textarea": NamedElement,
  "marquee": NamedElement
};

export * from "./native-element";
export * from "./fragment";
