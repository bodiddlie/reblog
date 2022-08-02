---
title: 'ROT.js Tutorial Part 8: Inventory'
date: 2022-07-26T08:00:00.000Z
meta:
    title: 'ROT.js Tutorial Part 8: Inventory'
    date: "July 26, 2022"
    description: "In this chapter we're going to add an inventory to our player character, and give them the ability to pick up, drop, and consume health potions. We'll be building on the work we've done previously to add to our actor classes, create new entities, and show some new user interface elements."
---

# {attributes.title}
{attributes.date.toDateString()}

In this chapter, we're going to add an inventory to our player character and give them the ability to pick up, drop,
and consume health potions. We'll be building on the work we've done previously to add to our actor classes, create new
entities, and show some new user interface elements. 

### Refactoring

We're going to start again with a little refactoring of our code base. The main thing we'll be accomplishing with this
refactor is changing some wording on our components to refer to `parent`s instead of `entity`s. We'll also be changing
our entity spawning functions to take in a `GameMap` so the entities can be added to the map automatically. We'll start in
`base-component.ts`:

```typescript
import { Entity } from '../entity';
import { GameMap } from '../game-map';

export abstract class BaseComponent {
  parent: Entity | null;

  protected constructor() {
    this.parent = null;
  }

  public get gameMap(): GameMap | undefined {
    return this.parent?.gameMap;
  }
}
```

We're changing the base component to be an abstract class now because we want to add some functionality to it that can
be inherited by subclasses. Move on to `fighter.ts` and we'll update that:

```typescript
export class Fighter extends BaseComponent {
  parent: Actor | null;
  _hp: number;

  constructor(
    public maxHp: number,
    public defense: number,
    public power: number,
  ) {
    super();
    this._hp = maxHp;
    this.parent = null;
  }
```

We're now extending the `BaseComponent` as it's a class and not an interface. We're also have to call `super()` in our
constructor to make sure the chain of inheritance is satisfied. We then update our reference to `parent`. In the same file
let's update the `hp` setter and the `die` method:

```typescript
public set hp(value: number) {
  this._hp = Math.max(0, Math.min(value, this.maxHp));

  if (this._hp === 0 && this.parent?.isAlive) {
    this.die();
  }
}

  die() {
  if (!this.parent) return;

  let deathMessage = '';
  let fg = null;
  if (window.engine.player === this.parent) {
    deathMessage = 'You died!';
    fg = Colors.PlayerDie;
  } else {
    deathMessage = `${this.parent.name} is dead!`;
    fg = Colors.EnemyDie;
  }

  this.parent.char = '%';
  this.parent.fg = '#bf0000';
  this.parent.blocksMovement = false;
  this.parent.ai = null;
  this.parent.name = `Remains of ${this.parent.name}`;
  this.parent.renderOrder = RenderOrder.Corpse;

  window.engine.messageLog.addMessage(deathMessage, fg);
}
```

All we do here is update the `entity` reference to `parent`. Let's move on to `entity.ts` and add an import at the top:

```typescript
import { GameMap } from './game-map';
```

Then we'll add a new instance variable, update the constructor, and an a getter: 

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
    public parent: GameMap | null = null,
  ) {
    if (this.parent) {
      this.parent.entities.push(this);
    }
  }

  public get gameMap(): GameMap | undefined {
    return this.parent?.gameMap;
  }
```

The constructor of an entity now will make sure we add a new entity to the map it's being added to. Now we need to update
the `Actor` class to work with this new constructor:

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
    public parent: GameMap | null = null,
  ) {
    super(x, y, char, fg, bg, name, true, RenderOrder.Actor, parent);
    this.fighter.parent = this;
  }
```

Now we can update our spawning functions accordingly:

```typescript
export function spawnPlayer(
  x: number,
  y: number,
  gameMap: GameMap | null = null,
): Actor {
  return new Actor(
    x,
    y,
    '@',
    '#fff',
    '#000',
    'Player',
    null,
    new Fighter(30, 2, 5),
    gameMap,
  );
}

export function spawnOrc(gameMap: GameMap, x: number, y: number): Entity {
  return new Actor(
    x,
    y,
    'o',
    '#3f7f3f',
    '#000',
    'Orc',
    new HostileEnemy(),
    new Fighter(10, 0, 3),
    gameMap,
  );
}

export function spawnTroll(gameMap: GameMap, x: number, y: number): Entity {
  return new Actor(
    x,
    y,
    'T',
    '#007f00',
    '#000',
    'Troll',
    new HostileEnemy(),
    new Fighter(16, 1, 4),
    gameMap,
  );
}
```

