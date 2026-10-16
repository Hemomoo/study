let activeEffect; //  因为effect 函数可能嵌套，那就说明内部的 effect 函数会覆盖外层的 effect

// 所以需要使用一个栈来，放副作用执行的时候将副作用压入栈中

let effectStack = [];

// 用来注册副作用函数
function effect(fn, options = {}) {
  const effectFn = () => {
    cleanup(effectFn);
    activeEffect = effectFn;
    effectStack.push(effectFn); // 在调用副作用函数之前将当前副作用函数压入栈中
    const res = fn(); // ② 执行 fn → fn 内部读 obj2.text → 触发 get → get 读 activeEffect 就知道是 fn
    // 结束后将当前副作用函数从栈中弹出
    effectStack.pop();
    activeEffect = effectStack[effectStack.length - 1]; // 返回上个副作用函数，方便后续调用
    return res;
  };
  effectFn.options = options; // 增加一个属性，用来增加调度器的选项
  effectFn.deps = [];
  if (!options.lazy) {
    effectFn();
  }

  return effectFn; // 将副作用函数返回
}

// 做一个bucket用来收集副作用函数

let bucket = new WeakMap();

const data = {
  text: "hello vue",
  foo: 1,
  count: 0,
  lazyCount: 0,
  has: "用来判读 in",
  arr: [1, 2, 3],
  get bar() {
    return this.foo;
  },
};

/*
    整个bucket 的数据结构.
    1. 使用 weakmap 是因为他的弱引用，不会导致内存泄漏。
    2. 第二个 map 是因为每个组件都有 data，所以每个 data 是一个独立的 map。
    3. 第三个 set 是因为每个副作用函数只能被收集一次，所以每个 set 只能存储一个副作用函数。
    4. 最后是effect 函数
    weakmap -> map -> set -> effectFn

*/

const ITERATE_KEY = Symbol();
const MAP_KEY_ITERATE_KEY = Symbol();

// 原始对象-> 代理对象: 避免同一对象被重复代理
const reactiveMap = new WeakMap();
// 代理对象-> 原始对象: 用来获取原始对象
const rawMap = new WeakMap();

// 重写数组的查找方法，解决"代理对象 ！== 原始对象" 的问题
const arrayInstrumentations = {};
["includes", "lastIndexOf", "indexOf"].forEach((method) => {
  const originalMethod = Array.prototype[method];
  arrayInstrumentations[method] = function (...args) {
    // 第一次：在代理数组中查找
    let res = originalMethod.apply(this, args);
    // 没有就就通过this.raw 拿到原始数组再找一次
    if (res === false || res === -1) {
      res = originalMethod.apply(this.raw, args);
    }
    return res;
  };
});

let shouldTrack = true;
// 重写数组的 push 方法
["push", "pop", "shift", "unshift", "splice"].forEach((method) => {
  const originalMethod = Array.prototype[method];
  arrayInstrumentations[method] = function (...args) {
    // 在调用之前禁止追踪
    shouldTrack = false;
    // push方法的默认行为
    let resolve = originalMethod.apply(this, args);

    // 在调用之后允许追踪
    shouldTrack = true;
    return resolve;
  };
});

