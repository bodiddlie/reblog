---
title: 'ROT.js Tutorial Part 4: Field of View'
date: 2022-07-13T08:00:00.000Z
meta:
    title: 'ROT.js Tutorial Part 4: Field of View'
    date: "July 13, 2022"
    description: "In this tutorial we'll be adding functionality to only draw parts of the map that are currently visible to the player or have been previously explored. We'll be calculating the player's field of view to accomplish this and displaying the map in different ways based on that calculation."
---

# {attributes.title}
{attributes.date.toDateString()}

In this tutorial we'll be adding functionality to only draw parts of the map that are currently visible to the player
or have been previously explored. We'll be calculating the player's field of view to accomplish this and displaying
the map in different ways based on that calculation. 

### I Feel Seen

Right now all our tiles are drawn in one shade and are always visible. That's good for validating our dungeon
generation is working properly, but roguelikes aren't supposed to show you the whole map before you've explored it. We
need a way to hide tiles we haven't explored yet and a way to draw ones we have but aren't near anymore in a different
shade. Let's start by adding some extra information to our tiles in `tile-types.ts`:

```typescript
export interface Tile {
  walkable: boolean;
  transparent: boolean;
  visible: boolean;
  seen: boolean;
  dark: Graphic;
  light: Graphic;
}
```

We're adding three new properties to our `Tile` type. `visible` denotes if the tile is currently within the player's
field of view, `seen` tells us if the tile has already been explored by the player, and `light` is the way we will display
the tile when it is within the FOV of the player. `dark` will now be used when the tile has been seen previously, but 
is no longer in the FOV of the player. Let's update our floor and wall tiles to use these new properties:

```typescript
export const FLOOR_TILE: Tile = {
  walkable: true,
  transparent: true,
  visible: false,
  seen: false,
  dark: { char: ' ', fg: '#fff', bg: '#323296' },
  light: { char: ' ', fg: '#fff', bg: '#c8b432' },
};

export const WALL_TILE: Tile = {
  walkable: false,
  transparent: false,
  visible: false,
  seen: false,
  dark: { char: ' ', fg: '#fff', bg: '#000064' },
  light: { char: ' ', fg: '#fff', bg: '#826e32' },
};
```

We set both tile's `visible` and `seen` properties to false as the default, and then set a bright gold color for the
light floor, and a darker gold color for the wall. With those changes in place, we can move on to calculating how to use
them.

### From a Certain Point of View

In order to tell whether a tile is visible to or has been seen by the player, we need to calculate what they can see
at their position on the map. Luckily ROT.js has some handy and easy to use functions to do this for us. We just need
to give the right data to ROT.js, and it will calculate the FOV for us. Let's start at the top of `game-map.ts` and 
bring in a couple new imports:

```typescript
import * as ROT from 'rot-js';
import { Entity } from './entity';
```

We need the ROT.js library for doing the FOV calculations, and we'll reference the `Entity` type in one of our methods, 
so we can get the player's position. While we're at the top of the file here let's clean up `GameMap` class just a bit.
Delete the `width, height, and display` variable declarations at the top of the class, and change the constructor signature
to look like this:

```typescript
constructor(
  public width: number,
  public height: number,
  public display: Display,
) {
```

Also delete the first three lines of the constructor body where we were assigning those variables. This removes a few 
lines of code from this file by using the constructor syntax we saw in the last tutorial. 

The function of ROT.js we'll be using is `PreciseShadowcasting` from the [FOV module](https://ondras.github.io/rot.js/manual/#fov).
We call this function and pass it a function that calculates if a given tile allows light to pass through it or not. The
`PreciseShadowcasting` function then returns an object that we can ask to compute the FOV given that information. When we
ask for the FOV to be computed, we give it a callback function that we can use to then update our map and set which tiles
are visible/seen. Let's start by creating a method to calculate if a tile at a given position lets light pass through it 
or not. After the `addRoom` method add this:

```typescript
lightPasses(x: number, y: number): boolean {
  if (this.isInBounds(x, y)) {
    return this.tiles[y][x].transparent;
  }
  return false;
}
```

