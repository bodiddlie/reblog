---
title: 'ROT.js Tutorial Part 1: Drawing the "@" symbol and moving it around'
date: 2022-07-03T08:00:00.000Z
meta:
  title: 'ROT.js Tutorial Part 1: Drawing the "@" symbol and moving it around'
  date: "July 3, 2022"
  description: "Now that we have a working application to start from, it's time to add one of the most important parts of a roguelike game: a player character that you can move around on screen! We'll start with a little housekeeping on the code we've written so far, get a character drawn on the screen, then add the ability to move it around via the arrow keys on your keyboard."
---

# {attributes.title}
{attributes.date.toDateString()}

Now that we have a working application to start from, it's time to add one of the most important parts of a roguelike
game: a player character that you can move around on screen! We'll start with a little housekeeping on the code we've
written so far, get a character drawn on the screen, then add the ability to move it around via the arrow keys on 
your keyboard.

### Refactor/Cleanup

One thing that I didn't like about first entry in this series is that I had some engine details exposed and used
in the `DOMContentLoaded` event handler. Because of this, the event handler had to know not just to create an engine,
but about getting the display from the engine, then specifically getting the container for that display and appending
it to the document body. This is brittle design that would lead to problems if say we wanted to use a different library
than ROT.js down the line. If we encapsulate all the logic for starting up our game in the engine, then if or when that
logic changes, we only need to change our code inside the engine. Those implementation details shouldn't affect the code
that is using our engine. So let's clean that up a bit. 

We'll start by changing our `DOMContentLoaded` event handler to look like this:

```typescript
window.addEventListener('DOMContentLoaded', () => {
  window.engine = new Engine();
});
```

Now if your editor is configured to display warnings/errors from Typescript, you should be getting a complaint along the
lines of `Property 'engine' does not exist on type Window`. Typescript is telling us that the `Window` type doesn't
have a property called `engine` on it, and thus it is an error for us to try to assign to it. Now, this code will still
compile and run, but Typescript will help us avoid bugs by telling us things like this, so it's important to listen to
what it is telling us and address the errors. 

Luckily, extending an existing global type like `Window` is very easy. Add the below code just above the event listener:

```typescript
declare global {
  interface Window {
    engine: Engine;
  }
}
```

Here we're telling Typescript that we are extending the `Window` interface and adding a property called `engine` of type
`Engine` to it. Now the error should go away.

Our event handler is set up, but we haven't moved the code adding our display to the document yet. Update the constructor
in our `Engine` class to look like this:

```typescript
constructor() {
  this.display = new ROT.Display({
    width: Engine.WIDTH,
    height: Engine.HEIGHT,
  });
  const container = this.display.getContainer()!;
  document.body.appendChild(container);

  this.render();
}
```

We start by creating our display as we did, but now in the constructor we're getting our container, adding it to the body
of the page, and doing an initial render. With these changes in place, the application should look just as it did at the 
end of part 0. 

### Laying the Foundation

We can't have roguelike game (or any kind of game really) without a player character to control. Right now we just have
our friendly `Hello World` text on screen. Let's start putting things in place to have our own player character. 

Find the code in our `render` method and change the `Hello World` text to just a single `@` character. You should now see
our player at the center of the screen. Now let's start representing the position of the player in our world. To do that
we'll need to add some instance variables to our engine to keep track of the position of our player. Below where we 
declare our `display` variable add the below lines:

```typescript
playerX: number;
playerY: number;
```

We're adding two `number` types to our engine for tracking the x and y coordinates of our player on the screen. In the
future we'll probably want to move this information into a type that encapsulates all the info about the player instead
of in the engine, but we'll keep it simple for starting out in this tutorial. Next we
need to initialize these numbers to some values. Let's add some code to the constructor to do this:

```typescript
this.playerX = Engine.WIDTH / 2;
this.playerY = Engine.HEIGHT / 2;
```

We're setting our player position here to be in the center of the screen. Now we just need to use these values. Update
the `render` method to look like this:

