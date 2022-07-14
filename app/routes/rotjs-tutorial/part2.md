---
title: 'ROT.js Tutorial Part 2: Generic Entities and Map Setup'
date: 2022-07-04T08:00:00.000Z
meta:
  title: 'ROT.js Tutorial Part 2: Generic Entities and Map Setup'
  date: "July 4, 2022"
  description: "We have a player character that can move around the screen, but it's pretty inflexible at this point. In this tutorial, we're going to lay the groundwork to have more than just a single character on screen, and start working towards being able to generate a map to play in. We'll also do a little cleanup again to make sure we have a maintainable code base in the future. Let's get started!"
---

# {attributes.title}
{attributes.date.toDateString()}

We have a player character that can move around the screen, but it's pretty inflexible at this point. In this tutorial,
we're going to lay the groundwork to have more than just a single character on screen, and start working towards
being able to generate a map to play in. We'll also do a little cleanup again to make sure we have a 
maintainable code base in the future. Let's get started!

### If a Player Character Moves On a Screen and No One is There To Hear It, Does It Really Move?

Having a single '@' move around the screen is a good starting point, but a proper roguelike game needs a lot more
than that. We're going to need to have enemies, items, traps, and any other kind of entity we would want in our game.
To represent that, let's create a generic entity class that we can use as a base for future entities:

```typescript
export class Entity {
  x: number;
  y: number;
  char: string;
  fg: string;
  bg: string;

  constructor(
    x: number,
    y: number,
    char: string,
    fg: string = '#fff',
    bg: string = '#000',
  ) {
    this.x = x;
    this.y = y;
    this.char = char;
    this.fg = fg;
    this.bg = bg;
  }

  move(dx: number, dy: number) {
    this.x += dx;
    this.y += dy;
  }
}
```

Not a lot going on here yet, but it gives us a nice abstraction for getting things on screen. All our entities will
have an `x` and `y` position on the map, a character that is their graphical representation, and a foreground and 
background color to draw that character in. One thing to note is the use of default parameters in the constructor:

```typescript
fg: string = '#fff',
bg: string = '#000',
```

This is a nice shorthand for us to specify default parameters so we don't have to provide them all the time. If we
omit the `fg` or `bg` params, they'll be set to those defaults for us automatically. 

We also have a method that will handle moving our entity:

```typescript
move(dx: number, dy: number) {
  this.x += dx;
  this.y += dy;
}
```

All we're doing here is updating the entity's x and y coordinates based on an amount we wish to move them. That's all we 
need for our simple generic entity. In order to use this let's go make a couple changes to our `main.ts` file. First 
we need to import our new `Entity` class for use:

```typescript
import {Entity} from './entity';
```

Next we'll remove our instance variables for the playerX and playerY positions and add some new variables:

```typescript
player: Entity;
npc: Entity;
entities: Entity[]
```

`player` is obvious here, `npc` is going to be just a dumb character that will sit on screen, but serves to demonstrate
that we can now display more than one entity on screen, and `entities` is an array of entity objects that will hold
all the entities we have in our game at the time. Now that those variables are set up, we need to use them. Replace the
two lines where we set the `playerX` and `playerY` values with the below code:

```typescript
this.player = new Entity(Engine.WIDTH / 2, Engine.HEIGHT / 2, '@');
this.npc = new Entity(Engine.WIDTH / 2 - 5, Engine.HEIGHT / 2, '@', '#ff0');
this.entities = [this.player, this.npc];
```

We're creating our player entity first, setting its position to the center of the screen, and then setting its display
character to '@'. Next we create our new npc entity and offset it to the left 5 columns, set the display character, and
then set the foreground color to yellow. You can see in those lines how the default parameters have shortened what we 
need to provide. The player took on the default white foreground and black background, and the npc has a specified
yellow foreground, but the default black background. Last, we set our array of entities to contain the player and npc.