In this method we first check if the given coordinates are in bounds or not. We do this because the FOV is calculated with
a given radius from the player. If, for example, the player was at position (5, 5) and our FOV radius was 8, ROT.js would
ask if light passes at (-2, -2) because that would 8 tiles away from (5, 5). However, those indices would be invalid and
cause an error in our application. So we check here to guard against any errors. If the position is within the bounds
of the map, we just return if the tile is marked as transparent or not. 

With that we can add another new method after this one to do the actual FOV calculations for us:

```typescript
updateFov(player: Entity) {
  for (let y = 0; y < this.height; y++) {
    for (let x = 0; x < this.width; x++) {
      this.tiles[y][x].visible = false;
    }
  }

  const fov = new ROT.FOV.PreciseShadowcasting(this.lightPasses.bind(this));
  fov.compute(player.x, player.y, 8, (x, y, _r, visibility) => {
    if (visibility === 1) {
      this.tiles[y][x].visible = true;
      this.tiles[y][x].seen = true;
    }
  });
}
```

Let's break this down into smaller pieces to understand it better.

```typescript
updateFov(player: Entity) {
```

We're taking in the player as a parameter to this method so we can get the current position. 

```typescript
for (let y = 0; y < this.height; y++) {
  for (let x = 0; x < this.width; x++) {
    this.tiles[y][x].visible = false;
  }
}
```

We first loop over all the tiles in the map and set them to **not** be visible. We want to have this reset so we are 
only showing the currently visible tiles on every render. If we didn't do this it would be similar to how our '@' for 
the player kept drawing all over the screen in the first part of this series. We would leave a trail of yellow everywhere
we went. 

```typescript
const fov = new ROT.FOV.PreciseShadowcasting(this.lightPasses.bind(this));
```

We then ask ROT.js to create a FOV computing object for us. We pass the `lightPasses` method to this function, making sure
we bind the method to this instance of our map so it calls the correct function at compute time.

```typescript
fov.compute(player.x, player.y, 8, (x, y, _r, visibility) => {
  if (visibility === 1) {
    this.tiles[y][x].visible = true;
    this.tiles[y][x].seen = true;
  }
});
```

Then we ask our newly created FOV object to actually compute the FOV at the player's current position, with a radius of 
eight tiles. We pass this compute function a callback function that will get called for every tile the algorithm calculates
with. First, note the `_r` parameter: we name this parameter this way because we won't be using it in this callback. This
keeps TypeScript from complaining about an unused variable. Within the call back we check if the `visibility` returned 
from the FOV computation is equal to `1`. If it is we know that it is currently visible to the player and mark the tile 
as such. We can also then mark the tile as seen.

Now we need to do update how we render the map to take advantage of this new information. In our `render` method go 
ahead and get rid of the line where we call `this.display.draw` and replace it with the below code:

```typescript
let char = ' ';
let fg = '#fff';
let bg = '#000';

if (tile.visible) {
  char = tile.light.char;
  fg = tile.light.fg;
  bg = tile.light.bg;
} else if (tile.seen) {
  char = tile.dark.char;
  fg = tile.dark.fg;
  bg = tile.dark.bg;
}

this.display.draw(x, y, char, fg, bg);
```

Here we start by setting up some default values for drawing a tile. These defaults represent an unseen, not visible tile,
so we draw them in pure black. We then check if the given tile is currently visible and if so use the `light` graphic on
the tile. If it isn't visible, but has been previously seen, we use the `dark` graphic on the tile. We then draw the tile
to our display using these values. 

The last thing we need to do in this tutorial is update our `engine.ts` file to tell our map to update the FOV on every
update. We have to do this in two places. First, in the constructor right before we call `this.render()` add a new line:

```typescript
this.gameMap.updateFov(this.player);
this.render()
```

We need to update here because we haven't called our update method yet upon initial rendering. This ensures we actually
have somethign visible on screen when we first load the application. The last place we need to add a call to calculate
the FOV is in our `update` method, again right before we render:

```typescript
this.gameMap.updateFov(this.player);
this.render()
```

If you run the application now, most of the map should be pure back, with a yellow section highlighting where the 
player currently can see. If you move around you notice the places you've already seen are now the shade of blue we 
saw in previous tutorials. You can find the complete code for this tutorial [in the GitHub repo](https://github.com/bodiddlie/js-rogue-tutorial/tree/part4).
Stay tuned for Part 5 later this week!