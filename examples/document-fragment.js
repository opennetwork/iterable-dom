import { replace, DOMVContext, DocumentFragment } from "../dist";
import { JSDOM } from "jsdom";
import htm from "htm";
import { withContext } from "iterable-h";

const dom = new JSDOM();
const window = dom.window;
const context = new DOMVContext(window);
const html = htm.bind(withContext(context));

function element() {
  return html`
    <${DocumentFragment}>
        
    <//>
  `
}

replace(context, element())
  .then(() => {
    console.log(window.document.body.children.item(0));
    console.log("done")
  })
  .catch((error) => console.error({ error }));
