// thunk 函数
import fs from 'fs';
function readFile(path, encoding, callback) {
  fs.readFile(path, encoding, callback);
}

// ========== Thunk 化（返回一个函数）==========
function thunkify(fn) {
  // fn.length = 3（参数个数）
  return function (...args) {
    return function (callback) {
      // 等到 callback 传进来时，才真正执行 fn
      return fn.call(null, ...args, callback);
    };
  };
}

// 使用
const readFileThunk = thunkify(readFile);

// 第一步传入参数
const myReadFileThunk = readFileThunk('./generate.js', 'utf8');

// 第二步传入 callback
myReadFileThunk((err, data) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log(data);
});


// const readFileThunk = thunkify(fs.readFile);

function* gen() {
  const file1 = yield readFileThunk('/a.txt', 'utf8');
  const file2 = yield readFileThunk('/b.txt', 'utf8');
  return file1 + file2;
}

// 手动执行器
function run(generator) {
  const iterator = generator();

  function next(err, data) {
    if (err) {
      // 出错了，传递给 generator 抛出
      const result = iterator.throw(err);
      if (result.done) return;
      result.value(next); // 继续执行，callback 就是 next
      return;
    }

    const result = iterator.next(data); // 把上次的 data 传回去
    if (result.done) {
      console.log('最终结果:', result.value);
      return;
    }
    // result.value 是一个 thunk（等待 callback 的函数）
    // 传入 next 作为 callback
    result.value(next);
  }

  next(); // 启动，err 和 data 都是 undefined
}

run(gen);




