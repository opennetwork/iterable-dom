import { replace, DOMVContext } from "../dist";
import { JSDOM } from "jsdom";
import htm from "htm";
import { withContext } from "iterable-h";

const dom = new JSDOM();
const window = dom.window;
const context = new DOMVContext(window);
const h = withContext(context);
const html = htm.bind(h);

function *child() {
  yield "span";
}

async function *element() {
  console.log("Element");
  console.log("State before", window.document.body.outerHTML);
  yield html`
    <document-fragment reference="frag">
      <div></div>
      <table></table>
      <button></button>
      <marquee class="div-table"></marquee>
    </document-fragment>
  `;
  console.log("State in between", window.document.body.outerHTML);
  const instance = html`
    <document-fragment reference="frag">
      <div></div>
      <table></table>
      <button></button>
      <${child} />
    </document-fragment>
  `;
  yield instance;
  console.log("State after", window.document.body.outerHTML);
  yield instance;
  console.log("State Final", window.document.body.outerHTML);
}

replace(context, h(element))
  .then(() => {
    console.log("Done")
  })
  .catch((error) => console.error({ error }));
