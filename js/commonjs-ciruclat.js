/**
 * CommonJS 循环加载 Demo
 *
 * 原理：自己实现一套极简版的 require，模拟 Node 的模块缓存机制
 *       演示 A require B，B 又 require A 时发生什么
 *
 * 运行：node commonjs-ciruclat.js
 */

// ========= 第一步：自己模拟一套极简 CommonJS =========

const moduleCache = {}; // 模块缓存（类似 Node 的 require.cache）

function fakeRequire(name) {
  // 命中缓存 → 直接返回（循环加载时就走这里，拿到半成品）
  if (moduleCache[name]) {
    console.log(`  [命中缓存] ${name} → 返回 ${JSON.stringify(moduleCache[name].exports)}`);
    return moduleCache[name].exports;
  }

  console.log(`[开始加载] ${name}`);

  // ⚠️ 关键！先放进缓存（半成品！），再执行模块代码
  // 这样循环引用时，对方会在缓存里找到这个"还没执行完"的模块
  const moduleObj = { exports: {} };
  moduleCache[name] = moduleObj;

  // 执行模块代码（传入 fakeRequire 让模块里可以互相引用）
  modules[name](moduleObj.exports, fakeRequire);

  console.log(`[加载完毕] ${name} → exports = ${JSON.stringify(moduleObj.exports)}`);
  return moduleObj.exports;
}


// ========= 第二步：定义两个互相依赖的模块 A 和 B =========

const modules = {
  './a'(exports, require) {
    console.log('  a: 开始执行');

    exports.aName = '我是 A 模块';
    console.log('  a: 导出 aName = "我是 A 模块"');

    console.log('  a: 现在去 require("./b") ...');
    const b = require('./b'); // ← 触发加载 B

    console.log('  a: 拿到 b.bName =', b.bName);
    console.log('  a: 拿到 b.aNameFromB =', b.aNameFromB); // ← B 里引用的 A 的 aName，此时是半成品！

    exports.aNameFromA = b.bName;
    console.log('  a: 执行完毕');
  },

  './b'(exports, require) {
    console.log('  b: 开始执行');

    exports.bName = '我是 B 模块';
    console.log('  b: 导出 bName = "我是 B 模块"');

    console.log('  b: 现在去 require("./a") ...');
    const a = require('./a'); // ⚡ 循环！A 还没执行完，会从缓存拿到半成品

    console.log('  b: 拿到 a.aName =', a.aName);      // ✅ 能拿到（A 已经导出了这个）
    console.log('  b: 拿到 a.aNameFromA =', a.aNameFromA); // ❌ undefined！A 还没执行到那一行

    exports.aNameFromB = a.aName;
    console.log('  b: 执行完毕');
  },
};


// ========= 第三步：开始演示 =========

console.log('==============================');
console.log('开始加载 A 模块（入口）');
console.log('==============================\n');

const a = fakeRequire('./a');

console.log('\n==============================');
console.log('全部加载完毕后，最终拿到的值：');
console.log('==============================');
console.log('a.aName        =', a.aName);
console.log('a.aNameFromA   =', a.aNameFromA);
console.log('a.aNameFromB   =', a.aNameFromB);
console.log('a.bName        =', fakeRequire('./b').bName);

/*
  运行结果：

  ==============================
  开始加载 A 模块（入口）
  ==============================

  [开始加载] ./a
    a: 开始执行
    a: 导出 aName = "我是 A 模块"
    a: 现在去 require("./b") ...
  [开始加载] ./b
    b: 开始执行
    b: 导出 bName = "我是 B 模块"
    b: 现在去 require("./a") ...
    [命中缓存] ./a → 返回 {"aName":"我是 A 模块"}    ← ⚡ 关键！A 的半成品！
    b: 拿到 a.aName = 我是 A 模块                    ← 能拿到（已经导出）
    b: 拿到 a.aNameFromA = undefined                 ← ❌ undefined（还没导出）
    b: 执行完毕
  [加载完毕] ./b → exports = {"bName":"我是 B 模块","aNameFromB":"我是 A 模块"}
    a: 拿到 b.bName = 我是 B 模块
    a: 拿到 b.aNameFromB = 我是 A 模块
    a: 执行完毕
  [加载完毕] ./a → exports = {"aName":"我是 A 模块","aNameFromA":"我是 B 模块"}

  ==============================
  全部加载完毕后，最终拿到的值：
  ==============================
  a.aName        = 我是 A 模块
  a.aNameFromA   = 我是 B 模块
  a.aNameFromB   = 我是 A 模块
  a.bName        = 我是 B 模块
*/
