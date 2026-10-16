/**
 * Map / Set 代理测试
 * 运行方式：node vue-test.js
 */
import { reactive, effect, reactiveMap, rawMap } from "./vue-cleanup.js";

// ========== 小工具 ==========
const logs = [];
function collect() {
  return (...args) => logs.push(args.join(" "));
}
function reset() {
  logs.length = 0;
}
function assert(cond, desc) {
  console.log(cond ? "✅" : "❌", desc);
}

// ========== 1. 代理基础属性 ==========
console.log("--- 1. 代理基础属性 ---");
const rawMap1 = new Map([["a", 1]]);
const proxyMap1 = reactive(rawMap1);
assert(proxyMap1.raw === rawMap1, "proxy.raw === 原始对象");
assert(rawMap.get(proxyMap1) === rawMap1, "rawMap 能反查");
assert(reactiveMap.get(rawMap1) === proxyMap1, "reactiveMap 能正查");
assert(reactiveMap.get(rawMap1) === reactive(proxyMap1), "同一对象不会重复代理");

// ========== 2. Map get/set 响应式 ==========
console.log("\n--- 2. Map get/set 响应式 ---");
reset();
const map2 = reactive(new Map([["a", 1]]));
effect(() => collect()("effect:", map2.get("a")));
assert(logs.length === 1 && logs[0] === "effect: 1", "初始执行一次，值为 1");

reset();
map2.set("a", 2); // SET 已有 key
assert(logs.length === 1 && logs[0] === "effect: 2", "set 已有 key 触发 effect");

reset();
map2.set("b", 99); // ADD 新 key —— effect 未依赖 'b'
assert(logs.length === 0, "set 新 key 但 effect 没依赖它，不触发");

// ========== 3. Map size 响应式 ==========
console.log("\n--- 3. Map size 响应式 ---");
reset();
const map3 = reactive(new Map([["x", 1]]));
effect(() => collect()("size:", map3.size));
assert(logs.length === 1 && logs[0] === "size: 1", "初始 size=1");

reset();
map3.set("y", 2); // ADD
assert(logs.length === 1 && logs[0] === "size: 2", "set 新 key 更新 size");

reset();
map3.delete("x"); // DELETE
assert(logs.length === 1 && logs[0] === "size: 1", "delete 更新 size");

// ========== 4. Map forEach 响应式 ==========
console.log("\n--- 4. Map forEach 响应式 ---");
reset();
const map4 = reactive(new Map([["k1", "v1"]]));
effect(() => {
  collect()("forEach start");
  map4.forEach((v, k) => collect()("forEach:", k, "=", v));
});
assert(logs.length === 2, "初始遍历一轮（start + 1 个条目）");

reset();
map4.set("k2", "v2");
assert(logs.length === 3 && logs.includes("forEach: k2 = v2"), "set 新 key 后 forEach 重跑，包含新条目");

// ========== 5. Map has 响应式 ==========
console.log("\n--- 5. Map has 响应式 ---");
reset();
const map5 = reactive(new Map());
effect(() => collect()("has('b'):", map5.has("b")));
assert(logs[0] === "has('b'): false", "初始 has('b')=false");

reset();
map5.set("b", 2);
assert(logs.length === 1 && logs[0] === "has('b'): true", "set 后 has('b')=true");

// ========== 6. Map 值的深响应 ==========
console.log("\n--- 6. Map 值的深响应 ---");
reset();
const map6 = reactive(new Map());
map6.set("obj", { n: 1 });
effect(() => collect()("obj.n:", map6.get("obj").n));
assert(logs[0] === "obj.n: 1", "初始 obj.n=1");

reset();
map6.get("obj").n = 2;
assert(logs[0] === "obj.n: 2", "嵌套对象属性修改触发 effect（深响应）");

// ========== 7. Set add/delete/size 响应式 ==========
console.log("\n--- 7. Set add/delete/size 响应式 ---");
reset();
const set1 = reactive(new Set([1]));
effect(() => collect()("size:", set1.size));
assert(logs[0] === "size: 1", "初始 size=1");

reset();
set1.add(2);
assert(logs[0] === "size: 2", "add 新元素更新 size");

reset();
set1.add(2); // 重复添加，不触发
assert(logs.length === 0, "add 已存在元素不触发 effect");

reset();
set1.delete(1);
assert(logs[0] === "size: 1", "delete 更新 size");

// ========== 8. Set forEach 响应式 ==========
console.log("\n--- 8. Set forEach 响应式 ---");
reset();
const set2 = reactive(new Set([1]));
effect(() => {
  collect()("set forEach start");
  set2.forEach((v) => collect()("item:", v));
});

reset();
set2.add(2);
assert(logs.includes("item: 2"), "add 后 forEach 重跑，包含新元素");

// ========== 9. for...of 迭代响应式 ==========
console.log("\n--- 9. for...of 迭代响应式 ---");
reset();
const map9 = reactive(new Map([["a", 1]]));
effect(() => {
  collect()("iter start");
  for (const [k, v] of map9) collect()("iter:", k, "=", v);
});

reset();
map9.set("b", 2);
assert(logs.includes("iter: b = 2"), "set 新 key 后迭代重跑");

// ========== 10. 引用类型 key 的响应式 ==========
console.log("\n--- 10. 引用类型 key 的响应式 ---");
reset();
const keyObj = { id: 1 };
const map10 = reactive(new Map([[keyObj, "val"]]));
effect(() => collect()("get(keyObj):", map10.get(keyObj)));
assert(logs[0] === "get(keyObj): val", "引用类型 key 能正确 get");

reset();
map10.set(keyObj, "newVal");
assert(logs[0] === "get(keyObj): newVal", "引用类型 key set 触发 effect");

// ========== 11. 原生方法不会被误拦截 ==========
console.log("\n--- 11. 原生方法不会被误拦截 ---");
const map11 = reactive(new Map([["a", 1]]));
assert(typeof map11.set === "function", "map.set 是函数");
assert(typeof map11.get === "function", "map.get 是函数");
assert(typeof map11.has === "function", "map.has 是函数");
assert(typeof map11.delete === "function", "map.delete 是函数");
assert(typeof map11.forEach === "function", "map.forEach 是函数");
assert(typeof map11.keys === "function", "map.keys 是函数");
assert(typeof map11.values === "function", "map.values 是函数");
assert(typeof map11.entries === "function", "map.entries 是函数");

console.log("\n全部测试完成");
