---
title: 'ROT.js Tutorial Part 9: Ranged Scrolls and Targeting'
date: 2022-08-02T08:00:00.000Z
meta:
    title: 'ROT.js Tutorial Part 9: Ranged Scrolls and Targeting'
    date: "August 2, 2022"
    description: "In this chapter we'll add the ability to target enemies at range using various scroll items. This will involve creating new input handlers, new items, and a new AI type. We'll also add some UI handling for displaying to the player where they are targeting. However, before we add all that new functionality, we have some housekeeping to take care of in the form of refactoring once again."
---

# {attributes.title}
{attributes.date.toDateString()}

In this chapter we'll add the ability to target enemies at range using various scroll items. This will involve creating 
new input handlers, new items, and a new AI type. We'll also add some UI handling for displaying to the player where they
are targeting. However, before we add all that new functionality, we have some housekeeping to take care of in the form
of refactoring once again.

### Refactor (Yes, Again)

As I worked on this chapter I became increasingly aware of how much code was getting added to the `input-handler.ts` file.
Most of the code we've been adding in there has to do with actions and not actual input handling. In the beginning of this
series it made some sense since actions were just a result of handling input. Now that we've added items and AI, actions
can be produced as a result of several things, not just a key being pressed. So to start let's move all the actions out
of `input-handler.ts` and into their own file. Create a new `actions.ts` file and add the below:

```typescript
import { Actor, Entity, Item } from './entity';
import { Colors } from './colors';

export abstract class Action {
  abstract perform(entity: Entity): void;
}

export class PickupAction extends Action {
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

export class ItemAction extends Action {
  constructor(public item: Item) {
    super();
  }

  perform(entity: Entity) {
    this.item.consumable.activate(this, entity);
  }
}

export class WaitAction extends Action {
  perform(_entity: Entity) {}
}

export abstract class ActionWithDirection extends Action {
  constructor(public dx: number, public dy: number) {
    super();
  }

  perform(_entity: Entity) {}
}

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

export class BumpAction extends ActionWithDirection {
  perform(entity: Entity) {
    const destX = entity.x + this.dx;
    const destY = entity.y + this.dy;

    if (window.engine.gameMap.getActorAtLocation(destX, destY)) {
      return new MeleeAction(this.dx, this.dy).perform(entity as Actor);
    } else {
      return new MovementAction(this.dx, this.dy).perform(entity);
    }
  }
}

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

    const damage = actor.fighter.power - target.fighter.defense;
    const attackDescription = `${actor.name.toUpperCase()} attacks ${
      target.name
    }`;

    const fg =
      actor.name === 'Player' ? Colors.PlayerAttack : Colors.EnemyAttack;
    if (damage > 0) {
      window.engine.messageLog.addMessage(
        `${attackDescription} for ${damage} hit points.`,
        fg,
      );
      target.fighter.hp -= damage;
    } else {
      window.engine.messageLog.addMessage(
        `${attackDescription} but does no damage.`,
        fg,
      );
    }
  }
}

export class LogAction extends Action {
  constructor(public moveLog: () => void) {
    super();
  }

  perform(_entity: Entity) {
    this.moveLog();
  }
}

export class DropItem extends ItemAction {
  perform(entity: Entity) {
    const dropper = entity as Actor;
    if (!dropper) return;
    dropper.inventory.drop(this.item);
  }
}
```

We haven't changed much in these actions, just moved them to their own file, so we know where to look when modifying
actions. In a larger game, it might make sense to take this even further and make `actions` a directory with modules
representing specific kinds of actions (e.g. Log, Item, Combat). For our little tutorial though, this will suffice.

One change that it's worth to point out is in `LogAction`. Before, this action was used to open the message log. As part
of this refactor, we'll repurpose this action to represent when we need to scroll the log. The constructor of this action
takes in a `moveLog` function. This function takes no parameters and doesn't return anything. When an input handler
creates one of these actions, it will give a function that will get executed when the action is performed. We'll see a concrete
example of this when we write the code for handling message log input.

Since we've moved our actions, we now need to update anywhere we've imported them to use the new file name. Update
`ai.ts`, and `consumable.ts` to import from `./actions.ts`.

Next let's delete **all** the code from `input-handler.ts` and we'll start replacing it. I'll explain these changes as 
we go as this is the most important part of our refactor. We'll start with our imports:

```typescript
import {
  Action,
  BumpAction,
  DropItem,
  LogAction,
  PickupAction,
  WaitAction,
} from './actions';
import { Colors } from './colors';
```

Since the actions are no longer defined in `input-handler.ts` we need to import them. We also need the colors enum for 
messages and some UI work. Next we'll create some interfaces that we'll use throughout our input handling:

```typescript
interface LogMap {
  [key: string]: number;
}
const LOG_KEYS: LogMap = {
  ArrowUp: -1,
  ArrowDown: 1,
};

interface DirectionMap {
  [key: string]: [number, number];
}

const MOVE_KEYS: DirectionMap = {
  // Arrow Keys
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  Home: [-1, -1],
  End: [-1, 1],
  PageUp: [1, -1],
  PageDown: [1, 1],
  // Numpad Keys
  1: [-1, 1],
  2: [0, 1],
  3: [1, 1],
  4: [-1, 0],
  6: [1, 0],
  7: [-1, -1],
  8: [0, -1],
  9: [1, -1],
  // Vi keys
  h: [-1, 0],
  j: [0, 1],
  k: [0, -1],
  l: [1, 0],
  y: [-1, -1],
  u: [1, -1],
  b: [-1, 1],
  n: [1, 1],
};

export enum InputState {
  Game,
  Dead,
  Log,
  UseInventory,
  DropInventory,
}
```

