import { snarkyReady, wasm } from './node/node-backend.js';
import { default as snarky } from '../_node_bindings/snarky_js_node.bc.cjs';

export { getSnarky, getWasm, snarkyReady, shutdown };

let getSnarky = () => snarky;

function getWasm() {
  return wasm;
}

// TODO get rid of shutdown
let didShutdown = false;
async function shutdown() {
  process.exit(0);
  // if (global.wasm_rayon_poolbuilder && !didShutdown) {
  //   didShutdown = true;
  //   global.wasm_rayon_poolbuilder.free();
  //   await Promise.all(global.wasm_workers.map((worker) => worker.terminate()));
  //   process.exit(0);
  // }
}
