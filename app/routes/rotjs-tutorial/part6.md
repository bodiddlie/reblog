---
title: 'ROT.js Tutorial Part 6: Dealing and Taking Damage'
date: 2022-07-20T08:00:00.000Z
meta:
    title: 'ROT.js Tutorial Part 6: Dealing and Taking Damage'
    date: "July 20, 2022"
    description: "Previously, we added some monsters to our dungeon, but just stand around lifeless. In this chapter, we'll bring them to life. We'll make it so the monsters follow us once we enter their line of sight. Then we'll add the ability for them to damage our player as well as for our player to damage them. Finally, we'll update the game so that dealing enough damage will kill an entity."
---

# {attributes.title}
{attributes.date.toDateString()}

Previously, we added some monsters to our dungeon, but they just stand around lifeless. In this chapter, we'll bring them to
life. We'll make it so the monsters follow us once we enter their line of sight. Then we'll add the ability for them
to damage our player as well as for our player to damage them. Finally, we'll update the game so that dealing enough
damage will kill an entity. 

### Refactor

Before we jump in to the additions, we can make a few small refactors that will make our code a little clearer and more
maintainable in the future. Currently, all our actions take in a `Engine` parameter as part of the `perform` method. This
isn't necessary as we have added our engine to the global `window` object in `main.ts`. Open up `input-handler.ts` and
let's start by changing the base `Action` interface:

```typescript
export interface Action {
  perform: (entity: Entity) => void;
}
```

Next we can simplify the constructor in the `ActionWithDirection` abstract class:

```typescript
perform(_entity: Entity) {} 
```

We removed the engine parameter as well as the body of the method. We don't need the `throw` statement due to this class
being marked as `abstract`, meaning it cannot be directly instantiated. Because of that, the error logic is superfluous.

Next let's update the `perform` method on our `MovementAction` class:

```typescript
export class MovementAction extends ActionWithDirection {
  perform(entity: Entity) {
    const destX = entity.x + this.dx;
    const destY = entity.y + this.dy;

    if (!window.engine.gameMap.isInBounds(destX, destY)) return;
    if (!window.engine.gameMap.tiles[destY][destX].walkable) return;
    if (window.engine.gameMap.getBlockingEntityAtLocation(destX, destY)) return;
    entity.move(this.dx, this.dy);
  }
}
```

Again, we remove the engine parameter. We can then reference the engine using `window.engine` anywhere we need to. Let's
update our `BumpAction` and `MeleeAction` classes similarly:

```typescript
export class BumpAction extends ActionWithDirection {
  perform(entity: Entity) {
    const destX = entity.x + this.dx;
    const destY = entity.y + this.dy;

    if (window.engine.gameMap.getBlockingEntityAtLocation(destX, destY)) {
      return new MeleeAction(this.dx, this.dy).perform(entity);
    } else {
      return new MovementAction(this.dx, this.dy).perform(entity);
    }
  }
}

export class MeleeAction extends ActionWithDirection {
  perform(entity: Entity) {
    const destX = entity.x + this.dx;
    const destY = entity.y + this.dy;

    const target = window.engine.gameMap.getBlockingEntityAtLocation(
      destX,
      destY,
    );

    if (!target) return;

    console.log(`You kick the ${target.name}, much to its annoyance!`);
  }
}
```

With those updates in place we just need to fix the call in the `update` method in `engine.ts` where we perform actions
to not pass the engine:

```typescript
update(event: KeyboardEvent) {
    this.display.clear();
    const action = handleInput(event);

    if (action) {
      action.perform(this.player);
    }

    ...
```