`LogMap` is used for mapping key presses to amounts scrolled in our log. `DirectionMap` is be used for mapping key
presses to a direction something should be moved. `InputState` should look familiar as it is a copy of the enum we have
in `engine.ts`. I realized as I started work on this chapter that the "state" we were using to determine what to render
and how to handle updates in the engine was all tied to what input mode the game was currently in. Because of this, it 
makes the most sense to contain this state in our input handlers. We'll use this enum throughout the rest of this section:

Next up we'll create an abstract class to represent a based input handler:


```typescript
export abstract class BaseInputHandler {
  nextHandler: BaseInputHandler;
  protected constructor(public inputState: InputState = InputState.Game) {
    this.nextHandler = this;
  }

  abstract handleKeyboardInput(event: KeyboardEvent): Action | null;
}
```

Instead of having a function for handling input, we're going to create a series of classes that all inherit from this 
base class. Each "mode" of input will have its own class that we'll implement. The `BaseInputHandler` class defaults the
`inputState` to the `Game` state. Subclasses of this handler will set their `inputState` accordingly. We expose an instance
variable called `nextHandler` that can be used to switch between handlers. We'll make use of this when we start creating
new handlers. The nice thing about this variable is it allows a way for us to give a new handler to our engine, while
keeping the return type of `handleKeyboardInput` simple. This means `handleKeyboardInput` can just focus on returning
`Action` types.

Next we can create our first subclass of this base handler:

```typescript
export class GameInputHandler extends BaseInputHandler {
  constructor() {
    super();
  }

  handleKeyboardInput(event: KeyboardEvent): Action | null {
    if (window.engine.player.fighter.hp > 0) {
      if (event.key in MOVE_KEYS) {
        const [dx, dy] = MOVE_KEYS[event.key];
        return new BumpAction(dx, dy);
      }
      if (event.key === 'v') {
        this.nextHandler = new LogInputHandler();
      }
      if (event.key === '5' || event.key === '.') {
        return new WaitAction();
      }
      if (event.key === 'g') {
        return new PickupAction();
      }
      if (event.key === 'i') {
        this.nextHandler = new InventoryInputHandler(InputState.UseInventory);
      }
      if (event.key === 'd') {
        this.nextHandler = new InventoryInputHandler(InputState.DropInventory);
      }
    }

    return null;
  }
}
```

This is the class that will handle input while we are in the default `Game` state. Our constructor just calls the superclass
constructor to be sure all the base instance variables get set properly. Since we don't pass an `InputState` to the `super()`
call, the state defaults to `Game`. 

In `handleKeyboardInput` we check if the player is still alive, and if they are, we check what key they pressed. If they
pressed one of the movement keys we have mapped, we get the direction they should move from our mapping, and create a new
`BumpAction`. For the keys mapped to opening the message log or using the inventory, we set our `nextHandler` to a new instance
of a different subclass of `BaseInputHandler` We'll create those throughout the rest of this section. The important thing 
to understand here is that we can set `nextHandler` and then the engine will update to use that handler accordingly. 

```typescript
export class LogInputHandler extends BaseInputHandler {
  constructor() {
    super(InputState.Log);
  }

  handleKeyboardInput(event: KeyboardEvent): Action | null {
    if (event.key === 'Home') {
      return new LogAction(() => (window.engine.logCursorPosition = 0));
    }
    if (event.key === 'End') {
      return new LogAction(
        () =>
          (window.engine.logCursorPosition =
            window.engine.messageLog.messages.length - 1),
      );
    }

    const scrollAmount = LOG_KEYS[event.key];

    if (!scrollAmount) {
      this.nextHandler = new GameInputHandler();
    }

    return new LogAction(() => {
      if (scrollAmount < 0 && window.engine.logCursorPosition === 0) {
        window.engine.logCursorPosition =
          window.engine.messageLog.messages.length - 1;
      } else if (
        scrollAmount > 0 &&
        window.engine.logCursorPosition ===
        window.engine.messageLog.messages.length - 1
      ) {
        window.engine.logCursorPosition = 0;
      } else {
        window.engine.logCursorPosition = Math.max(
          0,
          Math.min(
            window.engine.logCursorPosition + scrollAmount,
            window.engine.messageLog.messages.length - 1,
          ),
        );
      }
    });
  }
}
```

In our `LogInputHandler` constructor, we pass `InputState.Log` to the superclass constructor. This makes sure that we 
have the proper state set. The logic for `handleKeyboardInput` is mostly similar to our prior handler. The big thing
to notice here is that instead of directly manipulating the cursor position, we are giving arrow functions to our `LogAction`
constructors. These functions will get called when the engine calls `perform` on the returned action.

Next we'll create a handler for dealing with the inventory:

```typescript
export class InventoryInputHandler extends BaseInputHandler {
  constructor(inputState: InputState) {
    super(inputState);
  }

  handleKeyboardInput(event: KeyboardEvent): Action | null {
    if (event.key.length === 1) {
      const ordinal = event.key.charCodeAt(0);
      const index = ordinal - 'a'.charCodeAt(0);

      if (index >= 0 && index <= 26) {
        const item = window.engine.player.inventory.items[index];
        if (item) {
          this.nextHandler = new GameInputHandler();
          if (this.inputState === InputState.UseInventory) {
            return item.consumable.getAction();
          } else if (this.inputState === InputState.DropInventory) {
            return new DropItem(item);
          }
        } else {
          window.engine.messageLog.addMessage('Invalid entry.', Colors.Invalid);
          return null;
        }
      }
    }
    this.nextHandler = new GameInputHandler();
    return null;
  }
}
```

The constructor for `InventoryInputHandler` takes in an `InputState` parameter and passes it to the base class constructor.
If you look back to our `GameInputHandler` class, when we instantiate this class, we pass either the `UseInventory` or
`DropInventory` values. Doing this means we don't have to have two separate classes for handling our inventory. In the
`handleKeyboardInput` method, the code remains much the same as our prior handler. The big change here is instead of 
directly setting the handler in the engine, we set the `nextHandler` property. 

Now that all our input handlers are created, we need to update `engine.ts` to make use of them. We'll start with our imports:

```typescript
import {
  BaseInputHandler,
  GameInputHandler,
  InputState,
} from './input-handler';
import { Action } from './actions';
```

We import that base handler, the game handler, and the enum representing the input state. We also will need the `Action`
type.

At the top of our `Engine` class, remove the declaration of the `_state` instance variable and when we initialize it. We'll
be using the `InputState` on the handler from now on. Add a new instance variable and initialize it for the input handler:

```typescript
export class Engine {
  // statics and other instance variable omitted for brevity
  inputHandler: BaseInputHandler

  constructor(public player: Actor) {
    this.inputHandler = new GameInputHandler();
  }
}
```

Next, remove the `state` getter and setter functions as we won't be needing them. Then we can modify the `update` method
to look like this:

```typescript
update(event: KeyboardEvent) {
  const action = this.inputHandler.handleKeyboardInput(event);
  if (action instanceof Action) {
    try {
      action.perform(this.player);
      this.handleEnemyTurns();
      this.gameMap.updateFov(this.player);
    } catch {}
  }

  this.inputHandler = this.inputHandler.nextHandler;

  this.render();
}
```

Since we have standardized all our input handlers to return an action, we can simplify our `update` code to just perform
an action if one was returned. We then update our `inputHandler` instance variable to point to the `nextHandler` that was
set on the current handler. If the input handler stays the same, then nothing changes. However, if the current handler
has determined that further input should be processed by a different handler, this will allow that to happen. 

Now we need to update our `render` method to use the handler's `inputState` property instead of the engine state we were 
using before:

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

  if (this.inputHandler.inputState === InputState.Log) {
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
  if (this.inputHandler.inputState === InputState.UseInventory) {
    this.renderInventory('Select an item to use');
  }
  if (this.inputHandler.inputState === InputState.DropInventory) {
    this.renderInventory('Select an item to drop');
  }
}
```

The code here is the same as it was other than changing where we check the state. The last thing we need to do for this
refactor is remove the `EngineState` enum from `engine.ts`. Do that and then run the application. Everything should work
the same as it did before the refactor. You can find the complete code for this section [here](https://github.com/bodiddlie/js-rogue-tutorial/tree/part9-1).

### Ride the Lightning

Now that we have our code cleaned up, we can start adding some more functionality to our game. The first thing we're
going to add is the ability for our player to hit a monster with a bolt of lightning, dealing a large amount of damage.
We'll create a new type of item that the player will use to do this. Using this "scroll" will automatically target the
closest enemy to the player that is within their field of view. 

We'll start by adding some new colors to our enum in `colors.ts:

```typescript
export enum Colors {
  White = '#ffffff',
  Black = '#000000',
  Red = '#ff0000',
  PlayerAttack = '#e0e0e0',
  EnemyAttack = '#ffc0c0',
  NeedsTarget = '#3FFFFF',
  StatusEffectApplied = '#3FFF3F',
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

Next we'll make a small change to our `ItemAction` class in `actions.ts`:

```typescript
export class ItemAction extends Action {
  constructor(public item: Item) {
    super();
  }

  perform(entity: Entity) {
    this.item.consumable.activate(entity);
  }
}
```

We've updated the call to `activate` to only pass the entity performing the action. Next let's add a new utility method
to the `Entity` class:

```typescript
distance(x: number, y: number) {
  return Math.sqrt((x - this.x) ** 2 + (y - this.y) ** 2);
}
```

This method calculates the distance from the entity to a given x/y coordinate by applying the pythagorean theorem (`a^2 + b^2 = c^2`).

Next we'll make some changes in `consumable.ts`. We'll start by changing `Consumable` from an interface to an abstract
class:

```typescript
export abstract class Consumable {
  protected constructor(public parent: Item | null) {}

  getAction(): Action | null {
    if (this.parent) {
      return new ItemAction(this.parent);
    }
    return null;
  }