// 定义一个对象，将定义的 add 方法添加到对象中
const mutableInstrumentations = {
  add(key) {
    // this 指向代理对象，通过 raw 获取原始对象
    const target = this.raw;
    // 判断元素是否已存在
    const had = target.has(key);
    // 通过原始数据对象执行 add 方法来增加具体的值
    const res = target.add(key);
    // 只有新增元素时才触发依赖
    if (!had) {
      trigger(target, key, "ADD");
    }
    return res;
  },
  has(key) {
    // Map.has / Set.has 都统一走这里
    const target = this.raw;
    track(target, key);
    return target.has(key);
  },
  delete(key) {
    // 获取原始数据
    const target = this.raw;
    // 通过原始数据对象执行 delete 方法来删除具体的值
    // 判断 key 是否存在
    const had = target.has(key);
    const res = target.delete(key);
    if (had) {
      trigger(target, key, "DELETE");
    }
    // 调用 trigger 方法，触发依赖收集
    return res;
  },
  get(key) {
    // 获取原始对象的属性值
    const target = this.raw;
    // 判断获取的 key 是否存在
    const had = target.has(key);
    // 追踪依赖，建立响应
    track(target, key);
    // 需要返回使用 reactive包裹的响应数据
    if (had) {
      const res = target.get(key);
      return typeof res === "object" ? reactive(res) : res;
    }
  },
  // map 独有方法，需要键值对参数
  // 把响应数据增加到原始数据的数据上这种行为叫作数据污染
  set(key, value) {
    // 获取原始数据
    const target = this.raw;
    // 通过原始数据对象执行 set 方法来设置具体的值
    // 获取旧值,现在没有改变
    const oldValue = target.get(key);
    // 判断是增加还是替换
    const had = target.has(key);
    // 判读是不是响应数据，如果value 是响应数据，就获取他的原始数据raw
    // 原始数据没有 raw 属性，如果有 raw 就证明是响应数据，就获取他的原始数据
    const rawVlaue = value.raw || value;
    target.set(key, rawVlaue);
    if (!had) {
      // 调用 trigger 方法，触发依赖收集
      trigger(target, key, "ADD", value);
    } else if (
      oldValue !== value ||
      (oldValue === oldValue && value !== value)
    ) {
      // 调用 trigger 方法，触发收集的依赖
      trigger(target, key, "SET", value);
    }
    return true;
  },

  forEach(callback, thisArg) {
    // 获取原始数据
    const target = this.raw;
    // wrap函数将可代理对象的属性转换为响应数据
    const wrap = (value) => {
      return typeof value === "object" ? reactive(value) : value;
    };

    // 通过 taeget调用原始方法进行遍历
    target.forEach((v, k) => {
      // key 也需要转换为响应数据的原因是 key 可能是响应数据
      callback.call(thisArg, wrap(v), wrap(k), this);
    });
    -(
      // 与 ITERATE_KEY 建立响应式联系
      track(target, ITERATE_KEY)
    );
  },
  // 可以for of 遍历
  [Symbol.iterator]() {
    // 获取原始数据
    const target = this.raw;
    // 调用原始数据的迭代器方法
    const iterator = target[Symbol.iterator]();
    // for...of 的 value 和 key 都需要转换为响应数据。不然修改原始数据，不会触发依赖收集
    const wrap = (value) => {
      return typeof value === "object" ? reactive(value) : value;
    };
    // 与 ITERATE_KEY 建立响应式联系
    track(target, ITERATE_KEY);
    // 返回自定义迭代器
    return {
      next() {
        const { done, value } = iterator.next();
        return {
          done,
          // 如果 value 不是 undefined，对其进行包裹
          value: value ? [wrap(value[0]), wrap(value[1])] : value,
        };
      },
      [Symbol.iterator]() {
        return this;
      },
    };
  },
  // values
  values() {
    // 获取原始数据
    const target = this.raw;
    const itr = target.values();
    const wrap = (value) => {
      return typeof value === "object" ? reactive(value) : value;
    };
    // 与 ITERATE_KEY 建立响应式联系
    track(target, ITERATE_KEY);
    // 迭代返回
    return {
      next() {
        const { done, value } = itr.next();
        return {
          done,
          // 如果 value 不是 undefined，对其进行包裹
          value: value ? wrap(value) : value,
        };
      },
      [Symbol.iterator]() {
        return this;
      },
    };
  },
  // keys
  keys() {
    // 获取原始数据
    const target = this.raw;
    const itr = target.keys();
    const wrap = (value) => {
      return typeof value === "object" ? reactive(value) : value;
    };
    // 与 ITERATE_KEY 建立响应式联系
    track(target, MAP_KEY_ITERATE_KEY);
    // 迭代返回
    return {
      next() {
        const { done, value } = itr.next();
        return {
          done,
          // 如果 value 不是 undefined，对其进行包裹
          value: value ? wrap(value) : value,
        };
      },
      [Symbol.iterator]() {
        return this;
      },
    };
  },
};