Note how the `gameMap` parameter is last on the `spawnPlayer` function. We do this because when we create the player
in `main.ts` the engine, and by extension, the map hasn't been created yet. If we had `gameMap` as the first parameter,
it would be cumbersome to call the function because we'd have to pass `null` first. This way we can omit the parameter entirely.

Next we need to update our `placeEntities` function in `procgen.ts` to call the functions with their new signatures:

```typescript
function placeEntities(
  room: RectangularRoom,
  dungeon: GameMap,
  maxMonsters: number,
) {
  const numberOfMonstersToAdd = generateRandomNumber(0, maxMonsters);
  for (let i = 0; i < numberOfMonstersToAdd; i++) {
    const bounds = room.bounds;
    const x = generateRandomNumber(bounds.x1 + 1, bounds.x2 - 1);
    const y = generateRandomNumber(bounds.y1 + 1, bounds.y2 - 1);

    if (!dungeon.entities.some((e) => e.x == x && e.y == y)) {
      if (Math.random() < 0.8) {
        spawnOrc(dungeon, x, y);
      } else {
        spawnTroll(dungeon, x, y);
      }
    }
  }
}
```

Previously we spawned an entity and then directly added it to the map. We'll update the code so the entity automatically registers with the game map. This
allows for more flexibility in how things get added to a map. With our prior implementation, our procedural generation
code needed to know the details of how `GameMap` worked. If we wanted to perform some special logic based on where
in a map an entity was being placed, that would have to have been part of our procedural generation code. With this refactor,
we could include that logic in the map itself. This makes sure that we only have to worry about map related code to make
map related changes, and reduces the blast radius of a change. 

Last thing we'll do is add a getter to `GameMap` in `game-map.ts`:

```typescript
public get gameMap(): GameMap {
  return this;
}
```

As we build out our game, some of the `parent`s on a component/entity will be `union` types. That means they could be one
of several types. This will allow us to get a `gameMap` from those parents whether it's a component, an entity, or a
map itself.

