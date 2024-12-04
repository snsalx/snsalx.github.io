---
title: JS Arrays
date: 2024-11-29T15:24:08Z
draft: true
---

JS implements a few functions for working with arrays. They help make your code more concise and elegant.
Let's go over them and see how they work.

## Data

Let's write some test data that we're going to work with here. Imagine we're making a music streaming service.

```js
const history = [
  {
    name: "Nothing Else Matters",
    author: "Metallica",
    listenedToSecond: 512,
  },
  {
    name: "Wind Of Change",
    author: "Scorpions",
    listenedToSecond: 256,
  },
  {
    name: "Bohemian Rhapsody",
    author: "Queen",
    listenedToSecond: 512,
  },
  {
    name: "Another One Bites The Dust",
    author: "Queen",
    listenedToSecond: 128,
  },
  {
    name: "Never Gonna Give You Up",
    author: "Rick Astley",
    listenedToSecond: 4,
  },
];
```

## Map

Let's say we want to get just the names and authors.

```js
function getMainInfo(tracks) {
  const namesAndAuthors = [];

  for (let i = 0; i < tracks.length; i++) {
    namesAndAuthors[i] = tracks[i].name + " by " + tracks[i].author;
  }

  return namesAndAuthors;
}

console.log(getMainInfo(history));
```

This works, but it's overly verbose, especially if you need to do this to multiple data structures.

Declaring an empty array and filling it in a loop is generally considered an antipattern
because it's not very readable.
Instead, a use of a `map` function is recommended.

```js
function map(array, f) {
  const newData = [];

  for (let i = 0; i < array.length; i++) {
    newData[i] = f(array[i]);
  }

  return newData;
}
```

It's pretty simple - it takes some data, runs it through a function, and returns the result.

```js
function format(track) {
  return track.name + " by " + track.author;
}

console.log(map(history, format));
```

The result is a bit easier to read, but it has another problem: if we need to pass the array
through multiple functions, it is not very pretty: `map(map(history, format), console.log)`.

That's why `.map` is a method built into the array type.

```js
function format({ name, author }) {
  return name + " by " + author;
}

function print(track, index, array) {
  console.log(track);
}

history.map(format).map(print);
```

The `.map` method also provides the index of the current element.

## ForEach

If you just want a map that doesn't return anything, there's the `.forEach` method.
Works identically, just returns `undefined` instead of a new array.

## Filter

Say we want to get all the tracks from Queen.

```js
function fromQueen(tracks) {
  const results = [];

  for (let i = 0; i < tracks.length; i++) {
    if (tracks[i].author === "Queen") {
      results.push(tracks[i]);
    }
  }

  return results;
}

console.log(fromQueen(history).map(format));
```

The helper method for this is called `.filter` and works in much the same way:

```js
function fromQueen(track) {
  return track.author === "Queen";
}

history.filter(fromQueen).map(format).forEach(print);
```

## Reduce

**TODO EXPLAIN CLOSURES**

Sometimes you need something a bit more complex, let's say we want to calculate the total playback time.

```js
let totalTime = 0;

history.map((track) => {
  totalTime += track.listenedToSecond;
});

console.log(totalTime);
```

And that's usually it, but we can make this shorter as well.

```js
function reducer(acc, current, index) {
  return acc + current.listenedToSecond;
}

const totalTime = history.reduce(reducer, 0);

console.log(totalTime);
```

The reducer is a function that gets called on every iteration, like in `map`, but
with an additional variable called `accumulator`. The second argument of the `.reduce` method
is accumulator's initial value. Here we're calculating the sum, so it's zero.

It's commonly written more like this:

```js
const totalTime = history.reduce(
  (acc, track) => acc + track.listenedToSecond,
  0,
);
console.log(totalTime);
```
