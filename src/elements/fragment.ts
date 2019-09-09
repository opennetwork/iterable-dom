import { SourceReference, Tree, VNode } from "iterable-h";
import { DOMLifeCycleOptions } from "../life/cycle";
import { WithOptionalKeys } from "tsdef";

type State = {
  children: SourceReference[];
  childrenFragments: Map<SourceReference, Node>;
  currentFragment?: Node;
};

const stateHolder = new WeakMap<DocumentFragmentOptions, State>();

export type DocumentFragmentOptions = WithOptionalKeys<DOMLifeCycleOptions<any>, "construct">;

export function DocumentFragment(options: DocumentFragmentOptions) {
  const initialOptions = {
    construct: () => options.window.document.createDocumentFragment(),
    ...options
  };
  stateHolder.set(initialOptions, { children: [], childrenFragments: new Map() });
  return options.lifeCycle.register(initialOptions, (node: VNode, tree?: Tree) => {
    return options.lifeCycle.put(initialOptions, node.reference, tree, {
      async *update(parentNode, instance: Node, childrenSource: AsyncIterable<VNode>) {
        const fragment = initialOptions.window.document.createDocumentFragment();
        for await (const child of childrenSource) {
          await initialOptions.context.context(fragment).hydrate(child);
        }
        const state = stateHolder.get(initialOptions);
        if (state.currentFragment) {
          instance.replaceChild(state.currentFragment, fragment);
        } else {
          instance.appendChild(fragment);
        }
        stateHolder.set(initialOptions, {
          ...state,
          currentFragment: fragment
        });
        yield instance;
      },
      destroy: () => {
        stateHolder.delete(initialOptions);
      }
    });
  });
}