  abstract activate(entity: Entity): void;

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
}
```

We do this because the logic of the constructor and the `consume` event will be the same across our subclasses, so we can
contain that logic here in the base class as opposed to duplicating it across subclasses. We also update the `activate`
method signature to only take in the entity activating the consumable. With that change, we now need to update the 
`HealingConsumable` class:

```typescript
export class HealingConsumable extends Consumable {
  constructor(public amount: number, public parent: Item | null = null) {
    super(parent);
  }

  activate(entity: Entity) {
    // contents omitted for brevity
  }
}
```

We change `implements` to `extends` now that we're dealing with a base class and update the constructor to pass the `parent`
to the superclass constructor. Other than updating the signature for `activate` everything stays the same.

Now we can create our new consumable class for the lightning scroll. We'll start with the constructor:

```typescript
export class LightningConsumable extends Consumable {
  constructor(
    public damage: number,
    public maxRange: number,
    parent: Item | null = nul,
  ) {
    super(parent);
  }
}
```

The constructor for our new consumable takes in the amount of damage it will deal and the maximum range that it will look
for a target. It also passes the `parent` item along to the superclass. With that in place we can implement the `activate`
method of the consumable:

```typescript
activate(entity: Entity) {
  let target: Actor | null = null;
  let closestDistance = this.maxRange + 1.0;

  for (const actor of window.engine.gameMap.actors) {
    if (
      !Object.is(actor, entity) &&
      window.engine.gameMap.tiles[actor.y][actor.x].visible
    ) {
      const distance = entity.distance(actor.x, actor.y);
      if (distance < closestDistance) {
        target = actor;
        closestDistance = distance;
      }
    }
  }

  if (target) {
    window.engine.messageLog.addMessage(
      `A lightning bolt strikes the ${target.name} with a loud thunder, for ${this.damage} damage!`,
    );
    target.fighter.takeDamage(this.damage);
    this.consume();
  } else {
    window.engine.messageLog.addMessage(
      'No enemy is close enough to strike.',
    );
    throw new Error('No enemy is close enough to strike.');
  }
}
```

We start by setting a variable for a target. This starts as null because we'll search for a target and if one isn't found
in range, we'll tell the player that it isn't possible to use the scroll without a target. We also set a variable for 
the closest distance we've found a target. It starts at our maximum range plus one tile. We add one tile so that we include
any monsters who just fractionally outside the max range due to the way distance is calculated. 

We then loop over each of the actors on the map and check if they are visible to the player, that they aren't actually
the same entity as the player (wouldn't want to hit ourselves for big lightning damage!). If that's true, then we calculate
the distance to the actor and if that distance is less than the closest distance we've found thus far, we set the target
to the current actor, and update our closest distance found. 

After looping through the actors, we check if we found a target. If so, we add a message to the log, apply damage to 
the target actor, and then consume the item. If not target was found, we add a message to the log and throw an error
so that we don't perform any action this turn.

With our consumable created we can jump over to `entity.ts` and create a spawn function for a new lightning scroll
item. Make sure you add `LightningConsumable` to the imports first, then add our new function:

```typescript
export function spawnLightningScroll(gameMap: GameMap, x: number, y: number) {
  return new Item(
    x,
    y,
    '~',
    '#FFFF00',
    '#000',
    'Lightning Scroll',
    new LightningConsumable(20, 5),
    gameMap,
  );
}
```

Our new lightning scroll will deal 20 damage to the closest target to the player that is at most five tiles away. 

Last thing to do to get this new item working is to place it on the map in `procgen.ts`. Update the for loop when we add
items to the map in the `placeEntities` function like so:

```typescript
for (let i = 0; i < numberOfItemsToAdd; i++) {
  const x = generateRandomNumber(bounds.x1 + 1, bounds.x2 - 1);
  const y = generateRandomNumber(bounds.y1 + 1, bounds.y2 - 1);

  if (!dungeon.entities.some((e) => e.x == x && e.y == y)) {
    if (Math.random() < 0.7) {
      spawnHealthPotion(dungeon, x, y);
    } else {
      spawnLightningScroll(dungeon, x, y);
    }
  }
}
```

Run the game and move around the map to find a lightning scroll. You should be able to pick it up and use it just like
the potions we did in the last chapter, but now you'll blast monsters instead of healing yourself! You can find the
complete code for this section [here](https://github.com/bodiddlie/js-rogue-tutorial/tree/part9-2).

### Look Ma No Mouse

Blasting baddies with lightning is cool, but we aren't targeting monsters directly. Before we can create items to do that,
let's add some functionality to look around the map using the keyboard. Most roguelike games include this. It won't do
anything that we can't already do with our mouse pointer, but we'll leverage this for our targeting functionality later.
Start by opening up `input-handler.ts` and adding an import for the engine and a new state to our `InputState` enum:

```typescript
import { Engine } from './engine';

export enum InputState {
  Game,
  Dead,
  Log,
  UseInventory,
  DropInventory,
  Target,
}
```

We'll be using the static values on the `Engine` class to get the width and height of our map and we've added a new `Target`
state to the enum. Next we'll add a new if statement in `handleKeyboardInput` for the `GameInputHandler` to enable
turning on our new "look" mode:

```typescript
// rest of handler omitted for brevity
if (event.key === 'd') {
  this.nextHandler = new InventoryInputHandler(InputState.DropInventory);
}
if (event.key === '/') {
  this.nextHandler = new LookHandler();
}
```

Similar to the other mode switches, we set `nextHandler` to a new instance of a handler when the slash key is pressed.
Before we create the `LookHandler` class though, we'll create a subclass that will be based off of. Add this to the end
of the file:

```typescript
export abstract class SelectIndexHandler extends BaseInputHandler {
  protected constructor() {
    super(InputState.Target);
    const { x, y } = window.engine.player;
    window.engine.mousePosition = [x, y];
  }

