/**
 * Vue 响应式原理 Demo
 * 分两部分：
 *   ① 最简版：演示 Proxy 怎么做到"数据变了自动重新执行"
 *   ② 完整版：演示怎么支持多个副作用函数
 */

// =====================================================
// 第一部分：最简版响应系统（只能绑一个副作用函数）
// =====================================================

const bucket1 = new Set(); // 依赖桶

const data1 = { text: "hello vue" };

const obj1 = new Proxy(data1, {
  get(target, key) {
    bucket1.add(effectSimple); // ⚠️ 写死了：永远只收集 effectSimple 这一个函数
    return target[key];
  },
  set(target, key, newVal) {
    target[key] = newVal;
    bucket1.forEach((fn) => fn()); // 数据变了，通知桶里的所有函数
    return true;
  },
});

function effectSimple() {
  const text = obj1.text; // 读 obj1.text 触发 get → effectSimple 被加入 bucket1
  console.log("✅ 最简版 effectSimple 执行:", text);
}

effectSimple(); // 第一次执行
obj1.text = "hello vue 2"; // 触发 set → effectSimple 自动重新执行
// 输出：
// ✅ 最简版 effectSimple 执行: hello vue
// ✅ 最简版 effectSimple 执行: hello vue 2

// =====================================================
// 第二部分：完整版响应系统（支持任意多个副作用函数）
// =====================================================

const bucket2 = new Set(); // 独立的依赖桶

// 👈 关键！用一个全局变量告诉 Proxy："谁在读你"
let activeEffect;

function effect(fn) {
  let effectFn = fn;
  // cleanup(effectFn);
  activeEffect = fn; // ① 先把 fn 挂上去
  fn(); // ② 执行 fn → fn 内部读 obj2.text → 触发 get → get 读 activeEffect 就知道是 fn
}

const data2 = { text: "hello vue 2" };

const obj2 = new Proxy(data2, {
  get(target, key) {
    if (activeEffect) {
      // 只有 effect 函数执行时才收集
      bucket2.add(activeEffect); // 把"当前正在执行的那个函数"收集起来
    }
    return target[key];
  },
  set(target, key, newVal) {
    target[key] = newVal;
    bucket2.forEach((fn) => fn()); // 通知所有被收集的函数
    return true;
  },
});

// 注册第一个副作用函数
effect(() => {
  console.log("🎯 完整版 effect1 执行:", obj2.text);
});

// 注册第二个副作用函数（证明能支持多个）
// effect(() => {
//   console.log("🎯 完整版 effect2 执行:", obj2.text);
// });

console.log("--- 现在修改 obj2.text ---");
obj2.notExist = "新的值2！"; // 触发 set → effect1, effect2 自动重新执行
console.log("--- 修改结束 ---");
// 输出：
// 🎯 完整版 effect1 执行: hello vue 2
// 🎯 完整版 effect2 执行: hello vue 2
// --- 现在修改 obj2.text ---
// 🎯 完整版 effect1 执行: 新的值！
// 🎯 完整版 effect2 执行: 新的值！
// --- 修改结束 ---

// 修改 notExist 也会触发副作用函数的执行，这样是不正确。每个副作用函数都应该只关注自己需要的属性，而不是所有属性，需要修改这个逻辑
// 使用 map 来存储每个属性的依赖桶，这样就可以只触发自己需要的属性的依赖桶
// 副作用函数和属性的没有建立一一对应的关系
const bucketMap = new WeakMap(); // weakMap 会自动清理没有被引用的属性, weakMap 的键只能是原始对象 target，weakMap的值是一个 set，用于存储依赖桶

// weakMap版本的响应系统

const weakData = { text: "hello vue 3" };

const weakObj = new Proxy(weakData, {
  get(target, key) {
    if (activeEffect) {
      // 只有 effect 函数执行时才收集
      let depsMap = bucketMap.get(target); // 从 bucketMap 中获取属性的依赖桶，如果没有，就创建一个. vue不同组件会有多个 data
      // 如果这个组件的 data 没有注册就注册一个
      if (!depsMap) {
        // 注册一个 map，用于存储这个组件的所有属性的依赖桶
        bucketMap.set(target, (depsMap = new Map()));
      }

      //  获取当前组件的 data 中的属性的依赖桶，如果没有，就创建一个. vue不同组件会有多个 data
      // 如果这个属性没有注册就注册一个
      let deps = depsMap.get(key);
      if (!deps) {
        // 注册一个 set，用于存储这个属性的所有副作用函数
        deps = new Set(); // 是为了在 deps.add 中使用
        depsMap.set(key, deps);
      }
      // 把"当前正在执行的那个函数"收集起来
      deps.add(activeEffect); // 把"当前正在执行的那个函数"收集起来
    }
    return target[key];
  },
  set(target, key, newVal) {
    target[key] = newVal;
    let depsMap = bucketMap.get(target);
    if (!depsMap) {
      return true;
    }
    let deps = depsMap.get(key);
    if (!deps) {
      return true;
    }
    deps.forEach((fn) => fn());
    return true;
  },
});

// =====================================================
// 测试 weakMap 版本（验证精确触发）
// =====================================================
console.log("\n========== weakMap 版本测试 ==========");

// effect1 只关心 text
effect(() => {
  console.log("🎯 effect1 执行:text", weakObj.text);
});

// effect2 只关心 count
effect(() => {
  console.log("🎯 effect2 执行:count", weakObj.count);
});

console.log("--- 修改 weakObj.text ---");
weakObj.text = "新的 text 值"; // 只触发 effect1

console.log("--- 修改 weakObj.count ---");
weakObj.count = 100; // 只触发 effect2

console.log("--- 修改 weakObj.other（没人关心） ---");
weakObj.other = "没人关心我"; // 谁都不触发 ✅

console.log("========== 测试结束 ==========");

// 分支 切换会产生遗留的副作用函数，所以会触发不同的副作用函数, 每次执行完 effect ,清空依赖内的副作用函数

effect(() => {
  weakObj.ok ? weakObj.text : "not ok";
});

function cleanup(effectFn) {
  for (const deps of effectFn.deps) {
    deps.delete(effectFn);
  }
  effectFn.deps.length = 0;
}