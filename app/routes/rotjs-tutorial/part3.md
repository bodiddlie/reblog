---
title: 'ROT.js Tutorial Part 3: Dungeon Generation'
date: 2022-07-12T08:00:00.000Z
meta:
    title: 'ROT.js Tutorial Part 3: Dungeon Generation'
    date: "July 12, 2022"
    description: "We have a vast plain of blue with 3 wall tiles. That's a start, but it isn't a very interesting map. In this part of the tutorial series we'll make a more interesting world for our player to move around in; consisting of several rooms all connected by hallways. We'll also get to use a not to commonly used feature in modern JavaScript/TypeScript:Generator Functions."
---

# {attributes.title}
{attributes.date.toDateString()}

In this part of the tutorial series we'll make a more interesting world for our player to move around in; consisting of 
several rooms all connected by hallways. We'll also get to use a not too commonly used feature in modern 
JavaScript/TypeScript: Generator Functions. 

*Note: I'm including links to the code at the end of each step of this phase. However, I did find a bug in my initial
implementation of the hallway generation code. We'll fix it at the end of this part, and I'll call out the mistake,
but be sure you pay attention to that section.*

### Get a Room

We have a vast plain of blue with 3 wall tiles. That's a start, but it isn't a very interesting map.
We'll start by modifying the `game-map.ts` file. Previously, we filled the entire map with floor tiles and then placed
three wall tiles just to demonstrate moving around the map. The way we're going to do our procedural generation is
to fill the whole map with wall tiles, and then carve rooms and hallways into that. So let's start by removing the
`FLOOR_TILE` import at the top of the file so the import statement will look like this:

```typescript
import { WALL_TILE } from './tile-types';
```

Next we'll change the loop in the constructor to just fill the whole map with wall tiles:

```typescript
constructor(width: number, height: number, display: Display) {
    this.width = width;
    this.height = height;
    this.display = display;
    this.tiles = new Array(this.height);
    for (let y = 0; y < this.height; y++) {
      const row = new Array(this.width);
      for (let x = 0; x < this.width; x++) {
        row[x] = { ...WALL_TILE };
      }
      this.tiles[y] = row;
    }
}
```

While we could put all our map generation content in here with the map class (and there are valid arguments for doing so),
procedural generation of a map, and the actual functions of an already created map are also two very different concepts.
Because of this, we'll put our procedural generation code in a separate file. Go ahead and create a new `procgen.ts` file.
In this file we'll add a new class that makes dealing with rooms in our map a little easier:

```typescript
class RectangularRoom {
  constructor(
    public x: number,
    public y: number,
    public width: number,
    public height: number,
  ) {}
}
```

I wanted to highlight this constructor in particular to note the shorthand syntax for assigning instance variables. Instead of having
to include a bunch of `this.x = x` and so on in our constructor, we can tell TypeScript to assign them automatically for
us. Very handy.

This class isn't really capable of doing anything other than holding on to four simple data fields, so let's add some
functionality to it. Let's add a couple imports at the top of the file for our tiles and the `Tile` type:

```typescript
import { FLOOR_TILE, WALL_TILE, Tile} from './tile-types';
```

Our room right now can tell us where its top left corner is located on the map, the width and height, and because we have
both of those, the bottom right corner. We also are going to want our room to tell us what tiles go where. Let's start
by adding a new instance variable to hold on to the tiles it has and initialize it in our constructor:

```typescript
class RectangularRoom {
  tiles: Tile[][];
  
  constructor(
    // omitting the existing params to this constructor for brevity
  ) {
    this.tiles = new Array(this.height);
  }
}
```

Our room will have a nested array of tiles just like our map class does. Remember, the outer array is the rows of the 
room, so just like our map class the first array would be indexed using `y` values and then `x` values for the inner
array. 

We have tiles, coordinates, and dimensions. That's all we need to actually build the room, so let's add a method to 
our class to do just that:

```typescript
buildRoom() {
    for (let y = 0; y < this.height; y++) {
      const row = new Array(this.width);
      for (let x = 0; x < this.width; x++) {
        const isWall =
          x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1;
        row[x] = isWall ? { ...WALL_TILE } : { ...FLOOR_TILE };
      }
      this.tiles[y] = row;
    }
}
```

