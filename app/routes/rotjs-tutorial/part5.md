---
title: 'ROT.js Tutorial Part 5: Kicking Enemies and Giving Names'
date: 2022-07-16T08:00:00.000Z
meta:
    title: 'ROT.js Tutorial Part 5: Kicking Enemies and Giving Names'
    date: "July 16, 2022"
    description: "We have a randomly generated dungeon, and we have a player that can move around in that dungeon. However, it's a very empty dungeon without any enemies to run into. In this chapter we'll start adding some enemies in our dungeon. They won't move or be able to be damaged, but that will come soon enough."
---

We have a randomly generated dungeon, and a player that can move around in that dungeon. In this chapter, we'll add enemies to our dungeon. They
won't move or be able to be damaged, but that will come soon enough. 

# {attributes.title}
{attributes.date.toDateString()}

### A Little Housekeeping

We've been creating our entities in `main.ts` and then passing them to our engine. This works for now, but we'll
want to randomly place enemies in our dungeon as we generate it. It wouldn't be a great design to have our dungeon
generation function be dependent on the engine as well, so let's move the handling of entities into our game map. First,
add a new instance variable for holding a list of entities:

```typescript
constructor(
  public width: number,
  public height: number,
  public display: Display,
  public entities: Entity[],
) {
```

Then at the end of the `render` method we'll add some code to draw these entities on the screen:

```typescript
this.entities.forEach((e) => {
  this.display.draw(e.x, e.y, e.char, e.fg, e.bg);
});
```

Since the `GameMap` is now expecting a list of entities, let's go over to `procgen.ts` and update the line in
`generateDungeon` where we create the dungeon:

```typescript
const dungeon = new GameMap(mapWidth, mapHeight, display, [player]);
```

Here we've updated to include a list of entities that includes just the player. Now let's go to `engine.ts` and remove
the code dealing with entities. First remove the instance variable for the list of entities, and then remove them
as a parameter from the constructor:

```typescript
export class Engine {
  // static constants excluded for brevity
  display: ROT.Display;
  gameMap: GameMap;

  player: Entity;

  constructor(player: Entity) {
```

Then in the `render` method, remove the lines dealing with rendering the entities so it looks like this:

```typescript
render() {   
  this.gameMap.render();
}
```

Finally, we can go clean up `main.ts` so that the `DOMContentLoaded` event handler looks like this:

```typescript
window.addEventListener('DOMContentLoaded', () => {
  const player = new Entity(Engine.WIDTH / 2, Engine.HEIGHT / 2, '@');
  window.engine = new Engine(player);
});
```

