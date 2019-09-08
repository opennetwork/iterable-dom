import { createNativeElement, NativeElement, NativeElementHydrate } from "./native-element";
import { ContextSourceOptions, SourceReference, Tree, VNode } from "iterable-h";
import { asyncExtendedIterable, extendedIterable, source as createSource } from "iterable";
import { DOMLifeCycle } from "../life/cycle";

type State = {
  children: SourceReference[];
  childrenFragments: Map<SourceReference, Node>;
};

const stateHolder = new WeakMap<Node, State>();

export type DocumentFragmentOptions = ContextSourceOptions<any> & {
  construct?(parentNode: ParentNode): Node | Promise<Node>;
  update?(parentNode: ParentNode, instance: Node): Node | Promise<Node>;
  destroy?(parentNode: ParentNode, instance: Node): void | Promise<void>;
  source: SourceReference;
  lifeCycle: DOMLifeCycle;
  window: Window;
  root: ParentNode;
};

export function DocumentFragment(options: DocumentFragmentOptions): NativeElement {
  return createNativeElement(options.source, (node: VNode, tree?: Tree): Promise<void> => {
    return options.lifeCycle.put(options.root, node.reference, tree, {
      construct: async parentNode => {
        const instance = await options.construct(parentNode);
        stateHolder.set(instance, { children: [], childrenFragments: new Map() });
        return instance;
      },
      update: async (parentNode, instance: Node) => {
        const childrenSource = createSource(asyncExtendedIterable(node.children || []));

        await asyncExtendedIterable(childrenSource)
          .forEach(async childrenState => {
            const state = stateHolder.get(instance);
            if (!state) {
              childrenSource.close();
              return undefined;
            }
            const children = await asyncExtendedIterable(childrenState).toArray();
            const instances = await Promise.all(
              children.map(
                async child => {
                  const parent = getFragment(child.reference);
                  const nextContext = options.context.context(parent);
                  return {
                    child,
                    instance: parent,
                    hydration: nextContext.hydrate(child)
                  };
                }
              )
            );

            // Wait for hydration on all nodes, we could change the order of this later so that we hydrate as we add
            //
            // Right now I just wanted the two concepts to be seperated
            await Promise.all(
              instances.map(({ hydration }) => hydration)
            );

            // Remove old references to parent nodes, no longer needed
            //
            // If we know something is switching back and forward later on, we _could_ retain these
            extendedIterable(state.childrenFragments.keys())
              .filter(reference => instances.findIndex(instance => instance.child.reference === reference) === -1)
              .forEach(reference => state.childrenFragments.delete(reference));

            // For now quick and dirty "if its not in the same order, kill it"
            //
            // Later on, switch this so we can grab nodes and switch them out

            const nextFragment = window.document.createDocumentFragment();

            instances.forEach(({ instance }) => {
              nextFragment.append(instance);
            });

            nextFragment.append(window.document.createElement("span"));

            instance.parentNode.replaceChild(instance, nextFragment);

            function getFragment(reference: SourceReference): Node {
              if (state.childrenFragments.has(reference)) {
                return state.childrenFragments.get(reference);
              }
              const node =  window.document.createDocumentFragment();
              state.childrenFragments.set(reference, node);
              return node;
            }
          });

        return instance;
      },
      destroy: (parentNode, instance: Node) => {
        stateHolder.delete(instance);
      }
    });
  });
}