```typescript
render() {
  this.display.draw(this.playerX, this.playerY, '@', '#fff', '#000');
}
```

Now we're actually using the player position variables we've created to place the player on the screen. Go ahead and 
set different values for the player and see that they show up in different places. 

### Handling Input

Updating code to see the player position changes is all well and good, but a real game needs to update the player's 
position based on input. In order to do that, we're going to need to write some code to handle keyboard input. Let's 
start by adding a new file to our project under the `src` directory. We'll call it `input-handler.ts`. The goal for 
this file is to have a simple function that will take in a keyboard input event and give us back some action to take.
For now, that action will just be to move our player around the screen, but in the future that could be combat, 
inventory management, unlocking doors, or whatever other actions we might want a player character to take in our game.

Let's start by defining a base `Action` type that our actions will use. Add this to our `input-handler.ts` file:

```typescript
export interface Action {}
```

All of our actions will implement this base interface. Currently, there's nothing specified here, but we'll use it for
some fancy polymorphic behavior. For that, let's add a new class that implements this interface:

```typescript
export class MovementAction implements Action {
  dx: number;
  dy: number;

  constructor(dx: number, dy: number) {
    this.dx = dx;
    this.dy = dy;
  }
}
```

Our `MovementAction` class will return some information about how we are trying to move. Specifically how far we are 
trying to move in the x and y directions. The constructor will assign those values and that's all. 

Next we're going to create a little interface to represent a map of possible inputs. This will give us a convenient
way of mapping inputs to actions as we progress. Add this interface to the `input-handler.ts` file as well:

```typescript
interface MovementMap {
  [key: string]: Action;
}
```

This tricky bit of Typescript is saying that our `MovmentMap` type will have an indeterminate number of keys (represented
as strings), that all have values of type `Action`. This will make more sense with the next block of code that uses this
interface to create a mapping of arrow keys to movement actions. Add this to the file as well:

```typescript
const MOVE_KEYS: MovementMap = {
  ArrowUp: new MovementAction(0, -1),
  ArrowDown: new MovementAction(0, 1),
  ArrowLeft: new MovementAction(-1, 0),
  ArrowRight: new MovementAction(1, 0),
};
```

This map sets up with the keys being the actual names of keyboard inputs and the values being `MovementAction`s to take.
All that's left is our simple input handler function that will use all of this:

```typescript
export function handleInput(event: KeyboardEvent): Action {
  return MOVE_KEYS[event.key];
}
```

This simple function takes in a keyboard event, checks our map for a relevant action, and returns it. With that, all we
have left to do is use this input handler in our engine. So let's go back to the `main.ts` file and update our imports:

```typescript
import { handleInput, MovementAction } from './input-handler';
```

Then let's add a new method to our `Engine` class called `update` like below:

```typescript
update(event: KeyboardEvent) {
  const action = handleInput(event);

  if (action instanceof MovementAction) {
    this.playerX += action.dx;
    this.playerY += action.dy;
  }
  this.render();
}
```

This method takes in a `KeyboardEvent` which it then passes to our input handler function. We check the resulting action
of that handler to see if it's a `MovementAction`, and if it is, updating the player position based on that action. We 
then re-render the screen to show the new position. One final thing to get this working is to actually tell the application
to listen to keyboard events. Let's add some code to our constructor, right before the initial `render` call:

```typescript
window.addEventListener('keydown', (event) => {
  this.update(event);
});
```

This tells the browser we want to be notified anytime a `keydown` event happens and that the callback function supplied
should be called. That in turn will call our `update` method. If you run the application now, you'll see that the player
moves around the screen, but leaves a trail behind them. To fix that all we have to do is tell ROT.js to clear the screen
between each render. Add this to the top of the `update` method:

```typescript
this.display.clear();
```

This will clear the screen between updates and make sure that it really looks like the player is moving around. You can
find the complete code for this part of the tutorial [here](https://github.com/bodiddlie/js-rogue-tutorial/tree/Part1-fix).
Part 2 will be coming later this week.