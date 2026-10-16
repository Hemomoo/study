
// 创建一个 Person 类
class Person {
    //  构造函数 ，用于初始化实例
    //  只能有一个构造函数 ，不能有多个构造函数
  constructor(name, age) {
    //  初始化实例属性
    //  可以在构造函数中使用 this 关键字来引用实例属性
    this.name = name;
    this.age = age;
  }

  toString() {
    return `${this.name} is ${this.age} years old.`;
  }
}

var p = new Person('Hemooo', 25);
console.log(p.toString());

// class 类型是 function
//typeof Person;
console.log(typeof Person);
// 'function'


// 类的方法都定义在 prototype 上,可以通过 object.prototype 来访问
console.log(Person.prototype);
// {}
 function toString() { return `${this.name} is ${this.age} years old.`; }

 Person.prototype.toString = toString;
console.log('Person.prototype.toString:', Person.prototype.toString());

// 

// 构造函数是 constructor 是类的默认方法，如果没有定义类会默认有一个构造函数
// 构造函数的参数是实例的属性，返回值是实例， new 的时候是不是也是调用构造函数的的

/* 底层实现步骤
1. new 的时候先创建一个空对象
2. 调用构造函数，将空对象绑定到 this 上
3. 如果构造函数没有返回对象，返回空对象
4. 如果构造函数返回对象，返回返回的对象
*/
// 类的属性和方法除了显示定义在 this 上，其他都定义在 prototype 上

var point = new Person('Hemooo', 25);

point.toString() // Hemooo is 25 years old.

point.hasOwnProperty('name') // true
point.hasOwnProperty('age') // true
point.hasOwnProperty('toString') // false
point.__proto__.hasOwnProperty('toString') // true

// 可以通过 __proto__ 来给实例添加属性和方法
point.__proto__.toString = function() {
  return `(${this.x}, ${this.y})`;
};


// es2022 实例属性的新方法
// 原来的写法
class IncreasingCounter {
  constructor() {
    this._count = 0;
  }
  get value() {
    console.log('Getting the current value!');
    return this._count;
  }
  increment() {
    this._count++;
  }
}

// 新写法
/* 实例属性_count与取值函数value()和increment()方法，处于同一个层级。这时，不需要在实例属性前面加上this。
注意，新写法定义的属性是实例对象自身的属性，而不是定义在实例对象的原型上面。
*/
class IncreasingCounter2 {
  _count = 0;
  get value() {
    console.log('Getting the current value!');
    return this._count;
  }
  increment() {
    this._count++;
  }
}

// 取值函数
/*
可以使用拦截 get 和 set 方法来实现属性的访问控制。
*/

class MyClass {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }

  get name() {
    return 'getter';
  }
  set name(value) {
    console.log('setter: '+value);
  }
}

let myClass = new MyClass();
myClass.name = 'Hemooo';
console.log(myClass.name);
// gettergetter


// class 的表达式
const MyClass3 = class Me {
  getClassName() {
    return Me.name;
  }
};

// 静态方法, 类相当于实例的原型，所有类中定义的方法都可以被实例继承， 但是静态方法不能被实例继承。但是静态方法可以被子类继承
class MyStaticClass {
  static getClassName() {
    return this.name;
  }
}

const staticClass = new MyStaticClass();
console.log("staticClass.getClassName():", staticClass.getClassName);
// staticClass.getClassName(): undefined, 没有这个方法，表示没有被实例继承


// 如果静态方法，直接调用类名.方法名()
console.log(MyStaticClass.getClassName());
// MyStaticClass
/*
 如果我将属性定义在 constructor中， 那静态方法可以拿到吗
 答案是不能，因为静态方法是类的原型，不是实例的原型
 1. 静态方法（`static` 关键字定义）属于「类本身」 ， 实例属性（constructor里的`this.xxx` ）属于「类的实例」 —— 作用域不同，根本不在同一个内存位置 ；
2. 静态方法里的`this` 指向 类本身 （不是实例），所以你不能在静态方法里直接`this.xxx` 访问实例属性—— 访问会直接 undefined ， 不报错 但也拿不到值（这是最常踩的坑）。
*/

class Person3 {
  constructor(name, age) {
    // 实例属性：每个 new 出来的实例独有一份（比如 p1、p2 各一份）
    this.name = name;
    this.age = age;
  }