The complete code for this section can be found [here](https://github.com/bodiddlie/js-rogue-tutorial/tree/part6-1).

Now that we've done some housekeeping we can move on to some more exciting work.

### The Chase is On

We want our monsters to move around, take damage
from the player, and be able to deal damage back. To do all of that, we'll be introducing a simple object composition
pattern to our code. Composition is an object-oriented pattern whereby you check if a certain objects **has a** behaviour
instead of **is a** certain type. In our prior chapters we've been using inheritance, which is an example of a **is a**
pattern (e.g. `MovementAction` is a `ActionWithDirection`). The nice thing about using composition is you can build a lot 
of interesting behaviours from many small classes. Doing the same with inheritance can lead to large and hard to understand
inheritance trees where A is a subclass of B which is a subclass of C which  is a subclass of D, and so on. 

Let's start by creating a new directory called `components`. In that directory create a new file called `base-component.ts` 
and a simple `BaseComponent` interface inside that file:

```typescript
import { Entity } from '../entity';

export interface BaseComponent {
  entity: Entity | null;
}
```

Our `BaseComponent` interface is just ensuring that it will have a reference to the entity on which the component is added.
This will make things easier when we have to have an entity take some action based on getting attacked for instance.

Now let's create a component to represent the physicality of an entity. Create a `figther.ts` file in the components 
directory:

```typescript
import { BaseComponent } from './base-component';
import { Entity } from '../entity';

export class Fighter implements BaseComponent {
  entity: Entity | null;
  _hp: number;

  constructor(
    public maxHp: number,
    public defense: number,
    public power: number,
  ) {
    this._hp = maxHp;
    this.entity = null;
  }

  public get hp(): number {
    return this._hp;
  }

  public set hp(value: number) {
    this._hp = Math.max(0, Math.min(value, this.maxHp));
  }
}
```

The interesting part of this class is how we are using the `set` keyword in TypeScript. Here we are creating a `setter`
for the `hp` property. We have a `_hp` property that actually stores the value of the current HP, but access and update
that value via the `get` and `set` functions. This way, in the setter, we can enforce that the hp never goes above the max,
or below zero. 

Next we want to give our monsters the ability to follow and attack the player. Game AI is a topic unto itself, and any
serious discussion of it is way outside of the scope of these tutorials. We'll create some simple  AI that will
move directly towards the player if in sight, and attack if in range. To start this, add a new file called `ai.ts` to 
the components directory and add the below code to it:

```typescript
import * as ROT from 'rot-js';

import {
  Action,
  MeleeAction,
  MovementAction,
  WaitAction,
} from '../input-handler';
import { Entity } from '../entity';

export abstract class BaseAI implements Action {
  path: [number, number][];

  constructor() {
    this.path = [];
  }

  perform(_entity: Entity) {}

  /**
   * Compute and return a path to the target position.
   *
   * If there is no valid path then return an empty list.
   *
   * @param destX
   * @param destY
   * @param entity
   */
  calculatePathTo(destX: number, destY: number, entity: Entity) {
    const isPassable = (x: number, y: number) =>
      window.engine.gameMap.tiles[y][x].walkable;
    const dijkstra = new ROT.Path.Dijkstra(destX, destY, isPassable, {});

    this.path = [];

    dijkstra.compute(entity.x, entity.y, (x: number, y: number) => {
      this.path.push([x, y]);
    });
    this.path.shift();
  }
}
```

Our `BaseAI` class is an abstract class that we'll inherit from in the next section. It implements the `Action` interface
because we want our AI to `perform` an action when it needs to. It has an instance variable called `path` that will hold
a path from one location to another as a list of `[number, number]` tuples. The meat of this class is in the `calculatePathTo`
method. Let's break that one down to understand it:

```typescript
calculatePathTo(destX: number, destY: number, entity: Entity) {
```

This method takes in a destination location, and the entity that is going to move towards that destination.

```typescript
const isPassable = (x: number, y: number) =>
  window.engine.gameMap.tiles[y][x].walkable;
```

In order to calculate a path to that destination, we need to tell our path finding algorithm whether a given tile can be
walked on or not. This is a simple lambda function that just checks the current map to see if the tile at a location
can be walked on.

```typescript
const dijkstra = new ROT.Path.Dijkstra(destX, destY, isPassable, {});
```

We'll be using the `Dijkstra` algorithm for finding the shortest path from our entity to its target. ROT.js also provides
an A* implementation for pathfinding. Both have similar apis. I just chose Dijkstra because it was listed first in the
docs. To use the algorithm, we have to first create a `Dijkstra` instance. We give it the destination location, our
`isPassable` lambda, and a set of options that control which directions the algorithm can move in. We'll stick with the 
default which is eight directions (four cardinal, and four diagonal). 

```typescript
this.path = [];

dijkstra.compute(entity.x, entity.y, (x: number, y: number) => {
  this.path.push([x, y]);
});
this.path.shift();
```

We then create a new array to store the path as a list of tuples. The `compute` method on the Dijkstra algorithm takes in
the start location, and a callback function. This callback will be called for every point on the path that gets calculated.
We store each point in our `path` array. Once the computation is done we call `shift` on our path array. `shift` will remove
the first element from an array. We need to do this because the path calculation adds the starting point. If we didn't, 
the monsters would still stay in one place, because when they go to move to the next spot on the path, it would just be
where they were already standing.

`BaseAI` is an abstract class, so let's create a concrete class that inherits from it that we can use to power our 
monsters. In the same `ai.ts` file add this new class below `BaseAI`:

```typescript
export class HostileEnemy extends BaseAI {
  constructor() {
    super();
  }

  perform(entity: Entity) {
    const target = window.engine.player;
    const dx = target.x - entity.x;
    const dy = target.y - entity.y;
    const distance = Math.max(Math.abs(dx), Math.abs(dy));

    if (window.engine.gameMap.tiles[entity.y][entity.x].visible) {
      if (distance <= 1) {
        return new MeleeAction(dx, dy).perform(entity);
      }
      this.calculatePathTo(target.x, target.y, entity);
    }

    if (this.path.length > 0) {
      const [destX, destY] = this.path[0];
      this.path.shift();
      return new MovementAction(destX - entity.x, destY - entity.y).perform(
        entity,
      );
    }

    return new WaitAction().perform(entity);
  }
}
```

Our `HostileEnemy` class will use the `BaseAI` class to "think" for our monsters. Everything happens in the `perform` method
so let's break that down:

```typescript
perform(entity: Entity) {
  const target = window.engine.player;
  const dx = target.x - entity.x;
  const dy = target.y - entity.y;
  const distance = Math.max(Math.abs(dx), Math.abs(dy));
```

We start by defining our target as the player. A more sophisticated AI would allow for targeting all kinds of different
entities, but we'll keep it simple and just have the monsters being focused on the player alone. We then calculate the
x and y distance from monster to the target. Then we use those values to calculate the total distance using a [Chebyshev distance](https://en.wikipedia.org/wiki/Chebyshev_distance)
calculation. Think of it like calculating how many chess squares away our target is if we could move in any direction. 

```typescript
if (window.engine.gameMap.tiles[entity.y][entity.x].visible) {
  if (distance <= 1) {
    return new MeleeAction(dx, dy).perform(entity);
  }
  this.calculatePathTo(target.x, target.y, entity);
}
```

Next we check if the tile the monster is in is currently visible to the player. If it isn't, we'll move on to our next step.
If it isn't currently in the player's FOV, then the monster can also see it, and we'll take one of
two actions. If the monster is within melee range of the target it will perform a new `MeleeAction`. If it isn't in range yet,
it will use the `calculatePathTo` method from the `BaseAI` to get the shortest path to the target.

```typescript
if (this.path.length > 0) {
  const [destX, destY] = this.path[0];
  this.path.shift();
  return new MovementAction(destX - entity.x, destY - entity.y).perform(
    entity,
  );
}

return new WaitAction().perform(entity);
```

Here we check if the monster has a calculated path or not. If it does, we'll pull the next value off the front of the array,
and perform a new `MovementAction` towards that spot. Last, if the monster isn't visible to the player and doesn't have
a path to follow, it will just wait for the next turn. Let's jump over to `input-handler.ts` and implement this new
`WaitAction` really quick:

```typescript
export class WaitAction implements Action {
  perform(_entity: Entity) {}
}
```

This is just a simple no-op action that allows us to wait for the next turn.

Now we just need to get our monsters to use this AI. We could add this directly to the `Entity` class, but we'll have
on-screen entities like items that don't need to think or "act". What we'll do is introduce a new subclass of Entity
called `Actor`. Open up `entity.ts` and let's first add some imports to the top:

```typescript
import { BaseAI, HostileEnemy } from './components/ai';
import { Fighter } from './components/fighter';
```

Now let's create our new `Actor` class below the `Entity` class:

```typescript
export class Actor extends Entity {
  constructor(
    public x: number,
    public y: number,
    public char: string,
    public fg: string = '#fff',
    public bg: string = '#000',
    public name: string = '<Unnamed>',
    public ai: BaseAI | null,
    public fighter: Fighter,
  ) {
    super(x, y, char, fg, bg, name, true);
    this.fighter.entity = this;
  }

  public get isAlive(): boolean {
    return !!this.ai || window.engine.player === this;
  }
}
```

This class is fairly similar to the `Entity` class with the big difference being the addition of the `ai` and `fighter`
properties. Note the union type on the `ai` property. This is because our player will also be an Actor, but won't have
any AI associated with it. In the constructor we set the `fighter.entity` property equal to the actor being created so
the fighter component will be able to interact with it as needed. The last thing we have here is a `isAlive` getter
that checks if there is a current AI on the Actor or if it is the player. We'll use this later in the chapter.

Now that we have an `Actor` class, let's change our spawn functions to use that instead of `Entity`. Update the spawn
functions as below:

```typescript
export function spawnPlayer(x: number, y: number): Actor {
  return new Actor(
    x,
    y,
    '@',
    '#fff',
    '#000',
    'Player',
    null,
    new Fighter(30, 2, 5),
  );
}

export function spawnOrc(x: number, y: number): Entity {
  return new Actor(
    x,
    y,
    'o',
    '#3f7f3f',
    '#000',
    'Orc',
    new HostileEnemy(),
    new Fighter(10, 0, 3),
  );
}

export function spawnTroll(x: number, y: number): Entity {
  return new Actor(
    x,
    y,
    'T',
    '#007f00',
    '#000',
    'Troll',
    new HostileEnemy(),
    new Fighter(16, 1, 4),
  );
}
```

All our Actors now have fighter components to determine their health, defense, and attack power, as well as AI for the 
monsters. Let's go to the `engine.ts` file and update the `handleEnemyTurns` method to put this to use:

```typescript
handleEnemyTurns() {
  this.gameMap.actors.forEach((e) => {
    if (e.isAlive) {
      e.ai?.perform(e);
    }
  });
}
```

We loop over all the actors, check if they are alive or not, and then perform their AI action. Note the `e.ai?.perform`
syntax with the question mark. This is called an optional chaining operator, or more playfully, the Elvis operator. It
first checks if the reference on the left side of the operator is defined or not, and then will try to dereference the
property on the right-hand side. Since the `ai` property could be null, we use this to avoid any errors try to access
a property on a null object. 

The last thing we need to do to get these monsters thinking for themselves is to add a new getter to the `GameMap` class
for getting the list of actors out of the list of entities. First import our `Actor` class at the top of `game-map.ts`,
and then add this getter to the class:

```typescript
public get actors(): Actor[] {
  return this.entities
    .filter((e) => e instanceof Actor)
    .map((e) => e as Actor)
    .filter((a) => a.isAlive);
}
```

Here we first filter the list of entities to ones that are Actors, map over that filtered list to convert them
all to be represented as `Actor`s instead of just `Entity`s, and finally filter those actors to one's that are alive.

Run the game and move around. As you encounter monsters they should move towards you. You still can't damage though, nor
them you. We'll fix that next. Find the complete code for this section [here](https://github.com/bodiddlie/js-rogue-tutorial/tree/part6-2).

### Look Upon Thy Death

It's almost time to start dishing out damage, but before we do that, we need to address the fact that our monsters
have an unfair advantage over our player. If you pay attention when the monsters move around, they can move diagonally
towards the player, while the player can only move in the four cardinal directions. Let's open up `input-handler.ts` and
update the `MOVE_KEYS` map to give us some more control options:

```typescript
const MOVE_KEYS: MovementMap = {
  // Arrow Keys
  ArrowUp: new BumpAction(0, -1),
  ArrowDown: new BumpAction(0, 1),
  ArrowLeft: new BumpAction(-1, 0),
  ArrowRight: new BumpAction(1, 0),
  Home: new BumpAction(-1, -1),
  End: new BumpAction(-1, 1),
  PageUp: new BumpAction(1, -1),
  PageDown: new BumpAction(1, 1),
  // Numpad Keys
  1: new BumpAction(-1, 1),
  2: new BumpAction(0, 1),
  3: new BumpAction(1, 1),
  4: new BumpAction(-1, 0),
  6: new BumpAction(1, 0),
  7: new BumpAction(-1, -1),
  8: new BumpAction(0, -1),
  9: new BumpAction(1, -1),
  // Vi keys
  h: new BumpAction(-1, 0),
  j: new BumpAction(0, 1),
  k: new BumpAction(0, -1),
  l: new BumpAction(1, 0),
  y: new BumpAction(-1, -1),
  u: new BumpAction(1, -1),
  b: new BumpAction(-1, 1),
  n: new BumpAction(1, 1),
  // Wait keys
  5: new WaitAction(),
  Period: new WaitAction(),
};
```

Here we've added a bunch of new ways to move around the map: using arrow keys plus home/end/page up/page down keys, the numpad,
and even Vi keys for Linux nerds like me. We also added the ability to hit either 5 on the numpad or period to just wait
for a turn. This can be a big strategic advantage to hold the ground against a monster and let them come to the player. 

Back in `game-map.ts` let's add a new method for getting an `Actor` at a given location:

```typescript
getActorAtLocation(x: number, y: number): Actor | undefined {
  return this.actors.find((a) => a.x === x && a.y === y);
}
```

This method will use our `actors` getter and see if there are any actors at the given x/y coordinates. Go back to `input-handler.ts`
and update the if statement in the `BumpAction` to use this new method:

```typescript
if (window.engine.gameMap.getActorAtLocation(destX, destY)) {
  return new MeleeAction(this.dx, this.dy).perform(entity as Actor);
} else {
  return new MovementAction(this.dx, this.dy).perform(entity);
}
```

We do this because we only want to perform a melee attack on an actor. We also cast the entity to an `Actor` when we
perform the `MeleeAction` so that the action has access to the fighter component. Because we're referencing the `Actor`
class now, make sure you import it at the top of the file. Let's update the `MeleeAction` class
now:

```typescript
export class MeleeAction extends ActionWithDirection {
  perform(actor: Actor) {
    const destX = actor.x + this.dx;
    const destY = actor.y + this.dy;

    const target = window.engine.gameMap.getActorAtLocation(destX, destY);
    if (!target) return;

    const damage = actor.fighter.power - target.fighter.defense;
    const attackDescription = `${actor.name.toUpperCase()} attacks ${
      target.name
    }`;

    if (damage > 0) {
      console.log(`${attackDescription} for ${damage} hit points.`);
      target.fighter.hp -= damage;
    } else {
      console.log(`${attackDescription} but does no damage.`);
    }
  }
}
```

This method at first simply gets the destination tile for the attack and finds the target at that destination.
We then calculate the damage that will be dealt by subtracting the target's defense from the attacker's power. Then we create
a string describing the attack taking place. If the damage is greater than zero, we'll print out some info about the 
attack and reduce the target's hp by that much. If damage is reduced to zero because of defense, we'll print that no
damage is done. 

Because we changed how the `MeleeAction` class' perform method is called, we need to go over to `ai.ts` and update the import
to bring in the `Actor` class. Then find where we call `perform` in the `HostileEnemy` class and update it to look like
this:

```typescript
return new MeleeAction(dx, dy).perform(entity as Actor);
```

Now we can open `fighter.ts` and have this damage do more than just reduce the hp. Let's have our actors actually
die! First let's update our import to use `Actor` instead of `Entity`:

```typescript
import { Actor } from '../entity';
```

Then we'll update the instance variable `entity` to be of type `Actor | null`:

```typescript
export class Fighter implements BaseComponent {
  entity: Actor | null;
  _hp: number;
  ...
```

Next we'll update the setter for the hp:

```typescript
public set hp(value: number) {
  this._hp = Math.max(0, Math.min(value, this.maxHp));

  if (this._hp === 0 && this.entity?.isAlive) {
    this.die();
  }
}
```

Here we're checking if the hp of actor has dropped to 0 and if it has AI. If those are both true, we'll tell it to die.
Now let's add a new `die` method to the `Fighter` class:

```typescript
die() {
    if (!this.entity) return;

    let deathMessage = '';
    if (window.engine.player === this.entity) {
      deathMessage = 'You died!';
    } else {
      deathMessage = `${this.entity.name} is dead!`;
    }

    this.entity.char = '%';
    this.entity.fg = '#bf0000';
    this.entity.blocksMovement = false;
    this.entity.ai = null;
    this.entity.name = `Remains of ${this.entity.name}`;

    console.log(deathMessage);
  }
```

There's one little bug to fix still. If you run the game you might see monsters that are stuck in walls. That's because
we are calculating the bounds of the room incorrectly, causing them to be 1 tile to wide/high. Update the `bounds` getter
of our `RectangularRoom` in `procgen.ts` to look like this:

```typescript
get bounds(): Bounds {
    return {
      x1: this.x,
      y1: this.y,
      x2: this.x + this.width - 1,
      y2: this.y + this.height - 1,
    };
  }
```

If you run the application now, you should be able to kill monsters by moving towards them. Find the complete code
for this section [here](https://github.com/bodiddlie/js-rogue-tutorial/tree/part6-3).

### Order In the Court

You might have noticed now that if you kill a monster and then walk over the corpse, that the player character
sometimes is hidden by the corpse. We don't want that, so let's establish an order in which entities should render. Open
up `entity.ts` and let's add a new enum to the top of the file:

```typescript
export enum RenderOrder {
  Corpse,
  Item,
  Actor,
}
```

By default enums will assign integers in increasing order starting at zero to the values. So Corpse would start at zero,
Item would be one, and Actor would be two. Next let's update our `Entity` constructor to take a `RenderOrder`:


```typescript
export class Entity {
  constructor(
    public x: number,
    public y: number,
    public char: string,
    public fg: string = '#fff',
    public bg: string = '#000',
    public name: string = '<Unnamed>',
    public blocksMovement: boolean = false,
    public renderOrder: RenderOrder = RenderOrder.Corpse,
  ) {}
```

We set a default value for entities to have the lowest render order of `Corpse`. Next let's update the constructor for
`Actor` to pass a different value to the parent class:

```typescript
export class Actor extends Entity {
  constructor(
    public x: number,
    public y: number,
    public char: string,
    public fg: string = '#fff',
    public bg: string = '#000',
    public name: string = '<Unnamed>',
    public ai: BaseAI | null,
    public fighter: Fighter,
  ) {
    super(x, y, char, fg, bg, name, true, RenderOrder.Actor);
    this.fighter.entity = this;
  }
```

The `Actor` class specifies its own render order when it gets instantiated. Here we set it to the highest of `Actor`.

Next let's open `fighter.ts` and have it set the render order down to the lowest when an actor dies:

```typescript
die() {
    if (!this.entity) return;
    let deathMessage = '';
    if (window.engine.player === this.entity) {
      deathMessage = 'You died!';
    } else {
      deathMessage = `${this.entity.name} is dead!`;
    }
    this.entity.char = '%';
    this.entity.fg = '#bf0000';
    this.entity.blocksMovement = false;
    this.entity.ai = null;
    this.entity.name = `Remains of ${this.entity.name}`;
    this.entity.renderOrder = RenderOrder.Corpse;

    console.log(deathMessage);
  }
```

We just set the `renderOrder` on the entity to `Corpse` when it dies. The last thing we need to do to take this new 
ordering into account is to sort the entities by `renderOrder` before rendering. Open up `game-map.ts` and update the 
`render` method where we loop over the entities to look like below:

```typescript
const sortedEntities = this.entities
  .slice()
  .sort((a, b) => a.renderOrder - b.renderOrder);

sortedEntities.forEach((e) => {
  if (this.tiles[e.y][e.x].visible) {
    this.display.draw(e.x, e.y, e.char, e.fg, e.bg);
  }
```

We first call `slice` on the entity list because `sort` modifies the array in place and we don't want to change the array, 
just get a sorted version of it. We then sort by render order, and loop over the sorted array rendering each entity. If you 
run the game again and kill some monsters, the player should always render above the corpses when moving over them. The 
complete code for this section can be found [here](https://github.com/bodiddlie/js-rogue-tutorial/tree/part6-4).

### Dead Man Walking

There's one other issue you might have noticed with death in our game right now. If you use the wait action to let monsters
hit you until you die, you can still move around and kill monsters after dying. We'll fix that in this last section, but 
first let's add some UI to the game in order to tell how much health the player has left. Everything in this section will
take place in `engine.ts` so go ahead and open that file up. We'll start by changing the `Entity` import to `Actor`. Let's then
update the constructor to use Actor and the shorthand syntax:

```typescript
export class Engine {
  // static constants omitted for brevity
  display: ROT.Display;
  gameMap: GameMap;

  constructor(public player: Actor) {

    this.display = new ROT.Display({
```

We wanted the player to be an `Actor` here so we can access the fighter component to get the health. Update the `render`
method like below:

```typescript
render() {
  this.display.drawText(
    1,
    47,
    `HP: %c{red}%b{white}${this.player.fighter.hp}/%c{green}%b{white}${this.player.fighter.maxHp}`,
  );
  this.gameMap.render();
}
```

Here we're just drawing a string of text to the display. ROT.js's `drawText` method accepts some special syntax for 
drawing text in color. Using `%c{color name}` will render the foreground of the text in a given color and `%b{color name}`
will render the background. Now we can see how much health the player has left, which makes waiting around for the player 
die a little more bearable. 

Now we can make it so the player doesn't move around anymore after dying. All we have to do is modify the `update` method
to look like this:

```typescript
update(event: KeyboardEvent) {
  this.display.clear();

  if (this.player.fighter.hp > 0) {
    const action = handleInput(event);

    if (action) {
      action.perform(this.player);
    }

    this.handleEnemyTurns();
  }

  this.gameMap.updateFov(this.player);
  this.render();
}
```

Here we move the input handling inside an if statement that checks if the player still has any hp. If they don't, then 
we won't process any input, perform any actions, or handle enemy turns. Go ahead and run the application now and if you allow
the player to die you shouldn't be able to move around anymore. You can find the complete code for this chapter [here](https://github.com/bodiddlie/js-rogue-tutorial/tree/part6).

