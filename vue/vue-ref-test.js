/**
 * ref / toRef / toRefs 测试
 * 运行方式：node vue-ref-test.js
 */
import { reactive, effect, ref, toRef, toRefs } from "./vue-cleanup.js";

// ========== 小工具 ==========
const logs = [];
const collect = (...args) => logs.push(args.join(" "));
function reset() {
  logs.length = 0;
}
function assert(cond, desc) {
  console.log(cond ? "✅" : "❌", desc);
}

// ====================================================
// 一、ref 基础行为
// ====================================================
console.log("\n=== 一、ref 基础行为 ===");

// 1.1 读写
const r1 = ref(10);
assert(r1.value === 10, "ref(10) 初始值为 10");
r1.value = 20;
assert(r1.value === 20, "ref.value 可赋值修改");

// 1.2 基础类型响应式
reset();
const r2 = ref(0);
effect(() => collect("r2:", r2.value));
assert(logs[0] === "r2: 0", "effect 首次执行，值为 0");
reset();
r2.value = 1;
assert(logs[0] === "r2: 1", "ref.value 修改后触发 effect");

// 1.3 初始为对象 → 对象内部也响应
reset();
const r3 = ref({ n: 1 });
effect(() => collect("r3.n:", r3.value.n));
assert(logs[0] === "r3.n: 1", "ref({n:1}) 初始 r3.value.n = 1");
reset();
r3.value.n = 2;
assert(logs[0] === "r3.n: 2", "ref 包裹对象 → 对象内部属性也响应");

// 1.4 _v_isRef 标记
assert(r1._v_isRef === true, "ref 对象有 _v_isRef = true 标记");

// ====================================================
// 二、toRef 转发行为
// ====================================================
console.log("\n=== 二、toRef 转发行为 ===");

// 2.1 getter 转发
const state = reactive({ count: 5, name: "a" });
const countRef = toRef(state, "count");
assert(countRef.value === 5, "toRef 初始值来自源对象");
state.count = 6;
assert(countRef.value === 6, "源对象修改 → toRef.value 同步更新");

// 2.2 setter 转发
countRef.value = 99;
assert(state.count === 99, "toRef.value 赋值 → 源对象同步更新");

// 2.3 effect 响应
reset();
const nameRef = toRef(state, "name");
effect(() => collect("nameRef:", nameRef.value));
assert(logs[0] === "nameRef: a", "toRef getter 触发 effect 执行");
reset();
state.name = "b";
assert(logs[0] === "nameRef: b", "源对象修改 → effect 通过 toRef 感知到");
reset();
nameRef.value = "c";
assert(logs[0] === "nameRef: c", "toRef.value 赋值 → 触发 effect");

// 2.4 对普通对象也能用（只是不响应）
const plain = { x: 1 };
const plainRef = toRef(plain, "x");
assert(plainRef.value === 1, "toRef 对普通对象也能工作");
plainRef.value = 2;
assert(plain.x === 2, "toRef setter 也能修改普通对象（只是不触发 effect）");

// ====================================================
// 三、toRefs 批量转发 + 解构不丢响应
// ====================================================
console.log("\n=== 三、toRefs 批量转发 ===");

// 3.1 批量生成
const state3 = reactive({ a: 1, b: 2, c: 3 });
const refs = toRefs(state3);
assert(refs.a.value === 1, "toRefs(state).a.value === 原对象.a");
assert(refs.b.value === 2, "toRefs(state).b.value === 原对象.b");

// 3.2 解构不丢响应 ← 核心价值
reset();
const { a, b } = toRefs(state3);
effect(() => collect("a:", a.value, "b:", b.value));
assert(logs[0] === "a: 1 b: 2", "解构 toRefs 后 effect 正常执行");
reset();
state3.a = 10;
assert(logs[0] === "a: 10 b: 2", "解构后修改源对象 → effect 触发，a 变 b 不变");
reset();
b.value = 20;
assert(logs[0] === "a: 10 b: 20", "解构后修改 b.value → 触发 effect");

// 3.3 对比：直接解构 reactive 对象 → 丢响应（基础类型）
reset();
const state3b = reactive({ count: 0 });
const { count } = state3b;
effect(() => collect("count:", count));
assert(logs[0] === "count: 0", "直接解构 reactive 初始值正确");
reset();
state3b.count = 99;
assert(logs.length === 0, "❌ 直接解构基础类型 → 修改源对象不触发 effect（丢响应）");

// 3.4 对比：直接解构引用类型 → 递归保住响应（复习上一轮结论）
reset();
const state3c = reactive({ obj: { n: 1 } });
const { obj } = state3c;
effect(() => collect("obj.n:", obj.n));
assert(logs[0] === "obj.n: 1", "解构引用类型初始正确");
reset();
obj.n = 2;
assert(logs[0] === "obj.n: 2", "✅ 解构引用类型 → 递归包装保住响应");

// ====================================================
// 四、ref vs toRef 的标记差异
// ====================================================
console.log("\n=== 四、ref vs toRef 差异 ===");

const r4 = ref(1);
const t4 = toRef(reactive({ x: 1 }), "x");

assert(r4._v_isRef === true, "ref 有 _v_isRef 标记");
assert(t4._v_isRef === undefined, "当前 toRef 实现没有 _v_isRef（Vue 官方会加）");

// ====================================================
// 五、reactive 里嵌套 ref 自动解包
// ====================================================
console.log("\n=== 五、reactive 嵌套 ref 解包 ===");

const innerRef = ref(42);
const outer = reactive({ value: innerRef });

// 期望：reactive 里嵌套 ref，读 outer.value 自动得到 innerRef.value（自动解包）
// 这个行为取决于我们是否在 get 陷阱里加了解包逻辑
const autoUnwrap = typeof outer.value === "number" && outer.value === 42;
console.log(autoUnwrap ? "✅" : "ℹ️", "reactive({ value: ref }) 自动解包为 number:", autoUnwrap);

if (!autoUnwrap) {
  console.log("   （当前版本未实现嵌套 ref 解包，Vue 官方会实现。要加吗？）");
}

// ====================================================
// 六、ref 嵌套 ref
// ====================================================
console.log("\n=== 六、ref 嵌套 ref ===");

const inner = ref(1);
const outerRef = ref(inner);

// ref(ref(1)) → 应该自动展平为 ref(1)，即 outerRef.value === 1（不是 ref 对象）
const flatCheck = outerRef.value === 1;
console.log(flatCheck ? "✅" : "ℹ️", "ref(ref(1)) 自动展平:", flatCheck);

if (!flatCheck) {
  console.log("   （当前版本未实现 ref 嵌套展平，outerRef.value 可能是 ref 对象）");
}

console.log("\n--- 全部测试结束 ---");