Run the application and make sure it works just as it did before. You can find the completed code for this section 
[here](https://github.com/bodiddlie/js-rogue-tutorial/tree/part8-1).

### Brewing Up a Potion

With our refactoring out of the way we can start working on adding some items to our game. What we'll be adding is a
health potion the player can use to recover some HP. Let's start by adding some new colors to our `Colors` enum:

```typescript
export enum Colors {
  White = '#ffffff',
  Black = '#000000',
  PlayerAttack = '#e0e0e0',
  EnemyAttack = '#ffc0c0',
  PlayerDie = '#ff3030',
  EnemyDie = '#ffa030',
  WelcomeText = '#20a0ff',
  BarFilled = '#006000',
  BarEmpty = '#401010',
  Invalid = '#ffff00',
  Impossible = '#808080',
  Error = '#ff4040',
  HealthRecovered = '#00ff00',
}
```

We've added four new colors that we'll use throughout the rest of this chapter. Let's jump over to `input-handler.ts` and
update the `MovementAction` class to use some of this new coloring:

```typescript
export class MovementAction extends ActionWithDirection {
  perform(entity: Entity) {
    const destX = entity.x + this.dx;
    const destY = entity.y + this.dy;

    if (!window.engine.gameMap.isInBounds(destX, destY)) {
      window.engine.messageLog.addMessage(
        'That way is blocked.',
        Colors.Impossible,
      );
      throw new Error('That way is blocked.');
    }
    if (!window.engine.gameMap.tiles[destY][destX].walkable) {
      window.engine.messageLog.addMessage(
        'That way is blocked.',
        Colors.Impossible,
      );
      throw new Error('That way is blocked.');
    }
    if (window.engine.gameMap.getBlockingEntityAtLocation(destX, destY)) {
      window.engine.messageLog.addMessage(
        'That way is blocked.',
        Colors.Impossible,
      );
      throw new Error('That way is blocked.');
    }
    entity.move(this.dx, this.dy);
  }
}
```

When an impassable tile was hit before, we would just do nothing. Monsters would still take their turns, possibly attacking
the player. We've updated the code here to print a message notifying the player that the action they attempted wasn't 
successful. We're also `throw`ing an error instead of returning from the function. We'll catch these exceptions later, but this will
allow us to protect a player from getting hit by enemies if they simply hit a wrong key and try to move into a wall. It
wouldn't be very fun in a game to get punished in that way. We'll leverage this pattern with our items as well.

Let's also update our `MeleeAction` class in a similar fashion:

```typescript
export class MeleeAction extends ActionWithDirection {
  perform(actor: Actor) {
    const destX = actor.x + this.dx;
    const destY = actor.y + this.dy;

    const target = window.engine.gameMap.getActorAtLocation(destX, destY);
    if (!target) {
      window.engine.messageLog.addMessage(
        'Nothing to attack',
        Colors.Impossible,
      );
      throw new Error('Nothing to attack.');
    }

    // rest of class omitted for brevity
  }
}
```

Now we can get started with adding items. To do this we'll be creating some new components. In the `components` directory
create a new file called `consumable.ts`. Start by adding this code:

```typescript
import { Actor, Entity, Item } from '../entity';
import { Action, ItemAction } from '../input-handler';
import { Colors } from '../colors';

export interface Consumable {
  parent: Item | null;
  getAction(): Action | null;
  activate(entity: Entity): void;
}
```

The `Consumable` interface provides the methods and properties we'll expect any item that can be **used** by the player.
We'll only be focusing on having the player use items in this series, but you could use this as a base to add functionality
to allow for other entities to use items as well.

Next we'll create a component that implements this interface:

```typescript
export class HealingConsumable implements Consumable {
  constructor(public amount: number, public parent: Item | null = null) {}

  getAction(): Action | null {
    if (this.parent) {
      return new ItemAction(this.parent);
    }
    return null;
  }

  activate(entity: Entity) {
    const consumer = entity as Actor;
    if (!consumer) return;

    const amountRecovered = consumer.fighter.heal(this.amount);

    if (amountRecovered > 0) {
      window.engine.messageLog.addMessage(
        `You consume the ${this.parent?.name}, and recover ${amountRecovered} HP!`,
        Colors.HealthRecovered,
      );
    } else {
      window.engine.messageLog.addMessage(
        'Your health is already full.',
        Colors.Impossible,
      );
      throw new Error('Your health is already full.');
    }
  }
}
```

There are two important methods on this class so let's break those down. First is `getAction`:

```typescript
getAction(): Action | null {
  if (this.parent) {
    return new ItemAction(this.parent);
  }
  return null;
}
```

This method returns a new `ItemAction` tied to the `Item` this consumable is tied to. We haven't created these classes yet,
but will here in the next sections. The bigger function in this class is `activate`:

```typescript
activate(entity: Entity) {
  const consumer = entity as Actor;
  if (!consumer) return;

  const amountRecovered = consumer.fighter.heal(this.amount);

  if (amountRecovered > 0) {
    window.engine.messageLog.addMessage(
      `You consume the ${this.parent?.name}, and recover ${amountRecovered} HP!`,
      Colors.HealthRecovered,
    );
  } else {
    window.engine.messageLog.addMessage(
      'Your health is already full.',
      Colors.Impossible,
    );
    throw new Error('Your health is already full.');
  }
}
```

This function takes in the entity that is activating the consumable. We then make sure that entity is an `Actor` so we
can get the `Fighter` component from it. The `heal` function is something we'll be implementing momentarily. We check
to see how much health we recovered. If we did actually recover some health, we print a message using one
of our new colors. If we didn't recover any health, that means our health was already full. We print a message and then throw an error. This will make it so a player can't accidentally use a potion when they're at full health.
The potion will still stay in their inventory.

We can now implement the `heal` method in `fighter.ts`:

```typescript
heal(amount: number): number {
  if (this.hp === this.maxHp) return 0;

  const newHp = Math.min(this.maxHp, this.hp + amount);
  const amountRecovered = newHp - this.hp;
  this.hp = newHp;

  return amountRecovered;
}
```

The `heal` method checks if we're already at full health. If we aren't, it will heal for the value of `amount`, but never above the max value of 100%. We then calculate how much we actually recovered and return that amount. While 
we're in this file let's add a method for taking damage as well:

```typescript
takeDamage(amount: number) {
  this.hp -= amount;
}
```

Now we can move over to `entity.ts` and create our new `Item` class. First we'll add imports for our consumables:

```typescript
import { Consumable, HealingConsumable } from './components/consumable';
```

Next we can create the `Item` class:

```typescript
export class Item extends Entity {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public char: string = '?',
    public fg: string = '#fff',
    public bg: string = '#000',
    public name: string = '<Unnamed>',
    public consumable: Consumable,
    public parent: GameMap | null = null,
  ) {
    super(x, y, char, fg, bg, name, false, RenderOrder.Item, parent);
    this.consumable.parent = this;
  }
}
```

This is similar to the actor with the main differences being instead of a `Fighter` we add a `Consumable`, the render order
is different, and items don't block movement. Let's add a spawning function for a health potion at the end of the file:

```typescript
export function spawnHealthPotion(
  gameMap: GameMap,
  x: number,
  y: number,
): Entity {
  return new Item(
    x,
    y,
    '!',
    '#7F00FF',
    '#000',
    'Health Potion',
    new HealingConsumable(4),
    gameMap,
  );
}
```

This function will spawn a potion that will allow for healing up to four health. Let's jump back over to `input-handler.ts`
to create the `ItemAction` class we referenced in our consumables. First we need to input `Item`:

```typescript
import { Actor, Entity, Item } from './entity';
```

Now we can create the new action class:

```typescript
export class ItemAction implements Action {
  constructor(public item: Item) {}

  perform(entity: Entity) {
    this.item.consumable.activate(this, entity);
  }
}
```

This action will trigger the `activate` method on a consumable when performed. Breaking things up in this way allows us 
to have the logic for **what** an item does in the components for it, and let **when** it gets activated be handled by
the action. This sets us up to have many potions that could have different effects.

We can now open up `procgen.ts` and update our generation code to add some potions around the map. First we'll import our
spawning function:

```typescript
import { Entity, spawnHealthPotion, spawnOrc, spawnTroll } from './entity';
```

Next we'll update our `placeEntities` function to place potions much like it places monsters:

```typescript
function placeEntities(
  room: RectangularRoom,
  dungeon: GameMap,
  maxMonsters: number,
  maxItems: number,
) {
  const numberOfMonstersToAdd = generateRandomNumber(0, maxMonsters);
  const numberOfItemsToAdd = generateRandomNumber(0, maxItems);
  const bounds = room.bounds;

  for (let i = 0; i < numberOfMonstersToAdd; i++) {
    const x = generateRandomNumber(bounds.x1 + 1, bounds.x2 - 1);
    const y = generateRandomNumber(bounds.y1 + 1, bounds.y2 - 1);

    if (!dungeon.entities.some((e) => e.x == x && e.y == y)) {
      if (Math.random() < 0.8) {
        spawnOrc(dungeon, x, y);
      } else {
        spawnTroll(dungeon, x, y);
      }
    }
  }

  for (let i = 0; i < numberOfItemsToAdd; i++) {
    const x = generateRandomNumber(bounds.x1 + 1, bounds.x2 - 1);
    const y = generateRandomNumber(bounds.y1 + 1, bounds.y2 - 1);

    if (!dungeon.entities.some((e) => e.x == x && e.y == y)) {
      spawnHealthPotion(dungeon, x, y);
    }
  }
}
```

We take in a parameter representing the maximum number of items to add in a room and get a random number between zero and 
that max. Then at the end of the function we loop over that range and spawn a health potion in a random location.

Now we just need to update `generateDungeon` to pass in the maximum number of items and take that max as a parameter as well:

```typescript
export function generateDungeon(
  mapWidth: number,
  mapHeight: number,
  maxRooms: number,
  minSize: number,
  maxSize: number,
  maxMonsters: number,
  maxItems: number,
  player: Entity,
  display: Display,
): GameMap {

    // omitted body of function for brevity
  
    dungeon.addRoom(x, y, newRoom.tiles);

    placeEntities(newRoom, dungeon, maxMonsters, maxItems);

    rooms.push(newRoom);
  }
```

Last thing to do for this section is update `engine.ts` to leverage all these changes. First we'll add a new static
constant for the maximum items in a room:

```typescript
public static readonly MAX_ITEMS_PER_ROOM = 2;
```

Then we can use that constant when we generate the dungeon in the `Engine` constructor:

```typescript
this.gameMap = generateDungeon(
  Engine.MAP_WIDTH,
  Engine.MAP_HEIGHT,
  Engine.MAX_ROOMS,
  Engine.MIN_ROOM_SIZE,
  Engine.MAX_ROOM_SIZE,
  Engine.MAX_MONSTERS_PER_ROOM,
  Engine.MAX_ITEMS_PER_ROOM,
  player,
  this.display,
);
```

Then we need to make two changes to catch the errors we're throwing in our actions now. First we'll update `handleEnemyTurns`:

```typescript
handleEnemyTurns() {
  this.gameMap.actors.forEach((e) => {
    if (e.isAlive) {
      try {
        e.ai?.perform(e);
      } catch {}
    }
  });
}
```

We wrap the `perform` call in a try/catch block so that we can swallow any exceptions thrown. It's not likely that a 
monster would try to perform an impossible action right now, but we might as well guard against it. The second place
we need to catch errors is in the `processGameLoop` method:

```typescript
processGameLoop(event: KeyboardEvent)
{
  if (this.player.fighter.hp > 0) {
    const action = handleGameInput(event);

    if (action) {
      try {
        action.perform(this.player);
        if (this.state === EngineState.Game) {
          this.handleEnemyTurns();
        }
      } catch {}
    }
  }
}
```

 As before, we will wrap the `perform` call in a try/catch block. If we were to try to perform and action that was impossible,
we would now catch that error and bypass the `handleEnemyTurns` call. This makes it so if you run into a wall, or hit a 
wrong key in the inventory screen we'll build shorty, you won't get unfairly punished.

Run the game now, and you should see health potions scattered around the map. We can't do anything with them yet, however.
We'll tackle that in the next section. You can view the complete code thus far [here](https://github.com/bodiddlie/js-rogue-tutorial/tree/part8-2).

### A Little Pick-Me-Up

In this section we'll add functionality to actually pick up the potions in our map. We'll then be able to either use the 
potions or drop them back to the map. To be able to do this, our player character will need an inventory to hold on to 
potions that they pick up. Let's start by creating a new file in the `components` directory called `inventory.ts`. 

```typescript
import { BaseComponent } from './base-component';
import { Actor, Item } from '../entity';

export class Inventory extends BaseComponent {
  parent: Actor | null;
  items: Item[];

  constructor(public capacity: number) {
    super();
    this.parent = null;
    this.items = [];
  }

  drop(item: Item) {
    const index = this.items.indexOf(item);
    if (index >= 0) {
      this.items.splice(index, 1);
      if (this.parent) {
        item.place(this.parent.x, this.parent.y, window.engine.gameMap);
      }
      window.engine.messageLog.addMessage(`You dropped the ${item.name}."`);
    }
  }
}
```

This class contains the parent actor it is attached to, a list of items in the inventory, and a capacity that denotes
the maximum number of items that can be held in inventory. It also has a `drop` method that will find an item in the list
and then remove it. It will also then place that item back on the map. We'll implement the `place` method on the `Entity`
class in a moment. After dropping the item it will add a message to the log. 

Now we'll jump over to `entity.ts` and make some changes to allow for inventory management. First we need to add some
imports:

```typescript
import { Inventory } from './components/inventory';
import { BaseComponent } from './components/base-component';
```

Next we'll update the constructor for `Entity`:

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
    public parent: GameMap | BaseComponent | null = null,
  ) {
    if (this.parent && this.parent instanceof GameMap) {
      this.parent.entities.push(this);
    }
  }
```

