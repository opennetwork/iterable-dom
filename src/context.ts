import {
  WeakVContext,
  VNode,
  Tree,
  ContextSourceOptions,
  Source,
  isSourceReference,
  SourceReference,
  createElement
} from "iterable-h";
import { Elements, isNativeElement, ElementFactory, isNativeElementConstructor } from "./elements";
import { extendedIterable, ExtendedIterable } from "iterable";

export class DOMVContext extends WeakVContext {

  private elementFactories: Map<SourceReference, ElementFactory>;

  get elements(): ExtendedIterable<SourceReference> {
    return extendedIterable(this.elementFactories.keys());
  }

  constructor(private window: Window, private root: ParentNode = window.document.body) {
    super();
    const elementsObject: Record<string, ElementFactory> = {
      ...Elements
    };
    this.elementFactories = new Map<SourceReference, ElementFactory>(
      Object.keys(elementsObject)
        .map(key => [key, elementsObject[key]])
    );
  }

  replaceElement(source: SourceReference, factory: ElementFactory): this {
    this.elementFactories.set(source, factory);
    return this;
  }

  removeElement(source: SourceReference): this {
    this.elementFactories.delete(source);
    return this;
  }

  createElement(source: Source<any, any>, options: ContextSourceOptions<any>): undefined | AsyncIterable<VNode> {
    if (isNativeElementConstructor(source)) {
      return createElement(
        source(this.window, this.root, Symbol("Native Element Constructor"), options),
        options
      );
    }

    if (!isSourceReference(source)) {
      return undefined;
    }

    if (!this.elementFactories.has(source)) {
      return undefined;
    }

    const elementFactory = this.elementFactories.get(source);

    // It was deleted, but still has a reference... ?
    if (typeof elementFactory !== "function") {
      return undefined;
    }

    return elementFactory(this.window, this.root, source, options);
  }

  async hydrate(node: VNode, tree?: Tree, hydrateChildren?: () => Promise<void>): Promise<void> {
    if (!isNativeElement(node)) {
      return hydrateChildren ? hydrateChildren() : undefined;
    }
    return node.hydrate(node, tree, hydrateChildren);
  }

  context(root: ParentNode): DOMVContext {
    return new DOMVContext(this.window, root);
  }

}
