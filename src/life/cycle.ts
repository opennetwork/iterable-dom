import { ContextSourceOptions, SourceReference, Tree, VContext, VNode } from "iterable-h";
import { createNativeElement, NativeElement, NativeElementHydrate } from "../elements";
import { asyncExtendedIterable, source, TransientAsyncIteratorSource } from "iterable";

export interface LifeCycleOptions<Parent, Instance> {

  construct?(parentNode: Parent): Instance | Promise<Instance>;
  update?(parentNode: Parent, element: Instance, childrenSource: AsyncIterable<VNode>): AsyncIterable<Instance>;
  destroy?(parentNode: Parent, element: Instance): void | Promise<void>;

}

export interface LifeCycle<Parent, Instance, Options, Hydrate, ReturnType> {

  register(options: Options, hydrate: Hydrate): AsyncIterable<ReturnType>;
  put(options: Options, reference: SourceReference, tree: Tree | undefined, cycle: LifeCycleOptions<Parent, Instance>): Promise<void>;

}

type DOMLifeCycleTarget = Node;

export type DOMLifeCycleOptions<C extends VContext = unknown, ReturnType extends DOMLifeCycleTarget = DOMLifeCycleTarget> = ContextSourceOptions<C> & {
  construct(parentNode: Node): Node | Promise<ReturnType>;
  update?(parentNode: Node, instance: ReturnType): ReturnType | Promise<ReturnType>;
  destroy?(parentNode: Node, instance: ReturnType): void | Promise<void>;
  source: SourceReference;
  lifeCycle: DOMLifeCycle;
  window: Window;
  root: Node;
};

export interface DOMLifeCycleState {
  instance?: Node;
  internalSource: TransientAsyncIteratorSource<NativeElement>;
  source: TransientAsyncIteratorSource<NativeElement>;
  hydrate: NativeElementHydrate;
}

export class DOMLifeCycle implements LifeCycle<Node, DOMLifeCycleTarget, DOMLifeCycleOptions, NativeElementHydrate, NativeElement> {

  private readonly nodes = new WeakMap<DOMLifeCycleOptions, DOMLifeCycleState>();

  register(options: DOMLifeCycleOptions, hydrate: NativeElementHydrate): AsyncIterable<NativeElement> {
    const nodes = this.nodes;
    const state: DOMLifeCycleState = {
      hydrate,
      internalSource: source(),
      source: source(
        {
          [Symbol.asyncIterator]: () => ({
            async next(): Promise<IteratorResult<NativeElement>> {
              const state = nodes.get(options);
              if (state.instance) {
                return { done: true, value: undefined };
              }
              // This is the initial instance that we will work against
              const instance = await options.construct(options.root);
              nodes.set(options, {
                ...state,
                instance
              });
              return {
                done: false,
                value: createNativeElement(options.source, hydrate, instance)
              };
            }
          })
        }
      )
    };
    this.nodes.set(options, state);
    return asyncExtendedIterable(state.source).toIterable();
  }

  async put(options: DOMLifeCycleOptions, reference: SourceReference, tree: Tree | undefined, cycle: LifeCycleOptions<Node, DOMLifeCycleTarget>): Promise<void> {
    if (!tree) {
      // Root node in this tree
      return this.put(
        options,
        reference,
        {
          reference,
          children: []
        },
        cycle
      );
    }
    const state = this.nodes.get(options);
    let mountedInstance: Node = undefined;
    async function onInstance(nextInstance: Node): Promise<void> {
      if (nextInstance === mountedInstance) {
        return;
      }
      if (mountedInstance) {
        options.root.replaceChild(mountedInstance, nextInstance);
      } else {
        options.root.appendChild(nextInstance);
        mountedInstance = nextInstance;
      }
      if (options.update) {
        const result = await options.update(options.root, mountedInstance);
        if (result !== mountedInstance) {
          return onInstance(mountedInstance);
        }
      }
      state.source.push(createNativeElement(options.source, state.hydrate, nextInstance));
    }
    for await (const nextInstance of cycle.update(options.root, state.instance, options.children)) {
      await onInstance(nextInstance);
    }
    // Nothing more to come
    state.source.close();
  }

}
