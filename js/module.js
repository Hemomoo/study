// esm 模块化

/*
    es5: commonjs,amd 前面的是浏览器后面是 node
    es6: esm 模块化
*/

import { stat, exists, readFile } from 'fs';
// 引入 fs 模块的 stat, exists, readFile 方法, 编译时候加载


/*
严格模式
1. 变量必须先声明后使用
2. 函数的参数不能有同名属性，不然会报错
3. 不能是用 with 语句
4. 不能对只读属性赋值
5. 不能使用前缀 0 表示八进制数
6. 不能删除不可以删除的属性，否则报错
7. 不能删除 delete prop ,会报错 只能删除属性 delete global[prop]
8. evel不会在它的外层作用域引入变量
9. eval 和 agruments 不能重新赋值
10. 不能使用 arguments.callee
11. 不能使用 arguments.caller
12. 禁止 this 指向全局对象
13. 不能使用 fn.caller和 fn.arguments 获取调用栈的堆栈
14. 增加了保留字 protected static interface
*/


// import 函数

/*
    参数和 import 语句一样，返回一个 promise 对象
    可以用在任何地方， 不仅是模块 非模块也可以用
    import()类似于 Node.js 的require()方法，
    区别主要是前者是异步加载，后者是同步加载。

*/

const main = document.querySelector('main');

import(`./section-modules/${someVariable}.js`)
  .then(module => {
    module.loadPageInto(main);
  })
  .catch(err => {
    main.textContent = err.message;
  });



// import 属性，表示导入的是 json 文件
// 静态导入
import configdata from "/data/config.json" with { type: 'json' };

// 动态导入
const config =  await import('/data/config.json',{
    with: { type: 'json' }
});


// 使用场景
/*

1. 动态模块路径 ， 例如根据用户输入动态加载不同的模块
2. 按需加载模块， 需要根据用户操作动态加载模块， 例如点击按钮加载模块等
3. 条件加载模块， 例如根据浏览器类型加载不同的模块等

模块加载成功后，模块会作为一个对象，可以使用结构赋值获取模块的属性和方法
*/ 

/* 
    同事获取多个模块
    可以使用 Promise.all() 方法同时获取多个模块， 然后在回调函数中处理多个模块的加载结果
*/


Promise.all([
  import('./module1.js'),
  import('./module2.js'),
  import('./module3.js'),
])
.then(([module1, module2, module3]) => {
   console.log(module1, module2, module3);
});


// import.meta  元属性 由运行环境决定， 例如浏览器和 node.js 环境下的 import.meta 是不同的

/*
    1. url 属性， 表示当前模块的路径
    2.scriptElement 返回加载模块的 script 元素对象
*/