  handleKeyboardInput(event: KeyboardEvent): Action | null {
    if (event.key in MOVE_KEYS) {
      const moveAmount = MOVE_KEYS[event.key];
      let modifier = 1;
      if (event.shiftKey) modifier = 5;
      if (event.ctrlKey) modifier = 10;
      if (event.altKey) modifier = 20;

      let [x, y] = window.engine.mousePosition;
      const [dx, dy] = moveAmount;
      x += dx * modifier;
      y += dy * modifier;
      x = Math.max(0, Math.min(x, Engine.MAP_WIDTH - 1));
      y = Math.max(0, Math.min(y, Engine.MAP_HEIGHT - 1));
      window.engine.mousePosition = [x, y];
      return null;
    } else if (event.key === 'Enter') {
      return this.onIndexSelected();
    }

    this.nextHandler = new GameInputHandler();
    return null;
  }

  abstract onIndexSelected(): Action | null;
}
```

This class will be the base for any targeting input we need to do. It contains all the logic needed for moving the cursor
around and selecting a target. The subclasses of this class will then only need to focus on what to do when a target is
selected. 

The constructor sets the state to our new `Target` state and then sets the mouse cursor position to where the player is.
In `handleKeyboardInput` we get the direction pressed and then also check if they hit any of the shift, ctrl, or alt keys.
If they did, we multiply the amount moved by an amount determined by which key they pressed. We then update the mouse
position to where they moved, clamping the position so that it stays withing the bounds of the map.

If the player hit the `Enter` key we delegate this to our `onIndexSelected` method that will be implemented in subclasses.
If they hit a key that isn't a movement key or `Enter` we just exit the mode and return to the game mode. With that in place,
we can create the `LookHandler` class:

```typescript
export class LookHandler extends SelectIndexHandler {
  constructor() {
    super();
  }

  onIndexSelected(): Action | null {
    this.nextHandler = new GameInputHandler();
    return null;
  }
}
```

This class is very simple as all we want to do is look around the map. All we need to do in `onIndexSelected` is update the
handler to be in "Game" mode. 

The last thing we need to do to get our look mode working is update `engine.ts`. Add this if statement to the end of the
`render` method:

```typescript
if (this.inputHandler.inputState === InputState.Target) {
  const [x, y] = this.mousePosition;
  const data = this.display._data[`${x},${y}`];
  const char = data ? data[2] || ' ' : ' ';
  this.display.drawOver(x, y, char[0], '#000', '#fff');
}
```

Here we check if the input handler is in target mode. If it is, we get the current mouse position and use that to extract
data from the display. This is an internal implementation detail of the ROT.js `Display` class. It's usually not a great
idea to tie to internal details like this as a change in the implementation could break your code. However, ROT.js doesn't
currently have a way to modify the background of a tile or draw over a tile without losing some data contained in that
tile. The key into the `_data` property on the display is a string in the form of `"x,y"` where x and y are numbers representing
position in the display. If we get data back from the display, it is an array. You can see this in the api docs [here](https://ondras.github.io/rot.js/doc/modules/_display_types_.html#displaydata).
The third index of that array contains the character we want to display as either a string or string array. If we didn't
get data back we set `char` to an empty string. We then redraw that character with a new foreground and background color
to highlight our cursor position. 

If you run the game now and press the slash key, you should see a white block where the cursor is. Use the move keys to
move the cursor around the map. Moving it over items or monsters should display their name just like when we use the mouse.
You can find the complete code for this section [here](https://github.com/bodiddlie/js-rogue-tutorial/tree/part9-3).

### Dude Where's My Target

Now that we have a base input mode for targeting, let's put it to use. First we'll do a little more cleanup. Whenever we
hit an impossible action, we print a message to the console and throw an error. This works for now, but when our AI attempts
an impossible action it will also print to the log. We only want the log to show things the player did. Create 
a new file called `exceptions.ts` and add the below to it:

```typescript
export class ImpossibleException {
  constructor(public message: string) {}
}
```

We'll use this exception class instead of the generic `Error` for throwing when an impossible action occurs. Let's import
this exception in `engine.ts` and then modify the `update` method:

```typescript
update(event: KeyboardEvent) {
  const action = this.inputHandler.handleKeyboardInput(event);
  if (action instanceof Action) {
    try {
      action.perform(this.player);
      this.handleEnemyTurns();
      this.gameMap.updateFov(this.player);
    } catch (error) {
      if (error instanceof ImpossibleException) {
        this.messageLog.addMessage(error.message, Colors.Impossible);
      }
    }
  }

  this.inputHandler = this.inputHandler.nextHandler;
  this.render();
}
```

We've updated the `catch` block to handle any errors thrown and if they are `ImpossibleException`s, add them to the 
message log. With that done we no longer need to add to the message log in our actions and can just throw an exception
instead. Go through all the actions in `actions.ts` and remove calls to `window.engine.messageLog.addMessage` and change
the exceptions throw from `Error` to `ImpossibleException`. I won't detail all these changes here, but I'll include
a link to the complete code at the end of the section as always. 

Still in `actions.ts` let's update `ItemAction` to be able to handle our targeting mode. First we'll update the constructor:

```typescript
constructor(
  public item: Item | null,
  public targetPosition: [number, number] | null = null,
) {
  super();
}
```

We've changed the type of `item` to be nullable and added a new property that represents the position of a target. This is
also nullable since not every item is used for targeting something. Next let's add a getter to get the actor at the target
position:

```typescript
public get targetActor(): Actor | undefined {
  if (!this.targetPosition) {
    return;
  }
  const [x, y] = this.targetPosition;
  return window.engine.gameMap.getActorAtLocation(x, y);
}
```

This getter will find the actor at a given position and return it if one is found. Otherwise, it will return `undefined`.
We also need to update the `perform` method:

```typescript
perform(entity: Entity) {
  this.item?.consumable.activate(this, entity);
}
```

Now that `item` is nullable we need to use the optional chaining operator to avoid any null pointer exceptions. We also
are updating the call to `activate` to pass the action to the consumable so that it can access the target information.

Due to the change in `ItemAction` we also need to update the `DropItem` action to avoid issues:

```typescript
export class DropItem extends ItemAction {
  perform(entity: Entity) {
    const dropper = entity as Actor;
    if (!dropper || !this.item) return;
    dropper.inventory.drop(this.item);
  }
}
```

We just need to add the check for the item before we drop, so we don't try to drop a non-existent item. 

Now we can start creating a new scroll for our player to use. We'll be creating a confusion scroll that the player can 
use and target a specific enemy. The enemy will then be confused for a number of turns, blindly wandering around the map
instead of chasing the player. To start this, we'll create a new AI class for a confused enemy to use. Go over to `ai.ts` 
and we'll add some new imports first:

```typescript
import {
  Action,
  BumpAction,
  MeleeAction,
  MovementAction,
  WaitAction,
} from '../actions';
import { generateRandomNumber } from '../procgen';
```

We'll also update the `BaseAI` class constructor and `perform` method:

```typescript
export abstract class BaseAI implements Action {
  path: [number, number][];