// 依赖收集
const track = (target, key) => {
  // 如果禁止追踪，直接返回
  if (!shouldTrack) return;

  if (activeEffect) {
    let deps = bucket.get(target); // 获取的是整个组件的依赖桶 map
    let dep = null;
    if (deps) {
      dep = deps.get(key); // 获取的是每个属性的依赖桶的set
      if (dep) {
        dep.add(activeEffect);
      } else {
        dep = new Set(); // 没有就创建一个 set 用来存储副作用函数
        dep.add(activeEffect); // 把当前正在执行的那个函数收集起来
        deps.set(key, dep); // 把每个属性的依赖桶的set 放到整个组件的依赖桶 map 中
      }
    } else {
      deps = new Map(); // 第二层的数据，用来收集副作用函数
      dep = new Set(); // 没有就创建一个 set 用来存储副作用函数
      dep.add(activeEffect); // 把当前正在执行的那个函数收集起来
      deps.set(key, dep); // 把每个属性的依赖桶的set 放到整个组件的依赖桶 map 中
      bucket.set(target, deps); // 把整个组件的依赖桶 map 放到弱引用的 weakmap 中
    }
    // 正在执行的副作用函数的 deps 中添加当前属性的依赖桶的set
    activeEffect.deps.push(dep);
  }
};

const trigger = (target, key, type = "SET", newVal) => {
  let deps = bucket?.get(target); // 获取的是整个组件的依赖桶 map
  if (!deps) return;

  const iterateEffects = deps.get(ITERATE_KEY);
  const effects = deps?.get(key); // 获取的是每个属性的依赖桶的set
  const effectsRn = new Set();

  effects &&
    effects.forEach((fn) => {
      /*
        为了 effect 函数自己在内部修改依赖的数据
        effect ( () => {
        obj. foo = obj. foo + 1 ; // 既「读」foo（收集依赖），又「写」foo（触发依赖） });
    */
      if (fn !== activeEffect) {
        effectsRn.add(fn);
      }
    });

  // 只有新增的时候 才需要收集 for in 的依赖
  // 如果操作类型是 set，且操作对象是 map，也需要触发哪些 ITERATE_KEY 的依赖函数
  if (
    type === "ADD" ||
    type === "DELETE" ||
    (type === "SET" &&
      Object.prototype.toString.call(target) === "[object Map]")
  ) {
    iterateEffects &&
      iterateEffects.forEach((fn) => {
        if (fn !== activeEffect) {
          effectsRn.add(fn);
        }
      });
  }

  if (type === "ADD" && Array.isArray(target)) {
    // 取出所有length 相关的effects
    const lengthEffects = deps?.get("length");

    if (key >= newVal) {
      lengthEffects &&
        lengthEffects.forEach((fn) => {
          if (fn !== activeEffect) {
            effectsRn.add(fn);
          }
        });
    }
  }

  effectsRn.forEach((fn) => {
    if (fn.options?.scheduler) {
      fn.options.scheduler(fn);
    } else {
      fn();
    }
  }); // 数据变了，通知桶里的所有函数
};

