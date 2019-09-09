import {
  WeakVContext,
  VNode,
  Tree,
  ContextSourceOptions,
  Source,
  isSourceReference,
  SourceReference
} from "iterable-h";
import { Elements, isNativeElement, ElementFactory } from "./elements";
import { asyncExtendedIterable, extendedIterable, ExtendedIterable } from "iterable";
import { DOMLifeCycle } from "./life/cycle";

export class DOMVContext extends WeakVContext {

  private elementFactories: Map<SourceReference, ElementFactory>;
  private lifeCycle: DOMLifeCycle = new DOMLifeCycle();

  get elements(): ExtendedIterable<SourceReference> {
    return extendedIterable(this.elementFactories.keys());
  }

  constructor(readonly window: Window, readonly root: Node = window.document.body) {
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

    return elementFactory({
      ...options,
      source,
      lifeCycle: this.lifeCycle,
      window: this.window,
      root: this.root
    });
  }

  async hydrate(node: VNode, tree?: Tree, hydrateChildren?: () => Promise<void>, root: Node = this.root): Promise<void> {
    if (!isNativeElement(node)) {
      return hydrateChildren ? hydrateChildren() : undefined;
    }
    return node.hydrate(root || this.root, node, tree, hydrateChildren);
  }

  context(root: Node): DOMVContext {
    return new DOMVContext(this.window, root);
  }

}