  protected constructor() {
    this.path = [];
  }

  abstract perform(entity: Entity): void;

  // omitted rest of class for brevity
}
```

These changes aren't necessary, but it cleans things up and makes it clear that this class is abstract and needs to have
certain functionality implemented by subclasses.

Next we'll add a constant that represents the directions an actor could move on the map. Add this to the end of the file:

```typescript
const directions: [number, number][] = [
  [-1, -1], // Northwest
  [0, -1], // North
  [1, -1], // Northeast
  [-1, 0], // West
  [1, 0], // East
  [-1, 1], // Southwest
  [0, 1], // South
  [1, 1], // Southeast
];
```

Now we can create our new AI class:

```typescript
export class ConfusedEnemy extends BaseAI {
  constructor(public previousAi: BaseAI | null, public turnsRemaining: number) {
    super();
  }
}
```

Our `ConfusedEnemy` will keep track of the previous ai type the actor had, so we can switch back when the effect ends. It 
also keeps track of how many turns of confusion remain. Next let's implement the `perform` method:

```typescript
perform(entity: Entity) {
  const actor = entity as Actor;
  if (!actor) return;

  if (this.turnsRemaining <= 0) {
    window.engine.messageLog.addMessage(
      `The ${entity.name} is no longer confused.`,
    );
    actor.ai = this.previousAi;
  } else {
    const [directionX, directionY] =
      directions[generateRandomNumber(0, directions.length)];
    this.turnsRemaining -= 1;
    const action = new BumpAction(directionX, directionY);
    action.perform(entity);
  }
}
```

We first check if we have an actor and if not, return early from the method. Then we check if there are still turns of 
confusion remaining. If there aren't, we add a message to the log indicating the actor is no longer confused and reset the ai
of the actor back to its previous ai. If there are still turns remaining, we get a random direction using our list of directions,
and attempt to move in that direction. We then reduce the turns remaining by one.

Now let's jump over to `input-handler.ts`. We'll start by updating our `SelectIndexHandler` class to handle targeted 
positions. Update the `handleKeyboardInput` method when we handle an `Enter` key press:

```typescript
} else if (event.key === 'Enter') {
  let [x, y] = window.engine.mousePosition;
  return this.onIndexSelected(x, y);
}
```

We get the current position of the cursor and then pass that to our `onIndexSelected` method. Let's update the signature
for that method now:

```typescript
abstract onIndexSelected(x: number, y: number): Action | null;
```

We'll also need to update the signature in the `LookHandler` as well:

```typescript
onIndexSelected(_x: number, _y: number): Action | null {
  this.nextHandler = new GameInputHandler();
  return null;
}
```

We prepend underscores here because we won't be using the position in the look mode.

Next we'll create a new type that we'll use in for handling actions when a target is selected:

```typescript
type ActionCallback = (x: number, y: number) => Action | null;
```

This type describes a function that takes in an x/y position and return either an `Action` or `null`. With this in place
we can now create a new input handler that will use it:

```typescript
export class SingleRangedAttackHandler extends SelectIndexHandler {
  constructor(public callback: ActionCallback) {
    super();
  }