We've changed the type of `parent` to be a union type that also includes `BaseComponent`. This is because our items
could be on the map **or** in an inventory. Because of this change we also need to check the type of `parent` before
adding it to the entities on a map. If for some reason we started with an item in an inventory, this would cause an 
error. We aren't doing that right now, but TypeScript will complain. Handling this error in Typescript now prevents us
from having bugs later. 

Now we can implement the `place` method that will be responsible for putting an item back on the map in a given location:

```typescript
place(x: number, y: number, gameMap: GameMap | undefined) {
  this.x = x;
  this.y = y;
  if (gameMap) {
    if (this.parent) {
      if (this.parent === gameMap) {
        gameMap.removeEntity(this);
      }
    }
    this.parent = gameMap;
    gameMap.entities.push(this);
  }
}
```

This method first sets the location of the entity to the given x/y position. It then checks if a game map was passed, 
and if it is already associated to the given map, removes it. This would enable us to teleport entities around the map 
if we wanted. We then add the entity to the list of entities on the map. This will make it so when we drop an item it shows
up on the map again.

Next we'll update the `Actor` class to have an inventory:

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
    public inventory: Inventory,
    public parent: GameMap | null = null,
  ) {
    super(x, y, char, fg, bg, name, true, RenderOrder.Actor, parent);
    this.fighter.parent = this;
    this.inventory.parent = this;
  }
