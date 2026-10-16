import { reactive, computed, inject, provide, toRefs } from "vue";

// 全局store容器 key注入

const piniaKey = Symbol("pinia");

// 创建一个仓库容器
export function createPinia() {
  const pinia = {
    _s: new Map(),
    install(app) {
      // 让所有组件通过inject(piniaKey) 来获取pinia
      app.provide(piniaKey, this);
      // 让所有组件通过inject(piniaKey) 来获取pinia
      app.config.globalProperties.$pinia = this;
    },
  };
  return pinia;
}

// 2 defineStore 函数:定义并且创建一个store
// id: store的唯一标识
// options: store的配置对象
// return: store实例
export function defineStore(id, options) {
  return function useStore(pinia = inject(piniaKey)) {
    // 如果store存在，直接返回
    if (pinia._s.has(id)) {
      return pinia._s.get(id);
    } else {
      const store = useOptionsStore(pinia, id, options);
      pinia._s.set(id, store);
      return store;
    }
  };
}

// 处理options写法
function useOptionsStore(pinia, id, options) {
  // state 可以是对象或返回对象的函数
  const rawState =
    typeof options.state === "function" ? options.state() : options.state;
  // reactive 可以将对象转换为响应式对象
  const state = reactive(rawState);
  // 同时把state挂载道store实例上
  const store = {
    $id: id,
    $state: state,
  };

  //getters
  /*1. 获取getter*/
  const getters = {};
  if (options.getters) {
    for (const key in options.getters) {
      getters[key] = computed(() => options.getters[key].call(store, state));
    }
  }

  // actions
  /*2. 获取action*/
  const actions = options.actions || {};

  // 把state/gettes/actions 挂到store上
  Object.assign(store, toRefs(state), getters, actions);

  store.$state = state

  // 批量$patch

  store.$patch = (partialOrFn)=>{
    if(typeof partialOrFn === 'function'){
        partialOrFn(store.$state);
    }else{
        Object.assign(store.$state, partialOrFn);
    }
  }

  return store;
}