Another place we need to update is in our update method. Remove the lines where we update the `playerX` and `playerY` 
values and replace with this line:

```typescript
this.player.move(action.dx, action.dy)
```

We're now using our new `move` method on the `Entity` class to move the player by just passing the movement values
from our action. The last place we need to update is in our `render` method. Replace the single line with this code:

```typescript
this.display.draw(
  this.player.x,
  this.player.y,
  this.player.char,
  this.player.fg,
  this.player.bg,
    );
```

This is effectively doing the same thing it was before, but we're pulling all the values that represent our player entity
from the actual instance of the player, instead of hard-coding them here. If you run the game now, it should look identical
to before. But where's our NPC that we created? Well we need to do a little more work before that will show up, but before
we get to that, there's a little more housekeeping we should do, so we have a good clean code base to work on going forward.

### De-Gunking Our Engine

Our `main.ts` file is getting pretty big and doing a lot of stuff. Now we could write our entire application in one file.
Typescript does not prohibit us from doing that, and many a successful game has been written all in one huge file. However,
it is a best practice in software engineering to break your code up into self-contained modules that can be easily understood
and maintained. Our engine class really should be in its own file, so let's start there by creating a `engine.ts` file
and putting the below code into it:

```typescript
import * as ROT from 'rot-js';

import { handleInput, MovementAction } from './input-handler';
import { Entity } from './entity';

export class Engine {
  public static readonly WIDTH = 80;
  public static readonly HEIGHT = 50;

  display: ROT.Display;

  player: Entity;
  entities: Entity[];

  constructor(entities: Entity[], player: Entity) {
    this.entities = entities;
    this.player = player;

    this.display = new ROT.Display({
      width: Engine.WIDTH,
      height: Engine.HEIGHT,
      forceSquareRatio: true,
    });
    const container = this.display.getContainer()!;
    document.body.appendChild(container);

    window.addEventListener('keydown', (event) => {
      this.update(event);
    });

    this.render();
  }

  update(event: KeyboardEvent) {
    this.display.clear();
    const action = handleInput(event);

    if (action instanceof MovementAction) {
      this.player.move(action.dx, action.dy);
    }
    this.render();
  }

  render() {
    this.entities.forEach((e) => {
      this.display.draw(e.x, e.y, e.char, e.fg, e.bg);
    });
  }
}
```

This code is mostly the same from the class we had in `main.ts` so I'll just highlight the key differences:

```typescript
constructor(entities: Entity[], player: Entity) {
  this.entities = entities;
  this.player = player;
```

Our updated constructor is taking in a list of entities and a player entity. Even though the player entity will be 
contained in the list of entities, we want to have a separate variable to track because we know we'll be directly
interacting with the player for movement. 

```typescript
this.display = new ROT.Display({
  width: Engine.WIDTH,
  height: Engine.HEIGHT,
  forceSquareRatio: true,
});
```

We're adding the option of `forceSquareRatio` here because I think it looks a little more roguelike to have that. We could
also download and use our own tileset, but this will work for now and give a nice big blocky look to our console.

```typescript
render() {
  this.entities.forEach((e) => {
    this.display.draw(e.x, e.y, e.char, e.fg, e.bg);
  });
}
```

Here we are looping over all the entities in our list and drawing them to the screen. This will make it so our npc will show
up for us. Everything else here should be the same as what we already had in our `Engine` class. Now let's go back to 
`main.ts` and clean that up. Delete all the code in `main.ts` and replace it with this:

```typescript
import { Entity } from './entity';
import { Engine } from './engine';

declare global {
  interface Window {
    engine: Engine;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const npc = new Entity(Engine.WIDTH / 2 - 5, Engine.HEIGHT / 2, '@', '#ff0');
  const player = new Entity(Engine.WIDTH / 2, Engine.HEIGHT / 2, '@');
  const entities = [npc, player];
  window.engine = new Engine(entities, player);
});
```