```

The only changes we need to make here are to add the inventory instance variable, and set the parent of the inventory to the actor. Let's update the `Item`
class constructor next:

```typescript
export class Item extends Entity {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public char: string = '?',
    public fg: string = '#fff',
    public bg: string = '#000',
    public name: string = '<Unnamed>',
    public consumable: Consumable,
    public parent: GameMap | BaseComponent | null = null,
  ) {
    super(x, y, char, fg, bg, name, false, RenderOrder.Item, parent);
    this.consumable.parent = this;
  }
}
```

We update the type of `parent` since an item can be on the map **or** in an inventory. With all that in place, we can 
update the spawn functions of our actors:

```typescript
export function spawnPlayer(
  x: number,
  y: number,
  gameMap: GameMap | null = null,
): Actor {
  return new Actor(
    x,
    y,
    '@',
    '#fff',
    '#000',
    'Player',
    null,
    new Fighter(30, 2, 5),
    new Inventory(26),
    gameMap,
  );
}
export function spawnOrc(gameMap: GameMap, x: number, y: number): Entity {
  return new Actor(
    x,
    y,
    'o',
    '#3f7f3f',
    '#000',
    'Orc',
    new HostileEnemy(),
    new Fighter(10, 0, 3),
    new Inventory(0),
    gameMap,
  );
}
export function spawnTroll(gameMap: GameMap, x: number, y: number): Entity {
  return new Actor(
    x,
    y,
    'T',
    '#007f00',
    '#000',
    'Troll',
    new HostileEnemy(),
    new Fighter(16, 1, 4),
    new Inventory(0),
    gameMap,
  );
}
```

We add an inventory to all the actors we spawn, but only the player has any capacity. We'll be using each letter of 
the alphabet for representing slots in our inventory, so there are 26 slots for the player. 

Next we'll add some helpful methods to the `GameMap` class:

```typescript
public get items(): Item[] {
  return this.entities.filter((e) => e instanceof Item).map((e) => e as Item);
}

