// 模块的加载
/*
    1. <script></script> 标签加载模块
    可以在浏览器中使用 <script></script> 标签加载模块，
    例如：
    2. import() 函数加载模块 esm
    3. require() 函数加载模块 commonjs
    // 4. System.import() 函数加载模块
*/



// <script src="./module.js" defer></script> 
// <!-- defer 表示在页面解析完成后加载 -->

// <script src="./module2.js" async></script>
// <!-- async 表示在页面解析完成后加载， 但是会阻塞页面的渲染 -->

// <script src="./module3.js" type="module"></script>
// <!-- type="module" 表示加载 esm 模块  是异步加载  等整个页面渲染完成后 在执行加载的代码-->


/*
    <script type="module">
    import $ from "./jquery/src/jquery.js";
    $('#message').text('Hi from jQuery!');
    </script>
*/


/*
    代码块是在作用域中执行，而不是在全局环境中执行
    模块内部的顶层变量，外部不可见
    模块脚本默认使用严格模式
    模块中，可以使用 import 语句导入其他模块,但是一定要有后缀
    模块中顶层的 this 指向 undefined，而不是 window
    同一模块多次加载，只执行一次
*/


/*
    esm 与 commonjs 区别
    1. esm 是异步加载， commonjs 是同步加载
    2. esm 是编译时加载 ， commonjs 是运行时加载
    3. esm是值的引用， commonjs 是值的复制
*/

/*
    es6的运行机制，js 引擎在脚本静态分析的时候遇到 import 语句，会生成一个只读的引用。等脚本执行的时候才会去加载模块中取值。
*/

export let counter = 3;
export function incCounter() {
  counter++;
}

// main.js
import { counter, incCounter } from './lib';
console.log(counter); // 3
incCounter();
console.log(counter); // 4


// nodejs 模块的加载

/*
    commonjs 模块的加载的后缀是cjs
    esm 模块的加载的后缀是mjs

    可以在 package.json 中配置模块的加载方式
    例如：
    "type": "module"
    表示加载 esm 模块


    package.json 的 main 字段， 表示模块的入口文件

    {
        "type": "module", // 没有回降级为 common.js
        "main": "./src/index.js" // 入口文件
    }


    commonjs 不能加载 esm 模块
    esm 可以加载 commonjs 模块,但是加载的是一个整体，不能只加载单一的输出项
    // 正确
    import packageMain from 'commonjs-package';
    console.log(packageMain);
    // 错误
    import { packageMain } from 'commonjs-package';
    
*/



// 循环加载

/*
    commonjs 模块的加载原理，require 命令第一次加载这个模块的，就会执行脚本，然后在内存中存一个对象
    {
        id: '...', // 模块的唯一标识符 名字
        exports: { ... }, // 模块导出的对象
        loaded: true, // 模块是否加载完成
        ...
        }
*/


// commonjs 模块的循环加载
/*
    循环加载是指，一个模块依赖另一个模块，而另一个模块也依赖第一个模块，形成一个循环
    例如：
    module1.js -> module2.js -> module3.js -> module1.js

    1. main.js require('./a')
    ↓
    2. a 开始执行
    a.exports = { done: false }
    ↓
    3. a require('./b')
    ↓
    4. b 开始执行
    b.exports = { done: false }
    ↓
    5. b require('./a')
    ⚡ 发现 a 正在加载（缓存里已有半成品）
    ⚡ 直接返回当前的 a.exports = { done: false }  ← 截断点！
    ↓
    6. b 继续执行完毕
    b.exports = { done: true }
    ↓
    7. 回到 a，继续执行
    a.exports = { done: true }
    ↓
    8. main 拿到的都是最终的完整值
*/