If you run the application now it should look almost exactly like before these changes. The only thing different should
be the absence of the NPC we used to have on screen. You can see the complete code up to this point [here](https://github.com/bodiddlie/js-rogue-tutorial/tree/part5-1).

### Determining When and Where to Place Our Enemies

Now that our `GameMap` class is set up to handle a list of entities, we can start putting the code in place to randomly
add monsters to our dungeon. First, there's a small bug in our random number generation function. Right now it will never
include the max value we pass, which would be a bigger problem for smaller ranges. So let's update our `generateRandomNumber`
function in `procgen.ts` to look like this:

```typescript
function generateRandomNumber(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}
```

We're now adding 1 inside this function to ensure we are always inclusive of the maximum of our range. 

Let's go over how our monster placement function is going to work. Every time we add a new room to the dungeon, we're
going to pick a random number of monsters to place in that room. For every monster in that random range we'll determine
a random location within the room. Once we have a position determined, we'll do a random check to determine whether 
we'll spawn an orc or a troll at that position. 

In order to facilitate some of this we need to add a new interface type to our `procgen.ts` file and a new getter to 
our `RectangularRoom` class:

```typescript
interface Bounds {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
```

This interface will represent the top-left and bottom-right corners of the room. We could calculate these based off
of the width and height and x/y position of the room, and in fact we'll do that in the getter here shortly, but using
this interface plus the getter makes the code simpler while we do the monster placement. Now we'll add the getter to
the `RectangularRoom` class:

```typescript
get bounds(): Bounds {
  return {
    x1: this.x,
    y1: this.y,
    x2: this.x + this.width,
    y2: this.y + this.height,
  };
}
```

We simply return the x/y position as the top-left and calculate and return the bottom-left position by adding the 
width/height. With that helpful getter in place let's create a new function in `procgen.ts` called `placeEntities`:

```typescript
function placeEntities(
  room: RectangularRoom,
  dungeon: GameMap,
  maxMonsters: number,
) {
}
```

This function will take in a given room, the dungeon the room is being added to, and the maximum number of monsters
to add to the room. Now let's start filling out the body of this function:


```typescript
  const numberOfMonstersToAdd = generateRandomNumber(0, maxMonsters);
```

We start by determining how many monsters we want to add to this room. It will be anywhere from zero to the maximum
number we have passed in.

```typescript
  for (let i = 0; i < numberOfMonstersToAdd; i++) {
    const bounds = room.bounds;
    const x = generateRandomNumber(bounds.x1 + 1, bounds.x2 - 1);
    const y = generateRandomNumber(bounds.y1 + 1, bounds.y2 - 1);
```

Next we loop over that random range of monsters to add, get the bounds of the room we are working in, and pick a 
random x and y position inside that room. Staying inside the for loop, we will add this next bit:

```typescript
    if (!dungeon.entities.some((e) => e.x == x && e.y == y)) {
      if (Math.random() < 0.8) {
        console.log(`We'll be putting an orc at (${x}, ${y})!!!`);
      } else {
        console.log(`We'll be putting an troll at (${x}, ${y})!!!`);
      }
    }