Now all we have to do in our `main.ts` file is create our initial entities and then pass them to our engine. This simplifies
the main file as well as making our `engine.ts` file be focused on just the engine. If you run the application now you
should see our player character in white and our npc in yellow. Using the arrow keys should move around just the player
while the npc stands still.

### A Backsplash of Tiles

With our engine cleaned up and refactored, we can now turn to starting on one of the core pieces of a roguelike game:
map generation. We'll get to doing some actual random generation in the next tutorial, but to start off with we need
to create some tiles to use for the map. Create a `tile-types.ts` file and let's start adding some code to it:

```typescript
export interface Graphic {
  char: string;
  fg: string;
  bg: string;
}
```

First we're creating a `Graphic` type that will represent the graphical display of a tile on screen. It's a pretty simple
type that just has 3 strings: the character to display, the foreground color, and the background color. After that type
add this:

```typescript
export interface Tile {
  walkable: boolean;
  transparent: boolean;
  dark: Graphic;
}
```

This `Tile` type is what will hold information about an individual tile on the map. It has two booleans: `walkable` 
to tell whether an entity can pass through the tile or not, and `transparent` to tell whether our line of sight will
pass through it or not. That second one will come into play in later tutorials when we start dealing with field
of view. The last field on this type is `dark` which is an instance of our previous `Graphic` type. For this tutorial
we'll just be using this to display on the screen, but when we start doing FOV work, it will be used to display differently
if the tile is in view of the player or not.

Next up we'll actually create two instances of tiles for use in our map:

```typescript
export const FLOOR_TILE: Tile = {
  walkable: true,
  transparent: true,
  dark: { char: ' ', fg: '#fff', bg: '#323296' },
};

export const WALL_TILE: Tile = {
  walkable: false,
  transparent: false,
  dark: { char: ' ', fg: '#fff', bg: '#000064' },
};
```

Here we're creating a Floor and a Wall tile, with the floor tile being walkable and not blocking vision, whereas the wall
tile cannot be walked on and will block vision. We're using the same space character for both tiles, but with different 
background colors.

### Lost Without a Map

We have tiles, now let's do something with them and make our first map. It's not going to be anything crazy, but it will
demonstrate the two different tile types we've created and show how we move around a map. Create a `game-map.ts` file and
add the below code to it. We'll go over it in detail afterwards.

```typescript
import type { Tile } from './tile-types';
import { FLOOR_TILE, WALL_TILE } from './tile-types';
import { Display } from 'rot-js';

export class GameMap {
  width: number;
  height: number;
  display: Display;

  tiles: Tile[][];

  constructor(width: number, height: number, display: Display) {
    this.width = width;
    this.height = height;
    this.display = display;

    this.tiles = new Array(this.height);
    for (let y = 0; y < this.height; y++) {
      const row = new Array(this.width);
      for (let x = 0; x < this.width; x++) {
        if (x >= 30 && x <= 32 && y === 22) {
          row[x] = { ...WALL_TILE };
        } else {
          row[x] = { ...FLOOR_TILE };
        }
      }
      this.tiles[y] = row;
    }
  }

  isInBounds(x: number, y: number) {
    return 0 <= x && x < this.width && 0 <= y && y < this.height;
  }

  render() {
    for (let y = 0; y < this.tiles.length; y++) {
      const row = this.tiles[y];
      for (let x = 0; x < row.length; x++) {
        const tile = row[x];
        this.display.draw(x, y, tile.dark.char, tile.dark.fg, tile.dark.bg);
      }
    }
  }
}
```

There's a fair amount going on here so let's break it down, piece by piece. Starting with our imports and the class
definition:

```typescript
import type { Tile } from './tile-types';
import { FLOOR_TILE, WALL_TILE } from './tile-types';
import { Display } from 'rot-js';

export class GameMap {
  width: number;
  height: number;
  display: Display;

  tiles: Tile[][];
```