Let's step through this really quick. We start by looping over the height of our room (outer array is rows in the map, remember).
We then create a new row of tiles at the start of each loop over the height. Then we'll loop over the width of each of those
rows. For each tile we create in a row, we first check to see if that tile should be a wall or not. To determine that we
check if the tile is on any of the outside edges of the room. Once we know that, we set the tile to either a floor or 
a wall tile. Let's add a call to this function to our constructor:

```typescript
class RectangularRoom {
  tiles: Tile[][];

  constructor(
    // omitting the existing params to this constructor for brevity
  ) {
    this.tiles = new Array(this.height);
    this.buildRoom();
  }
}
```

It's always good to test our functionality works as we expect it to before moving on to add more to it. We'll start
by just trying to create two rooms and add them to our map. First we need to add some more imports to the top of our
`procgen.ts` file:

```typescript
import { GameMap } from './game-map';
import { Display } from 'rot-js';
```

Our procedural generation function will return a `GameMap` so we need that class, and we need the `Display` type for the
parameter to our generator. Add a new function to the end of our `procgen.ts` file. We'll
be fleshing out this function throughout the rest of this tutorial, but this will let us validate our code thus far.

```typescript
export function generateDungeon(
  width: number,
  height: number,
  display: Display,
): GameMap {
  const dungeon = new GameMap(width, height, display);
  
  const room1 = new RectangularRoom(20, 15, 10, 15);
  const room2 = new RectangularRoom(35, 15, 10, 15);
  
  return dungeon;
}
```

This function takes in the width and height of a map to be created, instantiates a new map object, and creates two rooms
across from each other. We aren't currently doing anything with these rooms though. That's because we need a way to add
the tiles from our room to a map. We could write loops to do that here, but that will be ugly and this generation code
is going to get more complicated over time. To provide this functionality, let's jump over to `game-map.ts` and add
a new method to the `GameMap` class:

```typescript
addRoom(x: number, y: number, roomTiles: Tile[][]) {
  for (let curY = y; curY < y + roomTiles.length; curY++) {
    const mapRow = this.tiles[curY];
    const roomRow = roomTiles[curY - y];
    for (let curX = x; curX < x + roomRow.length; curX++) {
      mapRow[curX] = roomRow[curX - x];
    }
  }
}
```

It's a small method, but there's a lot happening here so let's break it down:

```typescript
addRoom(x: number, y: number, roomTiles: Tile[][]) {
```

The method takes in an x and y coordinate that the room is to be placed on the map, as well as a nested array of tiles.
These are all the tiles for the room that we'll be adding to the map.

```typescript
for (let curY = y; curY < y + roomTiles.length; curY++) {
  const mapRow = this.tiles[curY];
```

We're going to loop over the height of the room much like we have in other examples, but the difference here is we start
at the y position of the room instead of at 0. This way we are always dealing with coordinates relative to our position
in the map, not in the room. For example if our room is at (10, 10) on the map, the top left corner of the room would be
at (0, 0) in the array of tiles, but it would be at (10, 10) in the total map. We want to make sure we add the room to the 
right place in the map, and looping this way does that for us. Our first step in that loop is then to get the row from the 
map. This would represent the entire row of tiles for the map at the given y position.

```typescript
const roomRow = roomTiles[curY - y];
```

Next we need to get the row from our room that we want to add. Because our `curY` is relative to the entire map, we need
to translate to being relative to just the room. To do that we subtract the y position from `curY` to get the translated
position. Using the above example of a room at (10, 10): if we are on the fifth row of the room, we'll be at `y = 15` on
the map. To get the proper row of the room we'll subtract the y position from the map row `15 - 10` and then we'll be able
to get the fifth row from our room tiles array.

```typescript
for (let curX = x; curX < x + roomRow.length; curX++) {
  mapRow[curX] = roomRow[curX - x];
}
```

We then loop over all the tiles of the room, again using a relative position to the map. Inside that loop we set the map
tile equal to tile from the room at that position.

Now that we can add rooms to our map, we can go back to the `procgen.ts` file and add our two rooms:


```typescript
export function generateDungeon(
  width: number,
  height: number,
  display: Display,
): GameMap {
  const dungeon = new GameMap(width, height, display);

  const room1 = new RectangularRoom(20, 15, 10, 15);
  const room2 = new RectangularRoom(35, 15, 10, 15);

  dungeon.addRoom(room1.x, room1.y, room1.tiles);
  dungeon.addRoom(room2.x, room2.y, room2.tiles);
  
  return dungeon;
}
```

The last thing we need to do is tell our engine to use our new generation function. Import the `generateDungeon` function
at the top of `engine.ts`

```typescript
import { generateDungeon } from './procgen';
```

Then instead of instantiating a `GameMap` in our engine constructor, we'll use our new `generateDungeon` function:

```typescript
this.gameMap = generateDungeon(
  Engine.MAP_WIDTH,
  Engine.MAP_HEIGHT,
  this.display
);
```

If you run the application now you should see our two rooms on the screen. Making progress! You can see the code thus far
[here](https://github.com/bodiddlie/js-rogue-tutorial/tree/part3-1)

### Making a Connection

Having two rooms but not being able to move between them seems kind of silly. Let's add a hallway to connect the
rooms. All the code to do this is will reside in `procgen.ts`. We'll start by adding a helper to our `RectangularRoom`
class:

```typescript
public get center(): [number, number] {
  const centerX = this.x + Math.floor(this.width / 2);
  const centerY = this.y + Math.floor(this.height / 2);
  return [centerX, centerY];
}
```

This method will calculate the center coordinates of the room and return them as a tuple. This looks like an array, and
functionally kind of is under the hood, but it adds some extra type safety that a regular JavaScript array doesn't. 
Specifically, this return type must be a tuple with exactly two elements that must be of type `number`. If we tried
to return more or less than two elements in the tuple, TypeScript would complain. This type checking can help us
avoid hard to find bugs in the future.

In order to connect our rooms we are going to start at the center of one room and lay floor tiles until we connect to the
center of the other room. We do this by randomly choosing between starting in a horizontal or vertical direction, moving
towards the other room in that direction until we match position on one axis, then switching to the other direction and
moving towards the room until we hit the center. 

We could loop through this process and add tiles to the map as we build rooms, but again, that code will get messier and 
messier as we add to it, and our code should be readable and maintainable. What we need is some kind of function that will
return all the places we need to add our hallway floor tiles so that we can then iterate over those. Luckily modern JavaScript
and TypeScript provide just such a construct: generator functions.

Generator functions are functions which allow us to `yield` a value from them in the middle of execution, while still allowing
for further processing in the function. This enables us to use a generator function to build our list of hallway tiles.

*Note: Generator functions are a pretty complicated, and advanced topic that explaining would be way outside the scope
of this tutorial. I recommend reading [this article](https://javascript.info/generators) on generators to get a better
understanding. Also, while a great fit for this use case, generators introduce a lot of extra complexity and, in my 
opinion, aren't usually worth the tradeoff. Be careful when adding them to your code base.*

Here's our generator function with a bunch of comments embedded to explain:

```typescript
function* connectRooms(
  a: RectangularRoom,
  b: RectangularRoom,
): Generator<[number, number], void, void> {
  // set the start point of our tunnel at the center of the first room
  let current = a.center;
  // set the end point at the center of the second room
  const end = b.center;

  // flip a coin to see if we go horizontally first or vertically
  let horizontal = Math.random() < 0.5;

  // we'll loop until our current is the same as the end point
  while (current[0] !== end[0] || current[1] !== end[1]) {
    if (horizontal) {
      // are we tunneling left or right?
      const direction = Math.sign(end[0] - current[0]);
      // if direction is 0 we have hit the destination in one direction
      if (direction !== 0) {
        current[0] += direction;
        yield current;
      }
      // we've finsihed in this direction so switch to vertical
      horizontal = false;
    } else {
      const direction = Math.sign(end[1] - current[1]);
      // if direction is 0 we have hit the destination in one direction
      if (direction !== 0) {
        current[1] += direction;
        yield current;
      }
      // we've finsihed in this direction so switch to horizontal
      horizontal = true;
    }
  }
}
```

The important thing to understand here is that every time we `yield` in this function it is essentially adding a new
(x,y) coordinate to a list of sorts that we can use to loop over and add to our map. Let's see how we use this function in our
`generateDungeon` function. After we add the rooms to our map, add this code:

```typescript
for (let tile of connectRooms(room1, room2)) {
  dungeon.tiles[tile[1]][tile[0]] = { ...FLOOR_TILE };
}
```

Here we are looping over each coordinate pair that comes back from our generator. The `for...of` loop construct will pull each
pair that was yielded out of the generator and assign it to the `tile` variable. Then we just need to use
that variable to index into our map's tiles and set the map to have a floor tile there. Go ahead and run the application,
and you should see a nice hallway connecting the two rooms now and can move the player between them. You can see the code
up to this point [here](https://github.com/bodiddlie/js-rogue-tutorial/tree/part3-2).

### Oopsie-Daisie

While it looks like this working properly, there is a bug with our hallway code. I didn't notice it until actually completing
the full generation code for this part, so it exists in the above link to my GitHub. But I thought it would be better
to illustrate it and fix it now, rather than mix it in with the discussion of completing our dungeon. It also serves as 
good example of why we should make sure we test all our code paths. 

With what we have so far, we have two rooms that are directly across from each other. It looks like the hallway is connected
just fine, so what's the issue? Well, since the rooms are right next to each other like this, the hallway only has to go one
direction. So it really just has to draw a single straight line across from room one to room two. To show off the problem,
change the y coordinate of room one to be 30 instead of 15. See how instead of having a nice clean "L" shaped hallway,
we have this haphazard zig-zag? That's the bug. Thankfully the fix is simple. Open up `procgen.ts` and we'll change some 
code in our `connectRooms` generator. Specifically find the two if statements where we check if we reached our destination,
and we'll add and else block to each:

```typescript
  if (horizontal) {
    // are we tunneling left or right?
    const direction = Math.sign(end[0] - current[0]);
    // if direction is 0 we have hit the destination in one direction
    if (direction !== 0) {
      current[0] += direction;
      yield current;
    } else { // <---- this else block is new
      // we've finished in this direction so switch to vertical
      horizontal = false;
      yield current;
    }
  } else {
    const direction = Math.sign(end[1] - current[1]);
    // if direction is 0 we have hit the destination in one direction
    if (direction !== 0) {
      current[1] += direction;
      yield current;
    } else { // <---- this else block is new
      // we've finished in this direction so switch to horizontal
      horizontal = true;
      yield current;
    }
  }
}
}
```

We've added two else blocks after checking if we've reached our destination. What was happening before is we would **not**
be at our destination, increase the position of `current`, yield that position, and then would immediately leave that
if statement and switch directions. This caused us to zig-zag towards our destination instead of making a nice clean "L"
shape. These new else statements will only change the direction if we haven't made it there yet. We also yield in those 
cases as it could end up in a broken corner when we make the turn of our "L". 

You might also notice that a lot of this code is very similar, and you'd be right. Let's take this opportunity to refactor
this code to be more concise and readable. Here's our new version:

```typescript
function* connectRooms(
  a: RectangularRoom,
  b: RectangularRoom,
): Generator<[number, number], void, void> {
  // set the start point of our tunnel at the center of the first room
  let current = a.center;
  // set the end point at the center of the second room
  const end = b.center;

  // flip a coin to see if we go horizontally first or vertically
  let horizontal = Math.random() < 0.5;
  // set our axisIndex to 0 (x axis) if horizontal or 1 (y axis) if vertical
  let axisIndex = horizontal ? 0 : 1;

  // we'll loop until our current is the same as the end point
  while (current[0] !== end[0] || current[1] !== end[1]) {
    //are we tunneling in the positive or negative direction?

    // if direction is 0 we have hit the destination in one direction
    const direction = Math.sign(end[axisIndex] - current[axisIndex]);
    if (direction !== 0) {
      current[axisIndex] += direction;
      yield current;
    } else {
      // we've finished in this direction so switch to the other
      axisIndex = axisIndex === 0 ? 1 : 0;
      yield current;
    }
  }
}
```

We're doing the same stuff, but we no longer need two big else blocks that are pretty much identical. The only thing
that was changing was whether we were looking at the x or y-axis. So we now track that at the top of the function
and our `while` loop becomes much smaller and easier to read about and understand.

### Generation (X, Y)

We've got rooms, we've got hallways, and we've cleaned up and fixed our bug. It's finally time to build out our 
dungeon! We'll stay in `procgen.ts` for now while we finish up our dungeon generation code. Let's start by adding
a simple utility function to generate a random number for our position:

```typescript
function generateRandomNumber(min: number, max: number) {
  return Math.floor(Math.random() * (max - min) + min);
}
```

This is just a simple function to take in a minimum and maximum value and then generate a number somewhere between those. We'll
use this to determine a random position for all our rooms. Next we'll add one more method to our `RectangularRoom` class:

```typescript
intersects(other: RectangularRoom): boolean {
  return (
    this.x <= other.x + other.width &&
    this.x + this.width >= other.x &&
    this.y <= other.y + other.height &&
    this.y + this.width >= other.y
  );
}
```

This method will take in another room and see if any point of these two rooms intersect. We'll use this to ensure we don't
place a room on top of an already existing room. Now we can flesh out our `generateDungeon` function some more. We'll
start by adding an import at the top of the file. We need the `Entity` type as our generation function will also be
determining a random starting location for our player:

```typescript
import { Entity } from './entity';
```

Now let's update the signature for our `generateDungeon` function to take in some extra parameters:

```typescript
export function generateDungeon(
  mapWidth: number,
  mapHeight: number,
  maxRooms: number,
  minSize: number,
  maxSize: number,
  player: Entity,
  display: Display,
): GameMap {
```

We've renamed our width and height to be more clear that it's the width and height of the whole map. We're also adding
variables to track the maximum number of rooms we'll allow on any map, the minimum and maximum size of any room, and 
the player entity. 

We can delete everything in the function between when we instantiate the dungeon variable and then return it. In its
place let's start adding some code:

```typescript
const rooms: RectangularRoom[] = [];
```

We'll need this array to hold all our rooms that we'll be creating, so we can connect them later. Now we can loop over
our max room count and start creating rooms:

```typescript
for (let count = 0; count < maxRooms; count++) {
    const width = generateRandomNumber(minSize, maxSize);
    const height = generateRandomNumber(minSize, maxSize);

    const x = generateRandomNumber(0, mapWidth - width - 1);
    const y = generateRandomNumber(0, mapHeight - height - 1);

    const newRoom = new RectangularRoom(x, y, width, height);

    if (rooms.some((r) => r.intersects(newRoom))) {
      continue;
    }

    dungeon.addRoom(x, y, newRoom.tiles);

    rooms.push(newRoom);
}
```

Here we loop over the max number of rooms we could add, and generate a random width, height, x, and y position for a 
new room. We create that new room, and then check if it intersects with any existing rooms already in our array. If it
does, we just move on to the next iteration of our loop. If it doesn't intersect, we add it to the dungeon, and then add
it to our array. Now we have all our rooms, we can pick a starting location for the player:

```typescript
const startPoint = rooms[0].center;
player.x = startPoint[0];
player.y = startPoint[1];
```

We'll just use the first room we made as our starting position and put the player at the center of that room. The last thing 
we need to do is connect all the rooms with hallways:

```typescript
  for (let index = 0; index < rooms.length - 1; index++) {
  const first = rooms[index];
  const second = rooms[index + 1];

  for (let tile of connectRooms(first, second)) {
    dungeon.tiles[tile[1]][tile[0]] = { ...FLOOR_TILE };
  }
}
```

We loop over all our rooms connecting each one to the next room in the list. If you go ahead and run the application
now you should have a randomly generated dungeon! This is an admittedly simple algorithm for connecting the rooms, and
it leads to intersecting and overlapping hallways, but it gets the job done. You can find the finished code for this 
part [here](https://github.com/bodiddlie/js-rogue-tutorial/tree/part3), and [click here for Part 4](/rotjs-tutorial/part4)!