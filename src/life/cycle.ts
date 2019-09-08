import { SourceReference, Tree } from "iterable-h";

export interface LifeCycleOptions<Parent, Instance> {

  construct?(parentNode: Parent): Instance | Promise<Instance>;
  update?(parentNode: Parent, element: Instance): Instance | Promise<Instance>;
  destroy?(parentNode: Parent, element: Instance): void | Promise<void>;

}

export interface LifeCycle<Parent, Instance> {

  put(parent: Parent, reference: SourceReference, tree: Tree | undefined, cycle: LifeCycleOptions<Parent, Instance>): Promise<void>;

}

type DOMLifeCycleTarget = Element | ParentNode;

export class DOMLifeCycle implements LifeCycle<ParentNode, DOMLifeCycleTarget> {

  trees?: Tree[];

  put(parent: ParentNode, reference: SourceReference, tree: Tree | undefined, cycle: LifeCycleOptions<ParentNode, DOMLifeCycleTarget>): Promise<void> {
    if (!tree) {
      // Root node in this tree
      return this.put(
        parent,
        reference,
        {
          reference,
          children: []
        },
        cycle
      );
    }
    return undefined;
  }

}