We're importing our `Tile` type to reference, as well as the floor and wall tile instances we created. We're also importing
the `Display` from ROT.js to use in our class as you'll see later. Our `GameMap` class will hold on to the width and height
of the map, as well as a reference to a ROT.js display. Our last instance variable is `tiles` which is an array of arrays
of `Tile` objects. This is a little weird, and is actually not the most efficient method from a memory use perspective,
but it does simplify a bit of code for us. If you were going to get serious about performance in your game though, you 
would use a one-dimensional array and have the tiles all in order there. But we're trying to keep things simple to start
with.

```typescript
constructor(width: number, height: number, display: Display) {
  this.width = width;
  this.height = height;
  this.display = display;

  this.tiles = new Array(this.height);
  for (let y = 0; y < this.height; y++) {
    const row = new Array(this.width);
    for (let x = 0; x < this.width; x++) {
      if (x >= 30 && x <= 32 && y === 22) {
        row[x] = { ...WALL_TILE };
      } else {
        row[x] = { ...FLOOR_TILE };
      }
    }
    this.tiles[y] = row;
  }
}
```

To start in our constructor, we assign the values passed in for width, height, and display. 
We then set our `tiles` variable to a new array with a length of the height of the map. What
this means is that this outer array represents each row in our map, while each array of rows represents individual tiles 
in a column. To populate our map array we start by looping over every row. We then create a new array to represent each
row, that has a length equal to the width of the map. We then loop over every tile in the row and populate it with either 
a wall tile or a floor tile depending on the position. 

One thing to note here is how we use the `...` spread operator on the tiles when we assign them. This effectively creates
a copy in memory of the tile. We're doing this because Typescript by default will pass around objects as references. If
we didn't create these copies then each tile in our map would just point to the single instance of the tile we created
in `tile-types.ts`. If something were to try to change one tile, it would reflect on all of them. This is another instance
of something being memory inefficient, as creating all those copies uses a lot more memory, but again, we're keeping it simple.

```typescript
isInBounds(x: number, y: number) {
  return 0 <= x && x < this.width && 0 <= y && y < this.height;
}
```

This method will take a x and y coordinate and check if it is within bounds of the map. We'll use this when determining
if a player can move to a certain spot or not.

```typescript
render() {
  for (let y = 0; y < this.tiles.length; y++) {
    const row = this.tiles[y];
    for (let x = 0; x < row.length; x++) {
      const tile = row[x];
      this.display.draw(x, y, tile.dark.char, tile.dark.fg, tile.dark.bg);
    }
  }
}
```

Last up in our map is our `render` method. This is pretty simple but one thing to note is how we start our outer loop
with the y-axis instead of the x. It might seem counterintuitive at first. The reason we do this is that as noted earlier,
the outer array of tiles represents each row in the map, so we start by looping over each row, then over the row to get 
each tile. Once we have an individual tile, we draw it to the screen using the information stored in that tile object.

Now we just need to make a few changes in `engine.ts` to utilize this map. Let's start by adding it to our imports:

```typescript
import { GameMap } from './game-map';
```

Then right after we declare the width and height of the screen, let's add a couple static variables for the width and
height of the map:

```typescript
public static readonly MAP_WIDTH = 80;
public static readonly MAP_HEIGHT = 45;
```

After we declare our display instance variable let's add a new variable for our map:

```typescript
gameMap: GameMap;
```

In our constructor, after we append the display container to the document, let's instantiate our new map:

```typescript
this.gameMap = new GameMap(
  Engine.MAP_WIDTH,
  Engine.MAP_HEIGHT,
  this.display,
);
```

In the `update` method we'll make some changes to allow for the player to move on walkable tiles, but not on tiles that
block movement. Again note how we reference y before x in our map.

```typescript
const newX = this.player.x + action.dx;
const newY = this.player.y + action.dy;
if (this.gameMap.tiles[newY][newX].walkable) {
  this.player.move(action.dx, action.dy);
}
```

