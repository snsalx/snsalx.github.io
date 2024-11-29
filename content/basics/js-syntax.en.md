+++
title = 'JS Syntax'
date = 2024-11-29T13:16:00Z
draft = true
+++

## Variables

JS has two keywords to declare a variable:
- `let` creates a normal variable that you can reassign later
- `const` creates a variable that cannot be reassigned

```js
let x = 8;
x = 16;
```

```js
const y = "value";
y = "error"; // TypeError: invalid assignment to const 'y'
```

## Data types

Are calculated by the language at the time of (re)assignment and *can* be changed.

There are 7 primitive types:
1. `number` (`0.8`, `32`, `-Infinity`)
2. `string` (`"some text"`)
3. `boolean` (`"true"`, `"false"`)
4. `undefined` (like `void`, a lack of value)
5. `null` (another kind of `void`)
6. `bigint` (very large integers, rarely used)
7. `symbol` (unique values, rarely used)

The difference between `null` and `undefined` is in their intended usage.
`undefined` means that the app doesn't know something,
for example if the user hasn't responded to a query.
`null` means that no data exists or can exist,
for example if the user refused to respond.

There is also the `Object` type which is anything more complex.
Objects store key-value pairs (like variables that have a name and a value).
```js
const user = {
  name: "Joe",
  age: 32,
};
```

Some types based on objects:
1. `Array` (`['first', 'second']` is an object where index is the key)
2. `Date` (created via `new Date()`)
3. `Map` (`new Map()`, like regular objects, but for data that needs to change often)
4. `Function`s are technically implemented via objects, though that's unimportant

Note that if the object is `const`, it can't be reassigned, but it can be mutated.
```js
const user = {
  name: "Joe",
  age: 32,
};

user.age = 33; // no error, field accessed by dot notation
```

Sidenote: `typeof(null)` responds with `"object"`, which is considered a bug.

## Destructuring nested data

If you want to create variables for some object keys, you can either declare them manually
or use the destructuring syntax.

```js
const user = {
  name: "Joe",
  age: 32,
};

const { name, age } = user; // same names as in the object
const { name: userName, age: userAge } = user; // custom names
```

The same thing is available for arrays.

```js
const week = ["Sunday", "Monday", "Tuesday", "Wednesday"];
const [sun, mon, tue, wed] = week
```

## Type coercion

JS will convert types whenever possible:
```js
let x = 1;
let y = true;
let z = 'text';

x + y; // 2
x + z; // "1text"
z + x; // "text1"
y + z; // "truetext"

"1" + 1; // "11"
"11" - 1; // 10
"1" + 1 - 1 // 10
```

## Template literals

If you want to insert a value into a string, you can wrap the string in
backticks (\`) and do this:
```js
const number_left = 10;

const message1 = "there are " + number_left + " items left";
const message2 = `there are ${number_left} items left`;
```

## Console

The simplest way to output text is the `console` object.
It is pre-defined by the runtime, you just have to call a method on it:
```js
console.log("debug message");
console.warn("something might be wrong")
console.error("oh no");
```

## Functions

JS has no main function. Execution goes in 2 steps:
1. The runtime reads all the functions
2. Execution starts from the first line, ignoring function definitions

```js
const result = add(4, 8);
console.log(result); // 12

function add(x, y) {
  return x + y;
}
```

Because functions are implemented as objects,
they can be passed around, like objects:
```js
const a = calculate(4, 8, add);
const b = calculate(4, 8, subtract);
console.log(a) // 12
console.log(b) // -4

function calculate(x, y, operation) {
  return operation(x, y);
}

function add(x, y) {
  return x + y;
}

function subtract(x, y) {
  return x - y;
}
```

Note that you pass a function by its name and call it by adding brackets.
`calculate(1, 2, add)` returns 3, but `calculate(1, 2, add())` gives you an error.
`typeof(add)` is `function`, but `typeof(add())` is `number`.

## Control flow

Same as in C:
```js
let x = 0;

while (x < 3) {
  console.log(x);
  x++;
}

for (let i = 0; i < 10; i++) {
  if (i % 3 === 0 && i % 5 === 0) {
    console.log('fizzbuzz');
  } else if (i % 3 === 0) {
    console.log('fizz');
  } else if (i % 5 === 0) {
    console.log("buzz");
  } else {
    console.log(i);
  }
}
```

Only the equality check is a bit different:
`==` does type conversion,
`===` checks that both the value and the type match:

```js
console.log('1' == 1); // true
console.log('1' === 1); // false
```
