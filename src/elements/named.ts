import { DocumentFragmentOptions, DocumentFragment } from "./fragment";

export type NamedElementOptions = Omit<DocumentFragmentOptions, "construct"> & {
  creationOptions?: ElementCreationOptions;
};

export function NamedElement(options: NamedElementOptions) {
  return DocumentFragment({
    ...options,
    construct: () => {
      if (typeof options.source !== "string") {
        throw new Error("Expected source to be a string");
      }
      return options.window.document.createElement(options.source, options.creationOptions);
    },
    update(parentNode, instance: Element): Node {
      // Hydrate options here into instance
      return instance;
    }
  });
}