// 改成构造函数，可以递归。用来处理深响应,
// isShallowReactive 用来做浅响应的开关
// 判断是不是只读
function reactive(data, isShallowReactive = false, isReadOnly = false) {
  // 如果是代理对象，直接返回原始对象
  if (rawMap.has(data)) {
    return data;
  }
  // 该原始对象已经有代理，直接复用
  const existing = reactiveMap.get(data);
  if (existing) {
    return existing;
  }

  const proxy = new Proxy(data, {
    get(target, key, receiver) {
      // 返回原始数据，本例子的 data 对象
      if (key === "raw") {
        return target;
      }

      // 处理 size 属性
      /*
        Map,Set 的数据不是存在普通属性里的，而是存在一个叫 `[[MapData]]`
        内部槽 （internal slot）的地方。所以返回的代理对象没有内部槽，
        所以需要手动返回原始对象的 size
        属性
      */
      if (key === "size") {
        track(target, ITERATE_KEY);
        return Reflect.get(target, key, target);
      }

      // 数组查找类方法返回重写版本
      if (Array.isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
        return Reflect.get(arrayInstrumentations, key, receiver);
      }

      // 如果是只读属性，就没必要收集依赖, 如果 key 是 symbol 类型，就没必要收集依赖
      if (!isReadOnly && typeof key !== "symbol") {
        track(target, key); // 收集
      }

      const res = Reflect.get(target, key, receiver);
      // 如果是浅响应，直接返回 res
      if (isShallowReactive) {
        return res;
      }
      // 如果 res 是一个对象，递归调用 reactive 函数
      if (typeof res === "object" && res !== null) {
        return reactive(res, false, isReadOnly);
      }

      // Map/Set 只对 mutableInstrumentations 中显式重写的方法转发
      // 没重写的（如原生 entries）让 Reflect.get 的结果透传
      if (
        (Object.prototype.toString.call(target) === "[object Map]" ||
          Object.prototype.toString.call(target) === "[object Set]") &&
        mutableInstrumentations.hasOwnProperty(key)
      ) {
        return Reflect.get(mutableInstrumentations, key, receiver);
      }
      return res && res.__v_isRef ? res.value : res;
    },

    set(target, key, newVal) {
      if (isReadOnly) {
        console.warn("只读属性不能修改");
        return true;
      }
      const oldValue = target[key];

      // 如果旧值是 ref，应该更新 ref.value，而不是把 ref 对象本身替换掉
      if (oldValue && oldValue.__v_isRef) {
        oldValue.value = newVal;
        return true;
      }

      // 判断属性是增加还是修改
      // 如果 target 是数组，检查被设置的索引值是否小于数组长度
      const type = Array.isArray(target)
        ? Number(key) < target.length
          ? "SET"
          : "ADD"
        : Object.prototype.hasOwnProperty.call(target, key)
          ? "SET"
          : "ADD";
      Reflect.set(target, key, newVal);
      // 触发依赖, 只有当值发生变化时才触发。 赋值一个旧的值，用来判断是否发生变化
      if (oldValue !== newVal && (oldValue === oldValue || newVal === newVal)) {
        trigger(target, key, type, newVal); // 触发
      }

      return true;
    },
    // 拦截 in 方法
    has(target, key) {
      // 如果是只读属性，就没必要收集依赖
      if (!isReadOnly) {
        track(target, key); // 收集
      }
      return Reflect.has(target, key); // 将 has 操作委托给 Reflect.has
    },

    // 拦截 Object.keys 方法
    ownKeys(target) {
      if (!isReadOnly) {
        track(target, Array.isArray(target) ? "length" : ITERATE_KEY); // 收集
      }
      return Reflect.ownKeys(target); // 将 ownKeys 操作委托给 Reflect.ownKeys
    },

    //   删除属性时，需要触发依赖
    deleteProperty(target, key) {
      if (isReadOnly) {
        console.warn("只读属性不能删除");
        return true;
      }
      // 检查被删除的属性是否存在
      const hasKey = Object.prototype.hasOwnProperty.call(target, key);
      const res = Reflect.deleteProperty(target, key);
      if (res && hasKey) {
        trigger(target, key, "DELETE"); // 触发
      }
      return true;
    },
  });

  // 建立双向映射： 正向避免重复代理，反向用于查原始对象
  reactiveMap.set(data, proxy);
  rawMap.set(proxy, data);
  return proxy;
}

// effect(() => {
//   console.log("text 变了：", obj.text);
// });

// obj.text = "hello world"; // 应该会重新打印

const obj = reactive(data);

// 清理副作用函数
function cleanup(effectFn) {
  // 1 遍历 effectFn.deps 中的每个依赖桶的set
  effectFn.deps.forEach((dep) => {
    dep.delete(effectFn);
  });
  // 2 清空 effectFn.deps
  effectFn.deps.length = 0;
}

effect(
  () => {
    console.log("foo 变了：", obj.foo);
  },
  {
    scheduler(fn) {
      setTimeout(fn, 0); // 延迟执行，修改执行顺序
    },
  },
);

const jobQueue = new Set();

const p = Promise.resolve();
let isFlushing = false; // 标记是否正在刷新队列

