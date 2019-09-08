import { createNativeElement, NativeElement, NativeElementHydrate } from "./native-element";
import { ContextSourceOptions, SourceReference, Tree, VNode } from "iterable-h";
import { DOMLifeCycle } from "../life/cycle";
import { asyncExtendedIterable, extendedIterable, source as createSource } from "iterable";

function hydrate(window: Window, root: ParentNode, source: SourceReference, options: ContextSourceOptions<any>, instance: NativeElement, construct: (parentNode: ParentNode) => ParentNode | Promise<ParentNode>): NativeElementHydrate {
  type State = {
    children: SourceReference[];
    childrenFragments: Map<SourceReference, Node>;
  };
  const cycle = new DOMLifeCycle();
  const stateHolder = new WeakMap<ParentNode, State>();
  return async function update(node: VNode, tree?: Tree) {
    return cycle.put(root, instance.reference, tree, {
      construct: async parentNode => {
        const instance = await construct(parentNode);
        stateHolder.set(instance, { children: [], childrenFragments: new Map() });
        return instance;
      },
      update: async (parentNode, instance: ParentNode) => {
        const childrenSource = createSource(asyncExtendedIterable(node.children));

        await asyncExtendedIterable(childrenSource)
          .forEach(async childrenState => {
            const state = stateHolder.get(parentNode);
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

            while (instance.children.length > 1) {
              instance.children.item(1).remove();
            }

            if (instance.firstElementChild) {
              instance.firstElementChild.replaceWith(nextFragment);
            } else {
              instance.append(nextFragment);
            }

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
      destroy: (parentNode, instance: ParentNode) => {
        stateHolder.delete(instance);
      }
    });
  };
}

export const DocumentFragment = createNativeElement(
  (window: Window, root: ParentNode, source: SourceReference, options: ContextSourceOptions<any>, instance: NativeElement): NativeElementHydrate => {
    return hydrate(window, root, source, options, instance, () => window.document.createDocumentFragment());
  }
);