  onIndexSelected(x: number, y: number): Action | null {
    this.nextHandler = new GameInputHandler();
    return this.callback(x, y);
  }
}
```

This new handler takes in an `ActionCallback`. When a target is selected, we return to game mode and then call the callback
function that was provided with the x/y position of the selected target. We'll see how we use this callback here in a moment.
Let's jump over to `consumable.ts` and add some imports:

```typescript
import { SingleRangedAttackHandler } from '../input-handler';
import { ConfusedEnemy } from './ai';
import { ImpossibleException } from '../exceptions'
```

Next we'll update the signature of the `activate` method on the `Consumable` class:

```typescript
abstract activate(action: ItemAction, entity: Entity): void;
```

We're taking in the `ItemAction` now because some consumables will need to know the target of the action. Let's update the
signature in our `HealingConsumable` and make use of the new exception we created as well:

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
    this.consume();
  } else {
    throw new ImpossibleException('Your health is already full.');
  }
}
```

We'll also do the same for the `LightningConsumable` class:

```typescript
activate(_action: ItemAction, entity: Entity) {
  // rest of method omitted for brevity
  } else {
    window.engine.messageLog.addMessage(
      'No enemy is close enough to strike.',
    );
    throw new ImpossibleException('No enemy is close enough to strike.');
  }
}
```

Next we'll create a new consumable for our confusion scroll:

```typescript
export class ConfusionConsumable extends Consumable {
  constructor(public numberOfTurns: number, parent: Item | null = null) {
    super(parent);
  }
}
```

The `ConfusionConsumable` takes in the number of turns it will apply confusion to a target. The `getAction` method
for this consumable is different from others so let's implement that now:

```typescript
getAction(): Action | null {
  window.engine.messageLog.addMessage(
    'Select a target location.',
    Colors.NeedsTarget,
  );
  window.engine.inputHandler = new SingleRangedAttackHandler((x, y) => {
    return new ItemAction(this.parent, [x, y]);
  });
  return null;
}
```

We add a message to the log telling the player they need to select a target. We then directly update the engine's input
handler to an instance of our new handler. We pass an arrow function to this handler that returns a new `ItemAction` that needs
be performed when a target is selected. This arrow function is the callback that will get called by our handler when the 
player confirms their target. We then return null since there's no action yet to be performed.

Now we can implement the `activate` for this consumable:

```typescript
activate(action: ItemAction, entity: Entity) {
  const target = action.targetActor;

  if (!target) {
    throw new ImpossibleException('You must select an enemy to target.');
  }
  if (!window.engine.gameMap.tiles[target.y][target.x].visible) {
    throw new ImpossibleException(
      'You cannot target an area you cannot see.',
    );
  }
  if (Object.is(target, entity)) {
    throw new ImpossibleException('You cannot confuse yourself!');
  }

  window.engine.messageLog.addMessage(
    `The eyes of the ${target.name} look vacant, as it starts to stumble around!`,
    Colors.StatusEffectApplied,
  );
  target.ai = new ConfusedEnemy(target.ai, this.numberOfTurns);
  this.consume();
}
```

We first try to get the target of the action. If there isn't a valid target we throw an exception so no action is taken.
If we do have a valid target, we add a message to the log that the target has been confused. We then update the ai of
the target to an instance of our new ai. Finally, we consume the item, so it is removed from the inventory.

Next we'll jump over to `entity.ts` and create our spawn function for the confusion scroll. Remember to import the 
`ConfusionConsumable` at the top of the file. Then add our new function:

```typescript
export function spawnConfusionScroll(gameMap: GameMap, x: number, y: number) {
  return new Item(
    x,
    y,
    '~',
    '#cf3fff',
    '#000',
    'Confusion Scroll',
    new ConfusionConsumable(10),
    gameMap,
  );
}
```

This item will confuse the target for 10 turns. Open up `procgen.ts` and import the new spawn function at the top. Then 
we'll update `generateRandomNumber` to be exported so it can be used in our new ai class:

```typescript
export function generateRandomNumber(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}
```

The last thing we need to do to get the new scroll to work is add them to the level. Update the item loop in `placeEntities` 
like this:

```typescript
if (!dungeon.entities.some((e) => e.x == x && e.y == y)) {
  const itemChance = Math.random();
  if (itemChance < 0.7) {
    spawnHealthPotion(dungeon, x, y);
  } else if (itemChance < 0.9) {
    spawnConfusionScroll(dungeon, x, y);
  } else {
    spawnLightningScroll(dungeon, x, y);
  }
}
```

