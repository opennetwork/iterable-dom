import { ContextSourceOptions, Source, SourceReference, Tree, VContext, VNode } from "iterable-h";
import { createNativeElement, NativeElement, NativeElementHydrate } from "../elements";
import { asyncExtendedIterable, source, TransientAsyncIteratorSource } from "iterable";
import { children } from "iterable-h/dist/children";

export interface LifeCycleOptions<Parent, Instance> {

  construct?(parentNode: Parent, state: Map<any, unknown>): Instance | Promise<Instance>;
  update?(parentNode: Parent, element: Instance, childrenSource: AsyncIterable<VNode>, state: Map<any, unknown>): AsyncIterable<Instance>;
  destroy?(parentNode: Parent, element: Instance, state: Map<any, unknown>): void | Promise<void>;

}

export interface LifeCycle<Parent, Instance, Options, Hydrate, ReturnType> {

  register(options: Options, hydrate: Hydrate): AsyncIterable<ReturnType>;
  put(root: Parent, options: Options, reference: SourceReference, tree: Tree | undefined, cycle: LifeCycleOptions<Parent, Instance>): Promise<void>;

}

type DOMLifeCycleTarget = Node;

export type DOMLifeCycleOptions<C extends VContext = unknown, ReturnType extends DOMLifeCycleTarget = DOMLifeCycleTarget> = ContextSourceOptions<C> & {
  construct(parentNode: Node, state: Map<any, unknown>): Node | Promise<ReturnType>;
  update?(parentNode: Node, instance: ReturnType, state: Map<any, unknown>): ReturnType | Promise<ReturnType>;
  destroy?(parentNode: Node, instance: ReturnType, state: Map<any, unknown>): void | Promise<void>;
  source: SourceReference;
  lifeCycle: DOMLifeCycle;
  window: Window;
  root: Node;
};

export interface DOMLifeCycleState {
  instance?: Node;
  mountedInstance?: Node;
  initialSource: boolean;
  internalSource: TransientAsyncIteratorSource<NativeElement>;
  state: Map<any, unknown>;
  hydrate: NativeElementHydrate;
}

export class DOMLifeCycle implements LifeCycle<Node, DOMLifeCycleTarget, DOMLifeCycleOptions, NativeElementHydrate, NativeElement> {

  private readonly nodes = new Map<SourceReference, DOMLifeCycleState>();

  register(options: DOMLifeCycleOptions, hydrate: NativeElementHydrate): AsyncIterable<NativeElement> {
    const nodes = this.nodes;
    const state: DOMLifeCycleState = {
      hydrate,
      state: new Map(),
      internalSource: source(),
      initialSource: false
    };
    nodes.set(options.reference, state);
    return asyncExtendedIterable([
      createNativeElement(options.source, hydrate, () => this.nodes.get(options.reference).mountedInstance, asyncExtendedIterable([options.children]))
    ]).toIterable();
  }

  async put(root: Node, options: DOMLifeCycleOptions, reference: SourceReference, tree: Tree | undefined, cycle: LifeCycleOptions<Node, DOMLifeCycleTarget>): Promise<void> {
    if (!tree) {
      // Root node in this tree
      return this.put(
        root,
        options,
        reference,
        {
          reference,
          children: []
        },
        cycle
      );
    }
    const nodes = this.nodes;
    if (!nodes.get(options.reference)) {
      return;
    }
    if (!nodes.get(options.reference).instance) {
      nodes.set(options.reference, {
        ...nodes.get(options.reference),
        instance: await options.construct(root, nodes.get(options.reference).state)
      });
    }
    async function onInstance(nextInstance: Node): Promise<void> {
      if (nextInstance === nodes.get(options.reference).mountedInstance) {
        return;
      }
      if (!nodes.get(options.reference).mountedInstance) {
        root.appendChild(nextInstance);
      } else {
        const instance = nodes.get(options.reference).mountedInstance;
        if (!instance.parentNode) {
          root.firstChild.replaceWith(nextInstance);
        } else {
          instance.parentNode.replaceChild(nextInstance, instance);
        }
      }
      nodes.set(options.reference, {
        ...nodes.get(options.reference),
        instance: nextInstance,
        mountedInstance: nextInstance
      });
      if (options.update) {
        const result = await options.update(root, nodes.get(options.reference).mountedInstance, nodes.get(options.reference).state);
        if (result !== nodes.get(options.reference).mountedInstance) {
          return onInstance(result);
        }
      }
    }
    for await (const nextInstance of cycle.update(root, nodes.get(options.reference).instance, options.children, this.nodes.get(options.reference).state)) {
      await onInstance(nextInstance);
    }
    // if (options.destroy) {
    //   await options.destroy(root, this.nodes.get(options.reference).instance, this.nodes.get(options.reference).state);
    // }
    // if (cycle.destroy) {
    //   await cycle.destroy(root, this.nodes.get(options.reference).instance, this.nodes.get(options.reference).state);
    // }
  }

}
