---
title: 'ROT.js Tutorial Part 0'
date: 2022-07-03T08:00:00.000Z
meta:
  title: ROT.js Tutorial Part 0 
  date: "July 3, 2022"
  description: As part of the 2022 RoguelikeDev Does The Complete Roguelike Tutorial I've decided to adapt the tutorial for ROT.js. There's a variety of ways to get a ROT.js application up and running. For this tutorial we'll be writing our code in Typescript so we have nice strongly typed code, to handle our transpiling and bundling we'll use ViteJS, and of course we'll use ROT.js, a javascript library modeled after libtcod. So let's get started!
---

# {attributes.title}
{attributes.date.toDateString()}

As part of the 2022 [RoguelikeDev Does The Complete Roguelike Tutorial](https://www.reddit.com/r/roguelikedev/comments/vm9yam/roguelikedev_does_the_complete_roguelike_tutorial/)
I've decided to adapt the tutorial for [ROT.js](https://ondras.github.io/rot.js/hp/). There's a variety of ways to 
get a ROT.js application up and running. For this tutorial we'll be writing our code in Typescript so we have nice
strongly typed code, to handle our transpiling and bundling we'll use ViteJS, and of course we'll use ROT.js, a javascript
library modeled after libtcod. So let's get started!

### Initial Setup

Since we'll be using Typescript to write our game, we're going to need a development environment that will support that.
To start we'll install NodeJS. While we won't be writing NodeJS code directly, we'll be using the Node Package Manager
(NPM) to create our project and install any dependencies we have. Go to the [NodeJS home page](https://nodejs.org/) and
download and install for your operating system. Once that's done, you should be able to execute the command `npm -v` and 
see the version of NPM that you have installed. Next we'll get our project created and ready to go.

### Vite-al Signs

The world of client-side JavaScript has come a long way in recent years. Not that long ago, if you wanted to bundle
your code up and get it ready for use in a browser, you had to fiddle with Webpack configs for days before you had
anything working. And that was without the added complexity of transpiling Typescript code. 

Nowadays, you have a ton of options at your disposal. What we'll be using for this tutorial is a wonderful bundler
called [ViteJS](https://vitejs.dev/). It comes with great out-of-the-box setup for Typescript, and has a ridiculously fast dev server
that makes local development a pleasure. 

Getting started requires just a simple, single, npm command:

```
npm create vite@latest js-rogue-tutorial
```

`npm create` is an alias for `npm init`. Init is the canonical command for initializing a new Node project. Create has
been adopted by the development community as how to create a new project based off of a template. Just know that you could
do the same with either Init or Create. 

For purposes of the tutorial we'll be using a vanilla Typescript setup so:

- choose vanilla
- choose vanilla-ts

We now go into our project, install our dependencies, and start it up:

```
> cd js-rogue-tutorial
> npm install
> npm run dev
```

You should now be able to see the application working at http://localhost:3000. 

### ROTten to the Core

Now let's install rot.js and get a simple Hello World version running. First we need to install the library so 
our application can use it:

```
> npm install rot-js
```

With that done, open up the `main.ts` file in the `src` directory and delete all the content in there; we won't
be needing any of that. We can also delete the style.css file for now. Go ahead and add the below code to `main.ts`:

```typescript
import * as ROT from 'rot-js';

class Engine {
  public static readonly WIDTH = 80;
  public static readonly HEIGHT = 50;

  display: ROT.Display;

  constructor() {
    this.display = new ROT.Display({width: Engine.WIDTH, height: Engine.HEIGHT});
  }

  render() {
    const x = Engine.WIDTH / 2;
    const y = Engine.HEIGHT / 2;
    this.display.draw(x, y, 'Hello World', '#fff', '#000');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const engine = new Engine();

  const container = engine.display.getContainer()!;

  document.body.appendChild(container);

  engine.render();
})
```

Let's break down what we're doing here:

```typescript
import * as ROT from 'rot-js';
```

First we need to import the ROT.js library. Here we're bringing in all the exported items from the library and aliasing
them under the `ROT` name so we have them available. 

```typescript
class Engine {
  public static readonly WIDTH = 80;
  public static readonly HEIGHT = 50;
```

We start defining our `Engine` class that will be responsible for starting up our game and geting things running. We also
set up two `readonly` constants to hold on to the width and height of our display so we can reference those later.

```typescript
display: ROT.Display;

constructor() {
  this.display = new ROT.Display({width: Engine.WIDTH, height: Engine.HEIGHT});
}
```

The first line is setting up an instance variable to hold on to our display inside the engine. Then in the constructor
(which gets called when our engine is created later on), we ask ROT.js to create a new display and assign it to our
instance variable. To create the display we give options specifying the width and height we want the screen to be.

```typescript
    render() {
    const x = Engine.WIDTH / 2;
    const y = Engine.HEIGHT / 2;
    this.display.draw(x, y, 'Hello World', '#fff', '#000');
  }
}
```

Here we add a `render` method to our engine that will update our display to show a bit of text on the screen. We first
calculate the x and y coordinates where we want to print our text. We divide the width and height by 2 to find the center
of the display. Then we call the `draw` method on our display. We pass the x and y coordinates we calculated, the text we
want to draw, a foreground color of full white, and a background color of full black. 

```typescript
window.addEventListener('DOMContentLoaded', () => {
  const engine = new Engine();

  const container = engine.display.getContainer()!;

  document.body.appendChild(container);

  engine.render();
})
```

Now that our engine is ready, we need some code to actually kick off creating an instance of our engine and using it.
Here we add a new event listener to the global `window` object. The `DOMContentLoaded` event will fire and call our handler
here once the DOM has fully loaded all the content specified on the page. Inside the handler for this event, we first
create a new instance of our engine class. This will also cause the constructor of our engine to be called, creating the
display inside it. 

Once the engine is created, we can then ask the display in our engine to give us its container. The container is an `HTMLElement`
that we can then use to add to the body of our webpage. Once we've added the display so it can be viewable in a browser,
we can then call our `render` method on our engine, which will cause our "Hello World" text to display.

### Wrap Up

You should now have a working application that displays some simple "Hello World" text in a ROT.js display in your browser.
Stay tuned for [Part 1](/rotjs-tutorial/part1)!