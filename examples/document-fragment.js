import { replace, DOMVContext } from "../dist";
import { JSDOM } from "jsdom";
import htm from "htm";
import { withContext } from "iterable-h";

const dom = new JSDOM();
const window = dom.window;
const context = new DOMVContext(window);
const html = htm.bind(withContext(context));

function element() {
  return html`
    <document-fragment>
      <div></div>
      <table></table>
      <button></button>
      <marquee class="div-table"></marquee>
    </document-fragment>
  `
}

replace(context, element())
  .then(() => {
    console.log(window.document.body.outerHTML);
    console.log("done")
  })
  .catch((error) => console.error({ error }));
