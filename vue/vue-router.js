// router 的实现

import { h, computed, shallowRef, inject, provide } from "vue";

function useRouter() {
  return inject("router");
}

function useRoute() {
  return inject("route");
}

// route-view
// 本质就是一个组件
const RouteView = {
  name: "RouteView",
  setup() {
    const route = useRoute();
    const depth = 0;
    return () => {
      // 找到深度对应的匹配记录
      const matched = route.value.matched[depth];
      // return h(matched.component)
      return matched ? h(matched.component) : null;
    };
  },
};

const RouteLink = {
  name: "RouteLink",
  props: {
    to: [String, Object],
  },
  setup(props, { slots }) {
    const router = useRouter();
    // 计算属性，返回路由的 href
    const href = computed(() => {
      return router.resolve(props.to).href;
    });
    const handleClick = (e) => {
      e.preventDefault();
      // 跳转路由
      router.push(props.to);
    };
    return () => h("a", { href, onClick: handleClick }, slots.default());
  },
};

// 手写一个vue router
class simpleRouter {
  constructor(options) {
    this.options = options;
    this.routes = options.routes;
    this.currentRoute = shallowRef({ path: "/" });
    this.beforeEachGuards = [];
    this.beforeResolveGuards = [];
    this.afterEachGuards = [];

    this.init();
  }
  init() {
    window.addEventListener("load", () => this.updateRoute());
    window.addEventListener("hashchange", () => this.updateRoute());
  }

  async updateRoute() {
    // 获取当前路由路径
    const path = window.location.hash.slice(1) || "/";
    const to = this.matchRoute(path);
    const from = this.currentRoute.value;

    await this.resolveAsyncComponents(to);

    // 1. 全局前置守卫 beforeEach
    const result = await this.runGuards(this.beforeEachGuards, to, from);
    if (result === false) {
      // 取消导航
      window.location.hash = from.path;
      return;
    }

    if (result !== true) {
      window.location.hash = typeof result === "string" ? result : from.path;
      return;
    }

    // 2 resolve 解析路由
    const resolveResult = await this.runGuards(this.beforeResolveGuards, to, from);
    if (resolveResult === false) {
      // 取消导航
      window.location.hash = from.path;
      return;
    }

    if (resolveResult !== true) {
      window.location.hash = typeof resolveResult === "string" ? resolveResult : from.path;
      return;
    }

    this.currentRoute.value = to;

    // � 全局后置守卫 afterEach
     this.afterEachGuards.forEach((guard) => guard(to, from));
  }

  // matchRoute 方法
  matchRoute(path) {
    //简易匹配
    for (const record of this.routes) {
      const keys = [];
      const pattern = record.path
        .replace(/:([^\/]+)/g, (_, key) => {
          keys.push(key);
          return "([^/]+)";
        })
        .replace(/\//g, "\\/");

      const reg = new RegExp(`^${pattern}$`);
      const matched = path.match(reg);
      if (matched) {
        const params = {};
        keys.forEach((key, index) => {
          params[key] = matched[index + 1];
        });
      }
    }

    return {
      path,
      params: {},
      matched: [record],
    };
  }


  beforeEach(guard) {
    this.beforeEachGuards.push(guard);
  }

  beforeResolve(guard) {
    this.beforeResolveGuards.push(guard);
  }

  afterEach(guard) {
    this.afterEachGuards.push(guard);
  }


 async resolveAsyncComponents(to){
    for(const record of to.matched){
        // 遍历匹配记录，判断是否是
      if( typeof record.component === "function"){
         const module = await record.component();
         record.component = module.default || module;
      }
    }

  }

  async runGuards(guards, to, from) {
    for (const guard of guards) {
      const result = await guard(to, from);
      if (result === false) {
        return false;
      }
      if (result !== true) {
        return result;
      }
    }
    return true;
  }

  push(to) {
    const target = typeof to === "string" ? to : to.path;
    window.location.hash = target;
  }

  go(delta) {
    window.history.go(delta);
  }
  // 解析
  resolve(to) {
    const path = typeof to === "string" ? to : to.path;
    const query = typeof to === "object" && to.query ? to.query : {};

    // 拼接query
    const queryStr = Object.entries(query)
      .map(([key, value]) => `${key}=${value}`)
      .join("&");
    const href = "#" + path + (queryStr ? `?${queryStr}` : "");
    return href;
  }

  install(app) {
    // 提供路由实例
    app.config.globalProperties.$router = this;
    app.provide("router", this);
    app.provide("route", this.currentRoute);
    app.component("RouteLink", RouteLink);
    app.component("RouteView", RouteView);
  }
}
