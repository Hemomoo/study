//  副作用栈
const effectStack = [];

function useState(val) {
  // 保存订阅该state的变化的effect
  const subs = new Set();
  const getter = () => {
    const effect = effectStack[effectStack.length - 1];
    if (effect) {
      // 建立发布订阅关系
      subscribe(effect, subs);
    }
    return val;
  };
  const setter = (newVal) => {
    val = newVal;
    // 通知所有订阅该state的effect执行
    for (const effect of [...subs]) {
      effect.execute();
    }
  };
  return [getter, setter];
}

function subscribe(effect, subs) {
  // 订阅关系
  subs.add(effect);

  // 依赖关系
  effect.deps.add(subs);
}

function cleanup(effect) {
  // 从该effect订阅的所有state对应subs中移除该effect
  for (const subs of effect.deps) {
    subs.delete(effect);
  }
  // 将effect 所有的state对应的subs清除
  effect.deps.clear();
}

function useEffect(callback) {
  const execute = () => {
    // 重制依赖
    cleanup(effect);
    // 将当前依赖推入栈顶
    effectStack.push(effect);

    try {
      callback();
    } finally {
      effectStack.pop();
    }
  };

  const effect = {
    execute,
    deps: new Set(),
  };

  // 立即执行一次，建立订阅发布
  execute();
}

const [count, setCount] = useState(0);

useEffect(() => {
  console.log("useEffect 执行了", count());
});

setCount(100);

// 要实现 useEffect 执行期望