Run the game and find one of our new scrolls. If you use the scroll, the game should switch to target mode. Move the cursor
over to an enemy and press enter. They should now be confused and move around randomly until the scroll wears off. You can
find the complete code for this section [here](https://github.com/bodiddlie/js-rogue-tutorial/tree/part9-4).

### Great Balls of Fire

We'll add one more item in this chapter: a fireball that does area-of-effect damage. Using this item will target an area
around the chosen location, and deal damage to all actors in the area. Even the player! We'll start it `input-handler.ts` by
adding an import at the top of the file:


```typescript
import { Display } from 'rot-js';
```

We'll be using the display in our new input handler to show the targeted area. Next we'll update our `BaseInputHandler` to
have a new method:

```typescript
onRender(_display: Display) {}
```

We add this do nothing method in the base class because most of our handlers won't need to do any rendering, but this way
our engine doesn't need to care about knowing that. It can just call the `onRender` method and let the handlers worry
about the details. 

Next we'll create a new handler:

```typescript
export class AreaRangedAttackHandler extends SelectIndexHandler {
  constructor(public radius: number, public callback: ActionCallback) {
    super();
  }

  onRender(display: Display) {
    const startX = window.engine.mousePosition[0] - this.radius - 1;
    const startY = window.engine.mousePosition[1] - this.radius - 1;

    for (let x = startX; x < startX + this.radius ** 2; x++) {
      for (let y = startY; y < startY + this.radius ** 2; y++) {
        const data = display._data[`${x},${y}`];
        const char = data ? data[2] || ' ' : ' ';
        display.drawOver(x, y, char[0], '#fff', '#f00');
      }
    }
  }

  onIndexSelected(x: number, y: number): Action | null {
    this.nextHandler = new GameInputHandler();
    return this.callback(x, y);
  }
}
```

This handler is similar to the `SingleRangedAttackHandler` with one difference being that it also takes a `radius` to 
keep track of. The other difference is the `onRender` method. Here we calculate the start position of target area using
the mouse position and radius of the area. We then loop over each tile in the area, and redraw that tile with a white
foreground and a red background.

Next we'll update `consumable.ts` by adding our new handler to the imports at the top of the file. Then add a new 
consumable class at the end of the file:

```typescript
export class FireballDamageConsumable extends Consumable {
  constructor(
    public damage: number,
    public radius: number,
    parent: Item | null = null,
  ) {
    super(parent);
  }
}
```

Our new `FirebasllDamageConsumable` takes in the damage to deal and the radius it will deal damage in. Like our confusion 
scroll, the `getAction` method needs to be implemented:

```typescript
getAction(): Action | null {
  window.engine.messageLog.addMessage(
    'Select a target location.',
    Colors.NeedsTarget,
  );
  window.engine.inputHandler = new AreaRangedAttackHandler(
    this.radius,
    (x, y) => {
      return new ItemAction(this.parent, [x, y]);
    },
  );
  return null;
}
```

This code is the same as the confusion scroll's method, with the exception being the handler we use. Now we can implement
the `activate` method:

```typescript
activate(action: ItemAction, _entity: Entity) {
  const { targetPosition } = action;

  if (!targetPosition) {
    throw new ImpossibleException('You must select an area to target.');
  }
  const [x, y] = targetPosition;
  if (!window.engine.gameMap.tiles[y][x].visible) {
    throw new ImpossibleException(
      'You cannot target an area that you cannot see.',
    );
  }

  let targetsHit = false;
  for (let actor of window.engine.gameMap.actors) {
    if (actor.distance(x, y) <= this.radius) {
      window.engine.messageLog.addMessage(
        `The ${actor.name} is engulfed in a fiery explosion, taking ${this.damage} damage!`,
      );
      actor.fighter.takeDamage(this.damage);
      targetsHit = true;
    }

    if (!targetsHit) {
      throw new ImpossibleException('There are no targets in the radius.');
    }
    this.consume();
  }
}
```

We first destructure the `targetPosition` off of the action that was passed in. If we don't have a valid target position,
we throw an exception saying so. If we do have a valid position, we loop over all the actors in the map to see if they 
are inside the radius of the fireball. If they are, we add a message to the log saying they were hit and for how much 
damage. Then we apply damage to the actor and update our boolean to indicate we hit at least one target. If no targets
were hit by the end of the loop we throw an exception and make sure we don't consume the scroll. If we did hit at least
one target, we consume the scroll and remove it from the inventory. 

Next we'll add a spawn function to `entity.ts` for our new scroll. Don't forget to import the `FireballDamageConsumable` 
at the top of the file first:

```typescript
export function spawnFireballScroll(gameMap: GameMap, x: number, y: number) {
  return new Item(
    x,
    y,
    '~',
    '#ff0000',
    '#000',
    'Fireball Scroll',
    new FireballDamageConsumable(12, 3),
    gameMap,
  );
}
```

Our new scroll will deal 12 damage to any actors in a three tile radius of the target position. Now let's add some fireball
scrolls to the map. Open up `procgen.ts` and update `placeEntities` again, remembering to import our spawn function:

```typescript
if (!dungeon.entities.some((e) => e.x == x && e.y == y)) {
  const itemChance = Math.random();
  if (itemChance < 0.7) {
    spawnHealthPotion(dungeon, x, y);
  } else if (itemChance < 0.8) {
    spawnFireballScroll(dungeon, x, y);
  } else if (itemChance < 0.9) {
    spawnConfusionScroll(dungeon, x, y);
  } else {
    spawnLightningScroll(dungeon, x, y);
  }
}
```

The last thing we need to do is update the `render` method in `engine.ts` to use our new `onRender` method on our handler.
Put this line at the very end of the `render` method:

```typescript
this.inputHandler.onRender(this.display);
```

Run the game now and find a fireball scroll. When you use it you should see a large red square that you can move around.
This is the area that the scroll will cause damage in. Be careful to not kill yourself with it!

You can find the complete code for this chapter [here](https://github.com/bodiddlie/js-rogue-tutorial/tree/part9).