  // 静态方法：属于 Person 类本身，不属于任何实例
  static getInfo() {
    console.log('静态方法里的 this:', this);          // 指向 Person 类本身
    console.log('静态方法里的 this.name:', this.name); // undefined！访问不到实例属性
    return '我是 Person类的静态方法';
  }
}

const p1 = new Person3('Hemooo', 25);

// ✅ 静态方法只能通过类调用，不能通过实例调用
Person3.getInfo();           // 正确调用：打印见上方注释
// p1.getInfo();            // ❌ 报错！实例访问不到静态方法

// ✅ 实例属性只能通过实例访问
console.log(p1.name);       // 'Hemooo'
// console.log(Person3.name); // ❌ undefined，类访问不到实例属性


// 问题 2 如果静态方法想拿到实例属性，该怎么做，
/*
    将实例属性做为参数传递给静态方法
*/

/*  2022 新增的私有属性和私有方法
私有属性和私有方法，只能在类的内部访问的属性和方法
前面加# 表示私有属性和私有方法，只能在类的内部访问，不能在类的外部访问。
读取一个不存在的私有属性和私有方法，会报错。读取的时候需要带#，不然不会读取
私有属性和方法不能被子类继承
私有属性和方法可以被实例继承，但是不能访问和调用但是在类的内部可以访问和调用
*/

class IncreasingCounter {
  #count = 0;
  #x = 100;
  get value() {
    console.log('Getting the current value!');
    return this.#count;
  }
  // 可以给私有属性设置 get 方法，set 方法 来设置私有属性的值
  get #x() {
    return this.#x;
  }

  set #x(value) {
    this.#x = value;
  }
  increment() {
    this.#count++;
  }
}


// 不能被子类集，是有属性和方法

class Parent {
  #money = 1000000; // 父类的私有财产

  getMoney() {
    return this.#money; // 父类自己能访问
  }
}

class Child extends Parent {
  // 子类想继承父类的 #money
  useMoney() {
    // return this.#money; // ❌ 报错！ 
  }
}

const c = new Child();
c.getMoney(); // ❌ TypeError: Cannot read private member #money from an object whose class did not declare it

// 判读对象是否是类的实例，可以使用类无法访问不存在的私有属性和私有方法

/*
    1. 实例上存在私有属性 #brand，但是无法读取，写入遍历值
    2. 只有在类的内部才能访问私有属性，使用#brand
    
*/

// 私有字段就像把东西 锁进了保险箱 ：保险箱跟着实例走（确实存在），但 钥匙只在类的内部 ，外面的人只能看到「这个实例」，却看不到、拿不走里面的东西。

class C {
  #brand; // 私有属性，只能在类的内部访问，不能在类的外部访问。读取一个不存在的私有属性和私有方法，会报错。读取的时候需要带#，不然不会读取

  // 静态方法：判断对象是否是类的实例，可以在类的外部调用
  static isC(obj) {
    if (#brand in obj) {
      // 私有属性 #brand 存在
      return true;
    } else {
      // 私有属性 #brand 不存在
      return false;
    }
  }
}

// 1. 创建一个 C 的实例
const c1 = new C('BMW');
console.log(C.isC(c1));   // true  ✅ 是 C 的实例

// 2. 传入一个普通对象
const obj = { name: 'test' };
console.log(C.isC(obj));  // false ❌ 不是 C 的实例

// 3. 传入一个"长得像" C 的对象（但其实不是）
// const fake = { #brand: 'fake' }; // 语法错误：外部不能这么写
// 正确写法：外部无法伪造私有字段，所以 isC 一定能识别真假



class D {
  #brand;

    static isD(obj){
        if(#brand in obj){
            // 是 D 的实例
            return true;
        }else{
            // 不是 D 的实例
            return false;
        }
    }
}



// 静态块，允许在类的内部设置一个代码块，用于初始化静态属性或方法
class E {
  static brand = 'E';
  static y;
  static x;

  // 静态块用来初始化静态属性，只会执行一次，无论创建多少个实例，都不会重复执行静态块
  static {
    try {
      const obj = doSomethingWith(this.x);
      this.y = obj.y; // 使用 this 来代替当前类
      C.z = obj.z; // this和 C 都可以
    }
    catch {
      this.y = 2;
      this.z = 3;
    }
  }

}


// 