removeEntity(entity: Entity) {
  const index = this.entities.indexOf(entity);
  if (index >= 0) {
    this.entities.splice(index, 1);
  }
}
```

The getter will be used to get a list of all the items in a map. We also add a `removeEntity` method for finding an 
item in the list and removing it. Now let's open up `input-handler.ts` and we'll add some new actions and a new handler
function:

```typescript
export class PickupAction implements Action {
  perform(entity: Entity) {
    const consumer = entity as Actor;
    if (!consumer) return;

    const { x, y, inventory } = consumer;

    for (const item of window.engine.gameMap.items) {
      if (x === item.x && y == item.y) {
        if (inventory.items.length >= inventory.capacity) {
          window.engine.messageLog.addMessage(
            'Your inventory is full.',
            Colors.Impossible,
          );
          throw new Error('Your inventory is full.');
        }

        window.engine.gameMap.removeEntity(item);
        item.parent = inventory;
        inventory.items.push(item);

        window.engine.messageLog.addMessage(`You picked up the ${item.name}!`);
        return;
      }
    }

    window.engine.messageLog.addMessage(
      'There is nothing here to pick up.',
      Colors.Impossible,
    );
    throw new Error('There is nothing here to pick up.');
  }
}
```

This action first gets the position of the actor and its associated inventory. We then check if the location the actor
is in has an item in it. If there is an item, we then check if the inventory has any open capacity. If not, we add a 
message to the log and throw an error. If there is capacity in the inventory, we remove the item from the map, reassign
the parent to the inventory, add the item to list in the inventory, and then add a message to the log. If there wasn't
an item in the location at all, we add a message saying so and throw an error. 

Now we'll add a new action that will handle updating our engine state to show our inventory UI:

```typescript
export class InventoryAction implements Action {
  constructor(public isUsing: boolean) {}

