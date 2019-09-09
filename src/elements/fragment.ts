import { Tree, VNode } from "iterable-h";
import { DOMLifeCycleOptions } from "../life/cycle";
import { WithOptionalKeys } from "tsdef";
import { DOMVContext } from "../context";
import { asyncExtendedIterable } from "iterable";

export type DocumentFragmentOptions = WithOptionalKeys<DOMLifeCycleOptions<any>, "construct">;

function isNode(value: unknown): value is Node {
  return !!value; // Expand later
}

const CurrentFragment = Symbol("Current Fragment");

export function DocumentFragment(options: DocumentFragmentOptions) {
  const initialOptions = {
    construct: () => options.window.document.createDocumentFragment(),
    ...options
  };
  return options.lifeCycle.register(initialOptions, (root: Node, node: VNode, tree?: Tree) => {
    return options.lifeCycle.put(root, initialOptions, node.reference, tree, {
      async *update(parentNode: Node, instance: Node, unused: unknown, state: Map<any, unknown>) {
        const currentFragment = state.get(CurrentFragment);
        const fragment = options.window.document.createDocumentFragment();
        await hydrateChildren(options.context, node, tree, fragment);
        if (isNode(currentFragment)) {
          instance.replaceChild(fragment, currentFragment);
        } else {
          instance.appendChild(fragment);
        }
        state.set(CurrentFragment, fragment);
        yield instance;
      }
    });
  });
}

export async function hydrateChildren(context: DOMVContext, node: VNode, tree: Tree | undefined, root: Node) {
  await asyncExtendedIterable(node.children)
    .forEach(async nextChildren => {
      // We want to grab the snapshot of the current children into an array
      // This allows us to trigger the entire tree to hydrate at the same time meaning
      // we don't need to wait for "slow" nodes
      //
      // Get us much done as we can as quick as we can
      const childrenArray = await asyncExtendedIterable(nextChildren).toArray();

      // Create a tree so that hydrators can "figure out" where they are
      //
      // We want this information to be as simple as possible, which means only
      // recording the references being used
      // rather than passing vnode references around
      //
      // We want those vnodes to be as weakly referenced as possible because
      // they're just a state snapshot
      const nextTree: Tree = {
        children: Object.freeze(
          childrenArray
            .map(child => child ? child.reference : undefined)
        ),
        parent: tree,
        reference: node.reference
      };

      await Promise.all(
        childrenArray.map(child => context.hydrate(child, nextTree, undefined, root))
      );
    });
}