/*
    "每次`obj.count++` 都会 同步 触发 scheduler，同步执行`jobQueue.add(fn)` 。由于 Set 去重，队列里始终只有一个`fn` 。而`p.then` 的回调被排进 微任务队列 ，必须等所有同步代码跑完才执行。等它执行时，`count` 在同步阶段已经变成 4 了，所以只打印一次`count 变了：4` 。"
*/

function flushJob() {
  if (isFlushing) {
    return;
  }
  isFlushing = true;
  p.then(() => jobQueue.forEach((job) => job())).finally(() => {
    jobQueue.clear();
    isFlushing = false;
  });
}

effect(
  () => {
    console.log("count 变了：", obj.count);
  },
  {
    scheduler(fn) {
      jobQueue.add(fn);
      // 调用 flushJob 函数 刷新队列
      flushJob(fn);
    },
  },
);

export function computed(getter) {
  let value;
  // 用来标识是否需要重新计算
  let dirty = true;

  const effectFn = effect(getter, {
    lazy: true,
    scheduler() {
      dirty = true; // 数据变了，需要重新计算
      trigger(obj, "value");
    },
  });
  const obj = {
    get value() {
      if (dirty) {
        dirty = false;
        value = effectFn();
        // 是 get操作
      }
      track(obj, "value");
      return value;
    },
  };
  return obj;
}

// 增加一个递归函数，

function traverse(value, seen = new Set()) {
  if (typeof value !== "object" || value === null || seen.has(value)) {
    return;
  } else {
    seen.add(value);
  }

  // 递归遍历对象的每个属性
  for (let key in value) {
    traverse(value[key], seen);
  }
}

function watch(source, cb, options = {}) {
  let gettter;

  if (typeof source === "function") {
    gettter = source;
  } else {
    gettter = () => traverse(source);
  }
  let cleanup;
  let oldValue, newValue;

  const onInvalidate = (fn) => {
    cleanup = fn;
  };

  const job = () => {
    newValue = effectFn();
    if (cleanup) {
      cleanup();
    }
    cb(newValue, oldValue, onInvalidate);
    // 更新旧值，不然下次会得到一个错的旧值
    oldValue = newValue;
  };

  const effectFn = effect(
    () => {
      return gettter(); // 用来触发依赖搜集
    },
    {
      scheduler: () => {
        if (options?.flush === "post") {
          const p = Promise.resolve();
          p.then(() => {
            job();
          });
        } else {
          job();
        }
      },
      lazy: true,
    },
  );

  if (options?.immediate) {
    // 创建的时候就会立即执行一次
    job();
  } else {
    // 手动调用副作用拿到的就是旧值
    oldValue = effectFn();
  }
}

const reactiveMaps = reactive(new Map([["a", 1]]));

effect(() => {
  console.log(reactiveMaps.get("a"));
});

// 封装一个ref函数。来实现基础类型的响应式数据
function ref(value) {
  const wrap = {
    value,
  };

  // 使用Object.defineProperty 在wrap中定义一个不可枚举的属性_v_isRef,并且值为true
  Object.defineProperty(wrap, "_v_isRef", {
    value: true, // 是ref
    enumerable: false, // 不可枚举
  }); 
  

  // 将 wrap 变成响应式对象
  return reactive(wrap);
}

function toRef(obj,key){
  const wrapper = {
    get value(){
      return obj[key];
    },
    set value(newValue){
      obj[key] = newValue;
    }
  }

  return wrapper;
}


// toRefs 函数 用于将对象的属性转换为响应式数据

function toRefs(obj){
  const wrapper = {};
  for(let key in obj){
    wrapper[key] = toRef(obj,key);
  }
  return wrapper;
}



// 导出公共 API，供测试文件 import
// computed / watch 已在函数定义处独立 export，这里导出其余未独立声明的
export {
  reactive,
  effect,
  track,
  trigger,
  reactiveMap,
  rawMap,
  ITERATE_KEY,
  shouldTrack,
  traverse,
  MAP_KEY_ITERATE_KEY,
  watch,
  ref,
  toRef,
  toRefs,
};