```

The first if statement check is using the `some` method on the list of entities to check if any entities already exist
at this position. If they do, we'll just move on and not add any monsters this time around. If there aren't any monsters
at this position, we generate a random number from 0 to 1. If that number is less than 0.8, we'll add an orc, otherwise
we'll add a troll. For now we'll just print what we want to do to the console in order to get some early feedback.

With our `placeEntities` function ready to go, we just need to make use of it. First let's update the `generateDungeon`
function to take a new parameter:

```typescript
export function generateDungeon(
  mapWidth: number,
  mapHeight: number,
  maxRooms: number,
  minSize: number,
  maxSize: number,
  maxMonsters: number,
  player: Entity,
  display: Display,
): GameMap {
```

We've added a `maxMonsters` parameter so we can tell the dungeon how many monsters we want to possibly add to any room.
Next, inside the `generateDungeon` function, right before we `push` the new room into the list of rooms, let's call our
new `placeEntities` function:

```typescript
placeEntities(newRoom, dungeon, maxMonsters);
```

Last thing to get this bit of code working is to update `engine.ts` to tell our `generateDungeon` function the max number
of monsters. First let's add a new static constant:

```typescript
public static readonly MAX_MONSTERS_PER_ROOM = 2;
```

We'll start with a max of two. This low number made the bug with the random number generation apparent--I noticed
that I was never adding two monsters to any room. 

Now all we have to do is use this new constant when we generate the dungeon:

```typescript
this.gameMap = generateDungeon(
      Engine.MAP_WIDTH,
      Engine.MAP_HEIGHT,
      Engine.MAX_ROOMS,
      Engine.MIN_ROOM_SIZE,
      Engine.MAX_ROOM_SIZE,
      Engine.MAX_MONSTERS_PER_ROOM,
      player,
      this.display,
    );
```

If you run the application now and open the dev tools in your browser, you should see output in there detailing when 
and where we add orcs and trolls. You can find the complete code for this section [here](https://github.com/bodiddlie/js-rogue-tutorial/tree/part5-2).

### Materializing Some Monsters

Now we can get to work actually displaying some monsters on screen! First, let's clean up our `Entity` class a bit.
We can simplify it by using the constructor shorthand we've been using in other places like so:

```typescript
xport class Entity {
  constructor(
    public x: number,
    public y: number,
    public char: string,
    public fg: string = '#fff',
    public bg: string = '#000',
    public name: string = '<Unnamed>',
    public blocksMovement: boolean = false,
  ) {}
```

We also added two new properties to this class: `name` and `blocksMovement`. We'll use `name` for printing some info out,
and we'll use `blocksMovement` in the next section to make it so the player can't move through the monsters.

Next we're going to create some helper functions for spawning specific entities. We'll start by adding a function
for spawning out player entity:

```typescript
export function spawnPlayer(x: number, y: number): Entity {
  return new Entity(x, y, '@', '#fff', '#000', 'Player', true);
}
```

The function takes in an x and y position and then creates a player at that position and returns it. Note that we are
also setting a name and saying that this entity will block movement. Next we'll add a function for spawning an orc:

```typescript
export function spawnOrc(x: number, y: number): Entity {
  return new Entity(x, y, 'o', '#3f7f3f', '#000', 'Orc', true);
}
```

This function is pretty close to the player version, we're just using a different character, foreground color, and name.
The orc still blocks movement. Last will be a function to spawn a troll:

```typescript
export function spawnTroll(x: number, y: number): Entity {
  return new Entity(x, y, 'T', '#007f00', '#000', 'Troll', true);
}
```

Again, just changing the character, foreground, and name. With these helper functions ready, let's start by updating
`main.ts` to use our `spawnPlayer` function instead of directly creating one:

```typescript
import { spawnPlayer } from './entity';
import { Engine } from './engine';

// global interface omitted for brevity

window.addEventListener('DOMContentLoaded', () => {
  window.engine = new Engine(spawnPlayer(Engine.WIDTH / 2, Engine.HEIGHT / 2));
});
```

Lastly, let's go to `procgen.ts` and update it to use our new functions. First we need to add the functions to our
imports:

```typescript
import { Entity, spawnOrc, spawnTroll } from './entity';
```

Then replace the `console.log` statements in `placeEntites` to use those new functions:

```typescript
if (!dungeon.entities.some((e) => e.x == x && e.y == y)) {
  if (Math.random() < 0.8) {
    dungeon.entities.push(spawnOrc(x, y));
  } else {
    dungeon.entities.push(spawnTroll(x, y));
  }
}
```

If you run the application now, you should see all the enemies on screen, even if they are out of our line of sight. We'll
fix that in the next section, but at least you can see that we are randomly adding enemies. Also, if you try to move towards 
them, you'll notice that you can pass right through them. We'll also address that in the next section. You can see
the completed code for this section [here](https://github.com/bodiddlie/js-rogue-tutorial/commits/part5-3).

### Kicking Them When They're Down

We can currently see all the enemies on the entire map. Let's update it so we can only see monsters that are within
our field of view. In `game-map.ts` at the end of the `render` method when we loop over the entities, update it to 
look like this:

```typescript
this.entities.forEach((e) => {
  if (this.tiles[e.y][e.x].visible) {
    this.display.draw(e.x, e.y, e.char, e.fg, e.bg);
  }
});
```

Now we're checking if the position is visible to the player currently before rendering. Run the application and you should
only see monsters within your line of sight. 

While we're in `game-map.ts`, let's add a method to the `GameMap` class that will retrieve an entity from the map that blocks
movement at a given location:

```typescript
getBlockingEntityAtLocation(x: number, y: number): Entity | undefined {
  return this.entities.find(
    (e) => e.blocksMovement && e.x === x && e.y === y,
  );
}
```

This method takes in an x/y position and searches the list of entities for one that is at that position **and** also
blocks movement. Note the return type of the function. This is a **union** type in TypeScript and notes that the function
could return either and `Entity` or `undefined`. We use `undefined` because that is what the `find` Array method returns
if no matching item in an array can be found.

Now we can tackle the task of actually running into the monsters. We currently have our `MovementAction` class to handle
moving around the map. We can leverage the `Action` interface to make some more action types that can do a lot for us. Open
up `input-handler.ts` and add this new class under the `Action` interface:

```typescript
export abstract class ActionWithDirection implements Action {
  constructor(public dx: number, public dy: number) {}

  perform(_engine: Engine, _entity: Entity) {}
}
```

This is an abstract class that we'll use to create a couple new sub-classes from. Abstract classes can implement functionality,
but can't be instantiated directly. Let's update our `MovementAction` to be a sub-class of this new abstract class:

```typescript
export class MovementAction extends ActionWithDirection {
  perform(engine: Engine, entity: Entity) {
    const destX = entity.x + this.dx;
    const destY = entity.y + this.dy;

    if (!engine.gameMap.isInBounds(destX, destY)) return;
    if (!engine.gameMap.tiles[destY][destX].walkable) return;
    if (engine.gameMap.getBlockingEntityAtLocation(destX, destY)) return;
    entity.move(this.dx, this.dy);
  }
}
```

We were able to get rid of the constructor now because that logic resides in the `ActionWithDirection` super class. We've
also added a call to our `getBlockingEntityAtLocation`. This is checking if there is a blocking entity at the destination
location and if so, not allowing us to move there.

Now let's add another new action for actually hitting a monster:

```typescript
export class MeleeAction extends ActionWithDirection {
  perform(engine: Engine, entity: Entity) {
    const destX = entity.x + this.dx;
    const destY = entity.y + this.dy;

    const target = engine.gameMap.getBlockingEntityAtLocation(destX, destY);

    if (!target) return;

    console.log(`You kick the ${target.name}, much to its annoyance!`);
  }
}
```

This action class also inherits from the `ActionWithDirection` super-class. In our `perform` method, we calculate a 
destination much like the `MovementAction`. We then check if there is a target at the destination location. If not, we take
no action. If there is a target, we'll print out some information that we kicked the target. We'll deal some damage
in the next tutorial.

Let's add one more action class to tie this all together:

```typescript
export class BumpAction extends ActionWithDirection {
  perform(engine: Engine, entity: Entity) {
    const destX = entity.x + this.dx;
    const destY = entity.y + this.dy;

    if (engine.gameMap.getBlockingEntityAtLocation(destX, destY)) {
      return new MeleeAction(this.dx, this.dy).perform(engine, entity);
    } else {
      return new MovementAction(this.dx, this.dy).perform(engine, entity);
    }
  }
}
```

This action will check at a destination and see if there is a blocking entity there. If there is, it will create a new
`MeleeAction` and perform that action. If there isn't a blocking entity, it will create a `MovementAction` and perform
the action, moving our player to that location. Go ahead and run the application with your dev tools open. If you try
to move into a tile that a monster is in, you should see messages that you have kicked them. 

One last thing we can add to this before we wrap up this chapter is setting up the game for letting the monsters take 
turns. They won't actually do anything yet, but we'll have a good jumping off point for the next chapter. Back in `game-map.ts`
let's add a new getter to the `GameMap` class:

```typescript
public get nonPlayerEntities(): Entity[] {
  return this.entities.filter((e) => e.name !== 'Player');
}
```

This getter will return the list of entities without the player in it. Let's jump over to `engine.ts` and utilize this
getter by adding a new method to the `Engine` class:

```typescript
handleEnemyTurns() {
  this.gameMap.nonPlayerEntities.forEach((e) => {
    console.log(
      `The ${e.name} wonders when it will get to take a real turn.`,
    );
  });
}
```

This method will get the list of entities without the player and loop over them. For now we'll just print to the console
that they long to have some agency in their lives. To use this method, call it just before we update the FOV in the 
update method:

```typescript
this.handleEnemyTurns();
this.gameMap.updateFov(this.player);
this.render();
```

If you run the game and check the console, you should see output after every turn you take saying that the monsters are
waiting to do something. We'll tackle that in the next chapter. [Click here to see the complete code for this tutorial](https://github.com/bodiddlie/js-rogue-tutorial/commits/part5).