// 渲染器

import { reactive , ref, effect   } from "./vue-cleanup.js";



const count = ref(0);

function renderer (domString, container) {
  container.innerHTML = domString;
}


// effect 会触发依赖收集，当 count 变化时，会重新执行 effect
effect(() => renderer(count.value, document.getElementById("app")));

count.value = 100;
