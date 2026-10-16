class parent {

}

// 语法
class chiild extends parent {
  // 子类的代码
    constructor(x, y, color) {
    super(x, y); // 调用父类的constructor(x, y)，用super()调用父类的构造函数
    this.color = color;
  }

  toString() {
    return this.color + ' ' + super.toString(); // 调用父类的toString()
  }
}
/*
    1. 先创建一个父类的属性和方法加到一个空对象中，然后再将空对象作为子类的实例，
    “继承在前，实例在后” 
    2. 必须要先 super()，再 使用this.()，否则会报错
*/

class Foo {
  constructor() {
    console.log(1);
  }
}

class Bar extends Foo {
  constructor() {
    super();
    console.log(2);
  }
}

const bar = new Bar();
// 1
// 2


// 私有属性和私有方法的继承， 不能被子类继承
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


// 静态属性和静态方法，可以被子类继承
class A {
  static hello() {
    console.log('hello world');
  }
}

class B extends A {
}

B.hello() // hello world


// super 关键字的使用，
/*  
作为函数调用
    1. super() 需要在子类的 constructor 函数中调用，如果子类没有调用 super()，则会报错
    2. 只有执行 supper() 子类才会有 this指向
    3. 顺序不能错，子类在没有 super() 之前，不能使用 this 
    4. super 内的 this 指向子类的实例，而不是父类的实例
作为对象
    1. super 可以作为对象调用，指向父类的原型对象，
    2. 在静态方法中指向父类
*/

// 标签模板


function people(name, age) {
    console.log(name, age);
}

const name = 'Hemooo';
const age = 25;
people `${name}, ${age}`;