Last, in our `render` method let's add a new line at the beginning of the method to render our map. We want to render 
the map first so we can draw our entities on top of the map.

```typescript
render() {
  this.gameMap.render();
  this.entities.forEach((e) => {
    this.display.draw(e.x, e.y, e.char, e.fg, e.bg);
  });
}
```

With that we're almost done with this tutorial, but there's one more thing we can do to simplify our code and make things
easier for us in the future.

### A Memorable Performance

Currently our actions return just some blobs of data that our engine that has to decide what to do with it. A better
way to handle this would be to make our actions responsible for carrying out their intentions. That way the engine just
needs to know that an action can be performed, but not the details of how to perform it. This simplifies our engine code
while also allowing for adding new and interesting behaviors in the future. Let's update our `input-handler.ts` file to
this:

```typescript
import { Engine } from './engine';
import { Entity } from './entity';

export interface Action {
  perform: (engine: Engine, entity: Entity) => void;
}

export class MovementAction implements Action {
  dx: number;
  dy: number;

  constructor(dx: number, dy: number) {
    this.dx = dx;
    this.dy = dy;
  }

  perform(engine: Engine, entity: Entity) {
    const destX = entity.x + this.dx;
    const destY = entity.y + this.dy;

    if (!engine.gameMap.isInBounds(destX, destY)) return;
    if (!engine.gameMap.tiles[destY][destX].walkable) return;
    entity.move(this.dx, this.dy);
  }
}

interface MovementMap {
  [key: string]: Action;
}

const MOVE_KEYS: MovementMap = {
  ArrowUp: new MovementAction(0, -1),
  ArrowDown: new MovementAction(0, 1),
  ArrowLeft: new MovementAction(-1, 0),
  ArrowRight: new MovementAction(1, 0),
};

export function handleInput(event: KeyboardEvent): Action {
  return MOVE_KEYS[event.key];
}
```

The first thing to note is the change in our base `Action` interface by adding a `perform` method to it:

```typescript
export interface Action {
  perform: (engine: Engine, entity: Entity) => void;
}
```

This tells Typescript to enforce the rule that whenever we implement this interface, that class *must* provide an 
implementation of this method. This new `perform` method takes in an instance of our engine as well as the entity
the action should be performed on. We'll see how this is implemented in our updated `MovementAction`:

```typescript
export class MovementAction implements Action {
  dx: number;
  dy: number;

  constructor(dx: number, dy: number) {
    this.dx = dx;
    this.dy = dy;
  }

  perform(engine: Engine, entity: Entity) {
    const destX = entity.x + this.dx;
    const destY = entity.y + this.dy;

    if (!engine.gameMap.isInBounds(destX, destY)) return;
    if (!engine.gameMap.tiles[destY][destX].walkable) return;
    entity.move(this.dx, this.dy);
  }
}
```

Here we use the `perform` method to first calculate a new x and y position for the entity. Once we have that, we ask the
map if that position is still within the bounds of the map. If it is in bounds we continue in the method and then check
if the tile at that position is walkable. If the tile is walkable, then we tell the entity to move the desired amount.

With that in place we just need to update `engine.ts` to take advantage of this new capability. We can remove the `MovementAction`
import from the top of the file. Then in our `update` method when we're checking if the action is a `MovementAction` or not,
we can replace that whole if block with this:

```typescript
if (action) {
  action.perform(this, this.player);
}
```

Here we're just checking if the action exists so that we don't try to call a function on an undefined object. If it does
exist, we just call the new `perform` method and let the action do the heavy lifting. This will allow us to do some 
cool things as we add new actions and capabilities in future tutorials. Go ahead and run the application and you should see a nice blue background with three darker blue tiles that your character
can't walk through. 

You can find a complete set of the code for this phase of the tutorial on [my github](https://github.com/bodiddlie/js-rogue-tutorial/tree/part2).
[Click here to go on to Part 3](/rotjs-tutorial/part3)!