  perform(_entity: Entity) {
    window.engine.state = this.isUsing
      ? EngineState.UseInventory
      : EngineState.DropInventory;
  }
}
```

Much like our `LogAction` class this action will update the engine state when triggered. It will be given a `isUsing`
parameter on instantiation to tell us whether the player is looking to use or drop an item. 

Next we'll add an action for dropping an item:

```typescript
class DropItem extends ItemAction {
  perform(entity: Entity) {
    const dropper = entity as Actor;
    if (!dropper) return;
    dropper.inventory.drop(this.item);
  }
}
```

This action makes sure the entity performing it is an `Actor` and if so, calls the `drop` method on the inventory to 
drop the item.

Next we'll update our `MOVE_KEYS` map to add some keys for handling items:

```typescript
const MOVE_KEYS: MovementMap = {
  // other keys omitted for brevity
  // UI keys
  v: new LogAction(),
  g: new PickupAction(),
  i: new InventoryAction(true),
  d: new InventoryAction(false),
};
```

Last thing for this file is to add our new input handler for inventory management:

```typescript
export function handleInventoryInput(event: KeyboardEvent): Action | null {
  let action = null;
  if (event.key.length === 1) {
    const ordinal = event.key.charCodeAt(0);
    const index = ordinal - 'a'.charCodeAt(0);

    if (index >= 0 && index <= 26) {
      const item = window.engine.player.inventory.items[index];
      if (item) {
        if (window.engine.state === EngineState.UseInventory) {
          action = item.consumable.getAction();
        } else if (window.engine.state === EngineState.DropInventory) {
          action = new DropItem(item);
        }
      } else {
        window.engine.messageLog.addMessage('Invalid entry.', Colors.Invalid);
        return null;
      }
    }
  }
  window.engine.state = EngineState.Game;
  return action;
}
```

We start by checking if the length of the key name is one character. For example, if the `Tab` key were pressed, the 
key name would be `Tab`. The first character in that string is `T`. If we blindly used the key name, we would
use the wrong keys sometimes. We want to exclude keys that aren't letters. 

We then get the ordinal of the key pressed and subtract the ordinal of the letter *a* from it. This will map to the index
in the list of items in an inventory. If that index is between 0 and 26 (which maps to letters on the keyboard) we try to 
get the item at that index. If one exists, we check the engine state. If we are **using** an item, we'll return the action
associated with that item. If we are **dropping** an item, we'll return a `DropItem` action. If an item doesn't exist
at that index, we add a message to the log and return null. Lastly, if any other key is pressed, we exit from the inventory
screen and go back to the game.

With all that in place, we can now update `engine.ts` to put it all together. We'll first import our new handler:

```typescript
import {
  handleGameInput,
  handleInventoryInput,
  handleLogInput,
} from './input-handler';
```

Then we'll make a change to the `update` method:

```typescript
update(event: KeyboardEvent) {
  if (this.state === EngineState.Game) {
    this.processGameLoop(event);
  } else if (this.state === EngineState.Log) {
    this.processLogLoop(event);
  } else if (
    this.state === EngineState.UseInventory ||
    this.state === EngineState.DropInventory
  ) {
    this.processInventoryLoop(event);
  }

  this.render();
}
```

We're now checking for the inventory states and calling a new process method if we are in either state. Let's add the 
new `processInventoryLoop` method:

```typescript
processInventoryLoop(event: KeyboardEvent) {
  const action = handleInventoryInput(event);
  action?.perform(this.player);
}
```

This method gets the action from our new handler and performs it if the action exists. Next we'll update our `render`
method to display the inventory if we are in an inventory state:

```typescript
render() {
  this.display.clear();
  this.messageLog.render(this.display, 21, 45, 40, 5);
  
  renderHealthBar(
    this.display,
    this.player.fighter.hp,
    this.player.fighter.maxHp,
    20,
  );
  
  renderNamesAtLocation(21, 44);
  
  this.gameMap.render();
  
  if (this.state === EngineState.Log) {
    renderFrameWithTitle(3, 3, 74, 38, 'Message History');
    this.messageLog.renderMessages(
      this.display,
      4,
      4,
      72,
      36,
      this.messageLog.messages.slice(0, this.logCursorPosition + 1),
    );
  }
  if (this.state === EngineState.UseInventory) {
    this.renderInventory('Select an item to use');
  }
  if (this.state === EngineState.DropInventory) {
    this.renderInventory('Select an item to drop');
  }
}
```

If we are in an inventory state we call a new `renderInventory` method a title appropriate for that state. Next 
we need to add this new `renderInventory` method:

```typescript
renderInventory(title: string) {
  const itemCount = this.player.inventory.items.length;
  const height = itemCount + 2 <= 3 ? 3 : itemCount + 2;
  const width = title.length + 4;
  const x = this.player.x <= 30 ? 40 : 0;
  const y = 0;

  renderFrameWithTitle(x, y, width, height, title);

  if (itemCount > 0) {
    this.player.inventory.items.forEach((i, index) => {
      const key = String.fromCharCode('a'.charCodeAt(0) + index);
      this.display.drawText(x + 1, y + index + 1, `(${key}) ${i.name}`);
    });
  } else {
    this.display.drawText(x + 1, y + 1, '(Empty)');
  }
}
```

We calculate the dimensions of our inventory window by taking the number of items in the inventory into account, as well
as the length of the title. We determine the position of the window based on where the player is, so we never draw the window
over where the player is standing on the map. We then loop over all the items in the inventory and print them out with a 
letter representing the key the player needs to press to use or drop the item. If there aren't any items in the inventory
we still display the window with a `(Empty)` message. 

Run the application and pick some potions up by hitting the `g` key. If you pull up you inventory by hitting `i`, it should
display a window with your potions in it. Press one of the letters next to a potion, and you should see your health restored.
If you press the `d` key it should bring up a similar inventory window. Pressing a letter next to potion in this window 
will drop the item where your player stands. 

You can find the code for this section [here](https://github.com/bodiddlie/js-rogue-tutorial/tree/part8-3).

### Consume

You might notice that one thing isn't working exactly right. If you use a health potion and then open your inventory
again, the potion is still in there. Would make for a nice cheat code, but we want the potions to actually be **consumed**
when we use them. To fix this we just need to make a couple changes to our `HealingConsumable` class in `consumable.ts`.
First we need to import the `Inventory` class:

```typescript
import { Inventory } from './inventory';
```

Then in the `activate` method, we'll call a new method that we'll write shortly:

```typescript
activate(_action: ItemAction, entity: Entity) {
  const consumer = entity as Actor;
  if (!consumer) return;
  const amountRecovered = consumer.fighter.heal(this.amount);
  if (amountRecovered > 0) {
    window.engine.messageLog.addMessage(
      `You consume the ${this.parent?.name}, and recover ${amountRecovered} HP!`,
      Colors.HealthRecovered,
    );
    this.consume(); // <--- this is our new method
  } else {
    window.engine.messageLog.addMessage(
      'Your health is already full.',
      Colors.Impossible,
    );
    throw new Error('Your health is already full.');
  }
}
```

Now add this new `consume` method to the class:

```typescript
consume() {
  const item = this.parent;
  if (item) {
    const inventory = item.parent;
    if (inventory instanceof Inventory) {
      const index = inventory.items.indexOf(item);
      if (index >= 0) {
        inventory.items.splice(index, 1);
      }
    }
  }
}
```

This method checks if parent of the item is an inventory and if so, removes it from the list of items. Run the application
and the potions should disappear from the inventory after use. 

You can find the complete code for this chapter [here](https://github.com/bodiddlie/js-rogue-tutorial/tree/part8).

[Click here to move on to Part 9](/rotjs-tutorial/part9)!
