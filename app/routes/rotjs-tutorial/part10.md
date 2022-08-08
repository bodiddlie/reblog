---
title: 'ROT.js Tutorial Part 10: Saving and Loading'
date: 2022-08-07T08:00:00.000Z
meta:
  title: 'ROT.js Tutorial Part 10: Saving and Loading'
  date: "August 7, 2022"
  description: "In this chapter we'll add the functionality to save and load our game. However, before we can add that important functionality, we need to do some more refactoring. I've been writing these chapters as I work through the Python version of the libtcod tutorial. I do the chapter from the Python tutorial, then implement that same chapter myself in TypeScript. Once that implementation is finished for the chapter, I write a chapter here on this blog. Because I haven't gone through the complete Python tutorial, I've made some assumptions in early parts of the TypeScript implementation that aren't fitting as well as I get further into the chapters."
---

# {attributes.title}
{attributes.date.toDateString()}

In this chapter we'll add the functionality to save and load our game. Before we can add that important
functionality, we need to do some more refactoring. I've been writing these chapters as I work through the Python
version of the libtcod tutorial. I do the chapter from the Python tutorial, then implement that same chapter myself
in TypeScript. Once that implementation is finished for the chapter, I write a chapter here on this blog. Because I 
haven't gone through the complete Python tutorial, I've made some assumptions in early parts of the TypeScript implementation
that aren't fitting as well as I get further into the chapters. 

Rather than rework the tutorials, however, I think this is a good opportunity to highlight that software engineering 
rarely goes according to plan and that refactoring is something to be embraced. It's a chance to think about your 
design and improve upon what you've already built. So with that said, we'll be spending the first three sections of
this chapter refactoring and making the codebase better going forward. The last two sections will be about adding a 
menu screen to our game and then saving and loading.

### Refactoring the Message Log

Right now, our `Engine` class is responsible for exposing an instance variable for the message log so that other places
throughout the game can add messages. Rather than keeping that as part of the engine, let's just make the message log
global as well. We'll start by adding a message log to the `Window` interface in `main.ts`:

```typescript
import { MessageLog } from './message-log';
import { Colors } from './colors';

declare global {
  interface Window {
    engine: Engine;
    messageLog: MessageLog;
  }
}
```

Then we can create a message log instance at the same time we create the engine:

```typescript
window.addEventListener('DOMContentLoaded', () => {
  window.messageLog = new MessageLog();
  window.engine = new Engine(spawnPlayer(Engine.WIDTH / 2, Engine.HEIGHT / 2));
  window.messageLog.addMessage(
    'Hello and welcome, adventurer, to yet another dungeon!',
    Colors.WelcomeText,
  );
  window.engine.render();
});
```

Now that we have a global message log, let's update all the places in our code that we call `addMessage` to use that
new global log. I won't explicitly show every change here, but search through the whole project and replace any calls
to `window.engine.messageLog.addMessage` with `window.messageLog.addMessage`. You should have changes in `actions.ts`,
`ai.ts`, `consumable.ts`, `fighter.ts`, `inventory.ts`, and `input-handler.ts`. In `input-handler.ts` you'll
also need to update `LogAction` to reference the global message log length.

While we're in `input-handler.ts` there's a small change we make to the `AreaRangedAttackHandler`. Thanks to reddit 
user [JasonSantilli](https://www.reddit.com/r/roguelikedev/comments/w8c6jo/roguelikedev_does_the_complete_roguelike_tutorial/iipmabj/)
for the insight that we don't need to access the internal ROT.js data when drawing our targeting box. Update the `onRender`
method to look like the below:

```typescript
onRender(display: Display) {
  const startX = window.engine.mousePosition[0] - this.radius - 1;
  const startY = window.engine.mousePosition[1] - this.radius - 1;

  for (let x = startX; x < startX + this.radius ** 2; x++) {
    for (let y = startY; y < startY + this.radius ** 2; y++) {
      display.drawOver(x, y, null, '#fff', '#f00');
    }
  }
}
```

For the last part of this refactor we'll jump over to `engine.ts`. We can delete the `MessageLog` import at the top,
and remove the instantiation and message adding in the constructor of the `Engine` class. Also make sure to update
any references to `this.messageLog` to be `window.messageLog`. The last thing we can do here is similar to the change
we made to the `AreaRangedAttackHandler`. In the `render` method, when we check if the input handler is in `TARGET` 
state or not, we can draw without accessing the internal ROT.js data:

```typescript
if (this.inputHandler.inputState === InputState.Target) {
  const [x, y] = this.mousePosition;
  this.display.drawOver(x, y, null, '#000', '#fff');
}
```

Run the game and it should run just as before.

### Move Mouse and Log Cursor Into Input Handlers

Something else that the engine is currently responsible for tracking is mouse and log position. It makes a lot more sense
to contain that information in the input handlers that would be dealing with mouse input. Open up `input-handler.ts`
and we'll start by adding some instance variables to the `BaseInputHandler` abstract class:

```typescript
export abstract class BaseInputHandler {
  nextHandler: BaseInputHandler;
  mousePosition: [number, number];
  logCursorPosition: number;

  protected constructor(public inputState: InputState = InputState.Game) {
    this.nextHandler = this;
    this.mousePosition = [0, 0];
    this.logCursorPosition = window.messageLog.messages.length - 1;
  }
```

We'll track the mouse and log position in the base handler so that the engine doesn't need to know about a specific
handler type, as well as if we wanted to add mouse functionality to other handlers in the future. We'll also add a new
method to the base class:

```typescript
handleMouseMovement(position: [number, number]) {
  this.mousePosition = position;
}
```

This method will get called by the engine to update the position when the `mousemove` event fires. Next we'll update
the `LogInputHandler` to use `this.logCursorPosition` instead of `window.engine.logCursorPosition`:

```typescript
handleKeyboardInput(event: KeyboardEvent): Action | null {
  if (event.key === 'Home') {
    return new LogAction(() => (this.logCursorPosition = 0));
  }
  if (event.key === 'End') {
    return new LogAction(
      () => (this.logCursorPosition = window.messageLog.messages.length - 1),
    );
  }

  const scrollAmount = LOG_KEYS[event.key];
  if (!scrollAmount) {
    this.nextHandler = new GameInputHandler();
  }

  return new LogAction(() => {
    if (scrollAmount < 0 && this.logCursorPosition === 0) {
      this.logCursorPosition = window.messageLog.messages.length - 1;
    } else if (
      scrollAmount > 0 &&
      this.logCursorPosition === window.messageLog.messages.length - 1
    ) {
      this.logCursorPosition = 0;
    } else {
      this.logCursorPosition = Math.max(
        0,
        Math.min(
          this.logCursorPosition + scrollAmount,
            window.messageLog.messages.length - 1,
        ),
      );
    }
  });
}
```

Then we need to update the `SelectIndexHandler` class to use `this.mousePosition`:

```typescript
export abstract class SelectIndexHandler extends BaseInputHandler {
  protected constructor() {
    super(InputState.Target);
    const { x, y } = window.engine.player;
    this.mousePosition = [x, y];
  }

  handleKeyboardInput(event: KeyboardEvent): Action | null {
    if (event.key in MOVE_KEYS) {
      const moveAmount = MOVE_KEYS[event.key];
      let modifier = 1;
      if (event.shiftKey) modifier = 5;
      if (event.ctrlKey) modifier = 10;
      if (event.altKey) modifier = 20;

      let [x, y] = this.mousePosition;
      const [dx, dy] = moveAmount;
      x += dx * modifier;
      y += dy * modifier;
      x = Math.max(0, Math.min(x, Engine.MAP_WIDTH - 1));
      y = Math.max(0, Math.min(y, Engine.MAP_HEIGHT - 1));
      this.mousePosition = [x, y];
      return null;
    } else if (event.key === 'Enter') {
      let [x, y] = this.mousePosition;
      return this.onIndexSelected(x, y);
    }

    this.nextHandler = new GameInputHandler();
    return null;
  }
```

Then we'll update the `onRender` method of `AreaRangedAttackHandler` to use the new mouse position as well:

```typescript
onRender(display: Display) {
  const startX = this.mousePosition[0] - this.radius - 1;
  const startY = this.mousePosition[1] - this.radius - 1;

  for (let x = startX; x < startX + this.radius ** 2; x++) {
    for (let y = startY; y < startY + this.radius ** 2; y++) {
      display.drawOver(x, y, null, '#fff', '#f00');
    }
  }
}
```

Next we'll open up `render-functions.ts` and make a change to `renderNamesAtLocation`:

```typescript
export function renderNamesAtLocation(
  x: number,
  y: number,
  mousePosition: [number, number],
) {
  const [mouseX, mouseY] = mousePosition;
  if (
    window.engine.gameMap.isInBounds(mouseX, mouseY) &&
    window.engine.gameMap.tiles[mouseY][mouseX].visible
  ) {
    const names = window.engine.gameMap.entities
      .filter((e) => e.x === mouseX && e.y === mouseY)
      .map((e) => e.name.charAt(0).toUpperCase() + e.name.substring(1))
      .join(', ');
    window.engine.display.drawText(x, y, names);
  }
}
```

We're now getting the mouse position passed in as a parameter instead of grabbing it from the global engine. Now we can
update `engine.ts` to reflect all these changes. Start by removing the `mousePosition` and `logCursorPosition` instance
variables and their assignment in the constructor. Also update any references to `this.mousePosition` and `this.logCursorPosition`
to be `this.inputHandler.mousePosition` and `this.inputHandler.logCursorPosition`. 

We need to update our event handler for the `mousemove` event to tell our input handler to update:

```typescript
window.addEventListener('mousemove', (event) => {
  this.inputHandler.handleMouseMovement(
    this.display.eventToPosition(event),
  );
  this.render();
});
```

We simply take the translated mouse position and pass it to our input handler. Lastly, update the call to `renderNamesAtLocation` 
to pass in the mouse position:

```typescript
renderNamesAtLocation(21, 44, this.inputHandler.mousePosition);
```

The application should still run as it did before.

### Game Screen

There's one more bit of refactoring we need to do. Right now our engine creates and holds on to the game map. Soon we'll
be introducing a menu screen to allow choosing between starting a new game or loading a saved game. Because of this, it
makes sense to encapsulate the game logic in its own class instead of the engine. Create a new directory called `screens` and 
a new file called `base-screen.ts` and putting these contents in it:

```typescript
import { Display } from 'rot-js';
import { Actor } from '../entity';
import { BaseInputHandler } from '../input-handler';

export abstract class BaseScreen {
  abstract inputHandler: BaseInputHandler;

  protected constructor(public display: Display, public player: Actor) {}

  abstract update(event: KeyboardEvent): void;

  abstract render(): void;
}
```

This class will be the base for any screens we want to have in our game. Subclasses of this will be responsible for supplying
update and render implementations. Now we can create our `GameScreen` that will inherit from this base class. I'll post the
full contents of the file here, but I'm not going to break down every line. This is basically lifting most of the code
from `engine.ts` and slightly changing it to work in this new implementation. 

```typescript
import { BaseScreen } from './base-screen';
import { GameMap } from '../game-map';
import { Display } from 'rot-js';
import { generateDungeon } from '../procgen';
import { Actor } from '../entity';
import {
  BaseInputHandler,
  GameInputHandler,
  InputState,
} from '../input-handler';
import { Action } from '../actions';
import { ImpossibleException } from '../exceptions';
import { Colors } from '../colors';
import {
  renderFrameWithTitle,
  renderHealthBar,
  renderNamesAtLocation,
} from '../render-functions';

export class GameScreen extends BaseScreen {
  public static readonly MAP_WIDTH = 80;
  public static readonly MAP_HEIGHT = 43;
  public static readonly MIN_ROOM_SIZE = 6;
  public static readonly MAX_ROOM_SIZE = 10;
  public static readonly MAX_ROOMS = 30;
  public static readonly MAX_MONSTERS_PER_ROOM = 2;
  public static readonly MAX_ITEMS_PER_ROOM = 2;

  gameMap: GameMap;
  inputHandler: BaseInputHandler;

  constructor(display: Display, player: Actor) {
    super(display, player);

    this.gameMap = generateDungeon(
      GameScreen.MAP_WIDTH,
      GameScreen.MAP_HEIGHT,
      GameScreen.MAX_ROOMS,
      GameScreen.MIN_ROOM_SIZE,
      GameScreen.MAX_ROOM_SIZE,
      GameScreen.MAX_MONSTERS_PER_ROOM,
      GameScreen.MAX_ITEMS_PER_ROOM,
      this.player,
      this.display,
    );

    this.inputHandler = new GameInputHandler();
    this.gameMap.updateFov(this.player);
  }

  handleEnemyTurns() {
    this.gameMap.actors.forEach((e) => {
      if (e.isAlive) {
        try {
          e.ai?.perform(e, this.gameMap);
        } catch {}
      }
    });
  }

  update(event: KeyboardEvent) {
    const action = this.inputHandler.handleKeyboardInput(event);
    if (action instanceof Action) {
      try {
        action.perform(this.player, this.gameMap);
        this.handleEnemyTurns();
        this.gameMap.updateFov(this.player);
      } catch (error) {
        if (error instanceof ImpossibleException) {
          window.messageLog.addMessage(error.message, Colors.Impossible);
        }
      }
    }

    this.inputHandler = this.inputHandler.nextHandler;

    this.render();
  }

  render() {
    this.display.clear();
    window.messageLog.render(this.display, 21, 45, 40, 5);

    renderHealthBar(
      this.display,
      this.player.fighter.hp,
      this.player.fighter.maxHp,
      20,
    );

    renderNamesAtLocation(21, 44, this.inputHandler.mousePosition);

    this.gameMap.render();

    if (this.inputHandler.inputState === InputState.Log) {
      renderFrameWithTitle(3, 3, 74, 38, 'Message History');
      window.messageLog.renderMessages(
        this.display,
        4,
        4,
        72,
        36,
        window.messageLog.messages.slice(
          0,
          this.inputHandler.logCursorPosition + 1,
        ),
      );
    }
    if (this.inputHandler.inputState === InputState.UseInventory) {
      this.renderInventory('Select an item to use');
    }
    if (this.inputHandler.inputState === InputState.DropInventory) {
      this.renderInventory('Select an item to drop');
    }
    if (this.inputHandler.inputState === InputState.Target) {
      const [x, y] = this.inputHandler.mousePosition;
      this.display.drawOver(x, y, null, '#000', '#fff');
    }
    this.inputHandler.onRender(this.display);
  }

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
}
```

Now that our map is contained in this new `GameScreen` we'll make some changes throughout our codebase so that we aren't
referencing the old map on the engine. Let's start in `render-functions.ts` and update the `renderNamesAtLocation` function:

```typescript
export function renderNamesAtLocation(
        x: number,
        y: number,
        mousePosition: [number, number],
        gameMap: GameMap
) {
  const [mouseX, mouseY] = mousePosition;
  if (
          gameMap.isInBounds(mouseX, mouseY) &&
          gameMap.tiles[mouseY][mouseX].visible
  ) {
    const names = gameMap.entities
            .filter((e) => e.x === mouseX && e.y === mouseY)
            .map((e) => e.name.charAt(0).toUpperCase() + e.name.substring(1))
            .join(', ');

    window.engine.display.drawText(x, y, names);
  }
}
```

We'll be passing in our game map when needed now instead of looking for a global one on `window.engine`. We'll make a 
similar change in `inventory.ts`:

```typescript
import { BaseComponent } from './base-component';
import { Actor, Item } from '../entity';
import { GameMap } from '../game-map';

export class Inventory extends BaseComponent {
  parent: Actor | null;
  items: Item[];

  constructor(public capacity: number) {
    super();
    this.parent = null;

    this.items = [];
  }

  drop(item: Item, gameMap: GameMap) {
    const index = this.items.indexOf(item);
    if (index >= 0) {
      this.items.splice(index, 1);
      if (this.parent) {
        item.place(this.parent.x, this.parent.y, gameMap);
      }

      window.messageLog.addMessage(`You dropped the ${item.name}."`);
    }
  }
}
```

Now the `drop` method takes in a game map instead of using the global one. Now let's jump over to `consumable.ts` to 
make a few changes. First we'll import `GameMap` and update the abstract `activate` signature:

```typescript
import { GameMap } from '../game-map';

export abstract class Consumable {
  protected constructor(public parent: Item | null) {}
  getAction(): Action | null {
    if (this.parent) {
      return new ItemAction(this.parent);
    }
    return null;
  }

  abstract activate(action: ItemAction, entity: Entity, gameMap: GameMap): void;
```

Then we'll update the `LightningConsumable` to utilize this passed in game map:

```typescript
activate(_action: ItemAction, entity: Entity, gameMap: GameMap) {
    let target: Actor | null = null;
    let closestDistance = this.maxRange + 1.0;

    for (const actor of gameMap.actors) {
      if (
        !Object.is(actor, entity) &&
        gameMap.tiles[actor.y][actor.x].visible
      ) {
        const distance = entity.distance(actor.x, actor.y);
        if (distance < closestDistance) {
          target = actor;
          closestDistance = distance;
        }
      }
    }
    // rest of method omitted for brevity
```

Next we can update the `ConfusionConsumabe` class's `getAction` method to set the input handler for the current screen:

```typescript
getAction(): Action | null {
  window.messageLog.addMessage(
    'Select a target location.',
    Colors.NeedsTarget,
  );
  window.engine.screen.inputHandler = new SingleRangedAttackHandler(
    (x, y) => {
      return new ItemAction(this.parent, [x, y]);
    },
  );
  return null;
}
```

We haven't added the `screen` property to the engine yet, but we will shortly. Still in `ConfusionConsumable` we can update
the `activate` method to use the passed in game map:

```typescript
activate(action: ItemAction, entity: Entity, gameMap: GameMap) {
  const target = action.targetActor(gameMap);

  if (!target) {
    throw new ImpossibleException('You must select an enemy to target.');
  }
  if (!gameMap.tiles[target.y][target.x].visible) {
    throw new ImpossibleException(
      'You cannot target an area you cannot see.',
    );
    // rest of method omitted for brevity
```

Next we'll update the `getAction` method for `FireballDamageConsumable` much like we did for `ConfusionConsumable`:

```typescript
getAction(): Action | null {
  window.messageLog.addMessage(
    'Select a target location.',
    Colors.NeedsTarget,
  );
  window.engine.screen.inputHandler = new AreaRangedAttackHandler(
    this.radius,
    (x, y) => {
      return new ItemAction(this.parent, [x, y]);
    },
  );
  return null;
}
```

And we'll also update the `activate` method:

```typescript
activate(action: ItemAction, _entity: Entity, gameMap: GameMap) {
  const { targetPosition } = action;

  if (!targetPosition) {
    throw new ImpossibleException('You must select an area to target.');
  }
  const [x, y] = targetPosition;
  if (!gameMap.tiles[y][x].visible) {
    throw new ImpossibleException(
      'You cannot target an area that you cannot see.',
    );
  }

  let targetsHit = false;
  for (let actor of gameMap.actors) {
    if (actor.distance(x, y) <= this.radius) {
      window.messageLog.addMessage(
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

Next we can make changes to our ai implementations in `ai.ts`. First import `GameMap` and then we can update the `perform`
signature and the implementation of `calculatePathTo` to use a passed in game map instead of the global:

```typescript
abstract perform(entity: Entity, gameMap: GameMap): void;

calculatePathTo(
  destX: number,
  destY: number,
  entity: Entity,
  gameMap: GameMap,
) {
  const isPassable = (x: number, y: number) => gameMap.tiles[y][x].walkable;
  // rest of method unchanged
```

We then need to update the `perform` implementation of `HostileEnemy`:

```typescript
perform(entity: Entity, gameMap: GameMap) {
  const target = window.engine.player;
  const dx = target.x - entity.x;
  const dy = target.y - entity.y;
  const distance = Math.max(Math.abs(dx), Math.abs(dy));

  if (gameMap.tiles[entity.y][entity.x].visible) {
    if (distance <= 1) {
      return new MeleeAction(dx, dy).perform(entity as Actor, gameMap);
    }
    this.calculatePathTo(target.x, target.y, entity, gameMap);
  }

  if (this.path.length > 0) {
    const [destX, destY] = this.path[0];
    this.path.shift();
    return new MovementAction(destX - entity.x, destY - entity.y).perform(
      entity,
      gameMap,
    );
  }

  return new WaitAction().perform(entity);
}
```

We also need to make a similar change to `ConfusedEnemy`:

```typescript
perform(entity: Entity, gameMap: GameMap) {
  const actor = entity as Actor;
  if (!actor) return;

  if (this.turnsRemaining <= 0) {
    window.messageLog.addMessage(`The ${entity.name} is no longer confused.`);
    actor.ai = this.previousAi;
  } else {
    const [directionX, directionY] =
      directions[generateRandomNumber(0, directions.length)];
    this.turnsRemaining -= 1;
    const action = new BumpAction(directionX, directionY);
    action.perform(entity, gameMap);
  }
}
```

Next we'll jump over to `actions.ts` and start by importing `GameMap`. Then we can update the abstract `perform` 
signature on the `Action` class:

```typescript
export abstract class Action {
  abstract perform(entity: Entity, gameMap: GameMap): void;
}
```

Now we need to update all the various actions to use this passed in game map, staring with `PickupAction`:

```typescript
export class PickupAction extends Action {
  perform(entity: Entity, gameMap: GameMap) {
    const consumer = entity as Actor;
    if (!consumer) return;

    const { x, y, inventory } = consumer;

    for (const item of gameMap.items) {
      if (x === item.x && y == item.y) {
        if (inventory.items.length >= inventory.capacity) {
          throw new ImpossibleException('Your inventory is full.');
        }

        window.engine.screen.gameMap?.removeEntity(item);
        item.parent = inventory;
        inventory.items.push(item);

        window.messageLog.addMessage(`You picked up the ${item.name}!`);
        return;
      }
    }
    throw new ImpossibleException('There is nothing here to pick up.');
  }
}
```

Next will be `ItemAction` where we will also update `targetActor` to be a method instead of a getter so we can pass
in the game map:

```typescript
export class ItemAction extends Action {
  constructor(
          public item: Item | null,
          public targetPosition: [number, number] | null = null,
  ) {
    super();
  }

  targetActor(gameMap: GameMap): Actor | undefined {
    if (!this.targetPosition) {
      return;
    }
    const [x, y] = this.targetPosition;
    return gameMap.getActorAtLocation(x, y);
  }

  perform(entity: Entity, gameMap: GameMap) {
    this.item?.consumable.activate(this, entity, gameMap);
  }
}
```

Then we'll update our `ActionWithDirection`, `MovementAction`, `BumpAction` and `MeleeAction` classes:

```typescript
export abstract class ActionWithDirection extends Action {
  constructor(public dx: number, public dy: number) {
    super();
  }

  abstract perform(entity: Entity, gameMap: GameMap): void;
}

export class MovementAction extends ActionWithDirection {
  perform(entity: Entity, gameMap: GameMap) {
    const destX = entity.x + this.dx;
    const destY = entity.y + this.dy;

    if (!gameMap.isInBounds(destX, destY)) {
      throw new ImpossibleException('That way is blocked.');
    }
    if (!gameMap.tiles[destY][destX].walkable) {
      throw new ImpossibleException('That way is blocked.');
    }
    if (gameMap.getBlockingEntityAtLocation(destX, destY)) {
      throw new ImpossibleException('That way is blocked.');
    }
    entity.move(this.dx, this.dy);
  }
}

export class BumpAction extends ActionWithDirection {
  perform(entity: Entity, gameMap: GameMap) {
    const destX = entity.x + this.dx;
    const destY = entity.y + this.dy;

    if (gameMap.getActorAtLocation(destX, destY)) {
      return new MeleeAction(this.dx, this.dy).perform(
        entity as Actor,
        gameMap,
      );
    } else {
      return new MovementAction(this.dx, this.dy).perform(entity, gameMap);
    }
  }
}

export class MeleeAction extends ActionWithDirection {
  perform(actor: Actor, gameMap: GameMap) {
    const destX = actor.x + this.dx;
    const destY = actor.y + this.dy;

    const target = gameMap.getActorAtLocation(destX, destY);
    if (!target) {
      throw new ImpossibleException('Nothing to attack.');
    }
    const damage = actor.fighter.power - target.fighter.defense;
    const attackDescription = `${actor.name.toUpperCase()} attacks ${
      target.name
    }`;
    const fg =
      actor.name === 'Player' ? Colors.PlayerAttack : Colors.EnemyAttack;
    if (damage > 0) {
      window.messageLog.addMessage(
        `${attackDescription} for ${damage} hit points.`,
        fg,
      );
      target.fighter.hp -= damage;
    } else {
      window.messageLog.addMessage(
        `${attackDescription} but does no damage.`,
        fg,
      );
    }
  }
}
```

The last action we need to update is `DropItem`:

```typescript
export class DropItem extends ItemAction {
  perform(entity: Entity, gameMap: GameMap) {
    const dropper = entity as Actor;
    if (!dropper || !this.item) return;
    dropper.inventory.drop(this.item, gameMap);
  }
}
```

Next we need to update `engine.ts` to utilize our new `GameScreen` class. I'll put the full contents of the update file
below:

```typescript
import * as ROT from 'rot-js';

import { BaseInputHandler, GameInputHandler } from './input-handler';
import { Actor, spawnPlayer } from './entity';
import { BaseScreen } from './screens/base-screen';
import { GameScreen } from './screens/game-screen';

export class Engine {
  public static readonly WIDTH = 80;
  public static readonly HEIGHT = 50;
  public static readonly MAP_WIDTH = 80;
  public static readonly MAP_HEIGHT = 43;

  display: ROT.Display;
  inputHandler: BaseInputHandler;
  screen: BaseScreen;
  player: Actor;

  constructor() {
    this.display = new ROT.Display({
      width: Engine.WIDTH,
      height: Engine.HEIGHT,
      forceSquareRatio: true,
    });
    this.player = spawnPlayer(
            Math.floor(Engine.MAP_WIDTH / 2),
            Math.floor(Engine.MAP_HEIGHT / 2),
    );
    const container = this.display.getContainer()!;
    document.body.appendChild(container);

    this.inputHandler = new GameInputHandler();

    window.addEventListener('keydown', (event) => {
      this.update(event);
    });

    window.addEventListener('mousemove', (event) => {
      this.inputHandler.handleMouseMovement(
              this.display.eventToPosition(event),
      );
      this.screen.render();
    });

    this.screen = new GameScreen(this.display, this.player);
  }

  update(event: KeyboardEvent) {
    const screen = this.screen.update(event);
  }
}
```

As you can see, we have greatly simplified our `Engine` class. Now it is responsible for creating the necessary things
for starting up our game, and then delegates control to the `GameScreen`. The last thing we need to do for all our
refactors is update `main.ts` when we instantiate our engine:

```typescript
import { Engine } from './engine';
import { MessageLog } from './message-log';
import { Colors } from './colors';

declare global {
  interface Window {
    engine: Engine;
    messageLog: MessageLog;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.messageLog = new MessageLog();
  window.engine = new Engine();
  window.messageLog.addMessage(
          'Hello and welcome, adventurer, to yet another dungeon!',
          Colors.WelcomeText,
  );
  window.engine.screen.render();
});
```

We no longer need to spawn a player to pass to the engine as the engine will handle that itself. Run that game and it should
still function as before.

### Menu Screen

Now we can finally start adding some new functionality to our game! We'll start by making a small change in `base-screen.ts`:

```typescript
  abstract update(event: KeyboardEvent): BaseScreen;
```

Our update method will now return a `BaseScreen` instance. We'll use this to transition between screens. We now need to 
update our `GameScreen` class to utilize this:

```typescript
update(event: KeyboardEvent): BaseScreen {
  const action = this.inputHandler.handleKeyboardInput(event);
  if (action instanceof Action) {
    try {
      action.perform(this.player, this.gameMap);
      this.handleEnemyTurns();
      this.gameMap?.updateFov(this.player);
    } catch (error) {
      if (error instanceof ImpossibleException) {
        window.messageLog.addMessage(error.message, Colors.Impossible);
      }
    }
  }
  this.inputHandler = this.inputHandler.nextHandler;

  this.render();
  return this;
}
```

For now, we won't be transitioning away from the game screen once we're there, so all we have to do is `return this` at 
the end of the update method. Now we can add a main menu screen to the game. Add a new file to our `screens` directory
called `main-menu.ts`. We'll start by adding our imports and some constants:

```typescript
import { Display } from 'rot-js';
import { BaseScreen } from './base-screen';
import { Actor } from '../entity';
import { Engine } from '../engine';
import { BaseInputHandler, GameInputHandler } from '../input-handler';
import { GameScreen } from './game-screen';

const OPTIONS = [
  '[N] Play a new game',
  '[C] Continue last game', // TODO: hide this option if no save game is present
];

const MENU_WIDTH = 24;
```

The `OPTIONS` constant represents the menu options we'll draw to the screen. Once we get save/load functionality implemented
we'll hide the second option if no save game is present. Let's add our new screen class:

```typescript
export class MainMenu extends BaseScreen {
  inputHandler: BaseInputHandler;
  constructor(display: Display, player: Actor) {
    super(display, player);
    this.inputHandler = new GameInputHandler();
  }
```

We set up an input handler in the constructor because `BaseScreen` parent class requires one, but we won't be using it 
in our main menu. Next we'll add an `update` method:

```typescript
update(event: KeyboardEvent): BaseScreen {
  if (event.key === 'n') {
    return new GameScreen(this.display, this.player);
  }

  this.render();

  return this;
}
```

IF the player presses 'n' we'll return a `GameScreen` instance while will start up a whole new game for us. Otherwise
we'll just render and stay on the menu screen. Now we just need to implement the `render` method:

```typescript
render() {
  this.display.clear();
  OPTIONS.forEach((o, i) => {
    const x = Math.floor(Engine.WIDTH / 2);
    const y = Math.floor(Engine.HEIGHT / 2 - 1 + i);

    this.display.draw(x, y, o.padEnd(MENU_WIDTH, ' '), '#fff', '#000');
  });
}
```

We loop over all the options for the menu and draw them to the screen. The last thing we need to do to get our menu 
working is update `engine.ts`. First change the import from `GameScreen` to `MainMenu` since the menu will deal with
loading the game for us. Then we'll update when we instantiate the screen in the `Engine` constructor:

```typescript
this.screen = new MainMenu(this.display, this.player);
```

Finally, we need to change the `update` method to use our newly returned screen:

```typescript
update(event: KeyboardEvent) {
  const screen = this.screen.update(event);
  if (!Object.is(screen, this.screen)) {
    this.screen = screen;
    this.screen.render();
  }
}
```

Every time we call `update` on a screen, it will return a `BaseScreen` instance. If a new screen isn't loaded, it will return
itself, so we check if it's the same screen instance. If it isn't the same, we update and re-render. If you run the game
now it should start with our menu displayed. Pressing 'n' on your keyboard should start a new game.

### Save and Load

We have a menu, now we just need to be able to save a game, so we can load it from the menu later. We'll save our games
by writing the state of the current game screen to local storage in the browser. In order to do this, we need to serialize
an instance of the `GameScreen` class to a string. We can't serialize the entire `GameScreen` class as we can't have
string representations of methods or constructors. Let's start by introducing some new types that will represent precisely
what we want to have in our game save:

```typescript
type SerializedGameMap = {
  width: number;
  height: number;
  tiles: Tile[][];
  entities: SerializedEntity[];
};
```

The `SerializedGameMap` is the base level type that we'll save to local storage. It holds the width and height of the
map, all the tiles for the current map, and a list of entities in the map. Those entities will each be serialized with
their own type as well:

```typescript
type SerializedEntity = {
  x: number;
  y: number;
  char: string;
  fg: string;
  bg: string;
  name: string;
  fighter: SerializedFighter | null;
  aiType: string | null;
  confusedTurnsRemaining: number;
  inventory: SerializedItem[] | null;
};

type SerializedFighter = {
  maxHp: number;
  hp: number;
  defense: number;
  power: number;
};

type SerializedItem = {
  itemType: string;
};
```

A `SerializedEntity` contains all the data for a given entity. Some properties are nullable since not all entities are
fighters/ai enemies/items. We represent the current ai type as a string. A fighter is serialized to contain all the 
current stats. Items just contain the item type.

This is a very basic style of serialization and it isn't very flexible. If you were to expand
this into a larger game, it would be a good idea to delegate serialization to each of the entity classes and their child 
classes. The way we are doing it here will serve our purposes, but isn't ideal.

We can now use these new types to write a function that will create an object representation of an instance of a game
screen. Let's add a new `toObject` method to the `GameScreen` class:

```typescript
private toObject(): SerializedGameMap {
  return {
    width: this.gameMap.width,
    height: this.gameMap.height,
    tiles: this.gameMap.tiles,
    entities: this.gameMap.entities.map((e) => {
      let fighter = null;
      let aiType = null;
      let inventory = null;
      let confusedTurnsRemaining = 0;

      if (e instanceof Actor) {
        const actor = e as Actor;
        const { maxHp, _hp: hp, defense, power } = actor.fighter;
        fighter = { maxHp, hp, defense, power };
        if (actor.ai) {
          aiType = actor.ai instanceof HostileEnemy ? 'hostile' : 'confused';
          confusedTurnsRemaining =
                  aiType === 'confused'
                          ? (actor.ai as ConfusedEnemy).turnsRemaining
                          : 0;
        }
        if (actor.inventory) {
          inventory = [];
          for (let item of actor.inventory.items) {
            inventory.push({ itemType: item.name });
          }
        }
      }
      return {
        x: e.x,
        y: e.y,
        char: e.char,
        fg: e.fg,
        bg: e.bg,
        name: e.name,
        fighter,
        aiType,
        confusedTurnsRemaining,
        inventory,
      };
    }),
  };
}
```

The tricky part in this method is where we map over each of the entities in the game map. Here we check if the entity
is an actor or not. If it is an actor we serialize the fighter, AI, and inventory information. Otherwise, we just serialize
the basic entity info. Now let's write a method that will use this to actually save the information to local storage:

```typescript
private saveGame() {
  try {
    localStorage.setItem('roguesave', JSON.stringify(this.toObject()));
  } catch (err) {}
}
```

We simply call the new `toObject` method, stringify the object representation of the game screen, and then write that
string into local storage using the key `roguesave`. Now let's add a small `if` statement to the top of the `update`
method in `GameScreen` to add a key to save the current state of a game:

```typescript
  update(event: KeyboardEvent): BaseScreen {
  if (event.key === 's') {
    this.saveGame();
    return this;
  }
```

If you run the game and press the 's' key, then open up the developer tools in your browser and check your local storage,
you should see an entry for `roguesave` that contains all the current state of the game. Now let's build the functionality
to load one of these saves. First we'll open up `entity.ts` and fix the return types of some of our spawn functions:

```typescript
export function spawnOrc(gameMap: GameMap, x: number, y: number): Actor {
export function spawnTroll(gameMap: GameMap, x: number, y: number): Actor {
export function spawnHealthPotion(gameMap: GameMap, x: number, y: number): Item {
export function spawnLightningScroll(gameMap: GameMap, x: number, y: number): Item {
export function spawnConfusionScroll(gameMap: GameMap, x: number, y: number): Item {
export function spawnFireballScroll(gameMap: GameMap, x: number, y: number): Item {
```

We want these return types to be accurate so that we can tell utilize the return types when loading with casting. Now we'll add
a static method to `GameScreen` that will load a game based on a serialized string:

```typescript
private static load(
        serializedGameMap: string,
        display: Display,
): [GameMap, Actor] {
```

Our `load` method takes in a string representing a saved game screen and a display to start rendering to and returns a 
tuple that will have the loaded map, and the player entity.

```typescript
  const parsedMap = JSON.parse(serializedGameMap) as SerializedGameMap;
  const playerEntity = parsedMap.entities.find((e) => e.name === 'Player');
  if (!playerEntity) throw new Error('Player not found');
  const player = spawnPlayer(playerEntity.x, playerEntity.y);
  player.fighter.hp = playerEntity.fighter?.hp || player.fighter.hp;
  window.engine.player = player;
```

We then parse that string into a `SerializedGameMap` object. Once we have that object, we first find the player entity
in the list of entities, spawn a new player at that location, and set the hp accordingly. 

```typescript
  const map = new GameMap(parsedMap.width, parsedMap.height, display, [
    player,
  ]);
  map.tiles = parsedMap.tiles;
```

We then create a new `GameMap` instance using the saved width and height and the newly spawned player. Once we have a 
game map we set the tiles of that map equal to the saved tiles.

```typescript
  const playerInventory = playerEntity?.inventory || [];
  for (let entry of playerInventory) {
    let item: Item | null = null;
    switch (entry.itemType) {
      case 'Health Potion': {
        item = spawnHealthPotion(map, 0, 0);
        break;
      }
      case 'Lightning Scroll': {
        item = spawnLightningScroll(map, 0, 0);
        break;
      }
      case 'Confusion Scroll': {
        item = spawnConfusionScroll(map, 0, 0);
        break;
      }
      case 'Fireball Scroll': {
        item = spawnFireballScroll(map, 0, 0);
        break;
      }
    }

    if (item) {
      map.removeEntity(item);
      item.parent = player.inventory;
      player.inventory.items.push(item);
    }
  }
```

We then loop over all the items in the player's inventory and spawn new versions of them. We start by spawning them at
(0,0) on the map, and then push them into the player's inventory and remove them from the map, since they are in 
the player's inventory and not on the map anymore. 

```typescript
  for (let e of parsedMap.entities) {
    if (e.name === 'Orc') {
      const orc = spawnOrc(map, e.x, e.y);
      orc.fighter.hp = e.fighter?.hp || orc.fighter.hp;
      if (e.aiType === 'confused') {
        orc.ai = new ConfusedEnemy(orc.ai, e.confusedTurnsRemaining);
      }
    } else if (e.name === 'Troll') {
      const troll = spawnTroll(map, e.x, e.y);
      troll.fighter.hp = e.fighter?.hp || troll.fighter.hp;
      if (e.aiType === 'confused') {
        troll.ai = new ConfusedEnemy(troll.ai, e.confusedTurnsRemaining);
      }
    } else if (e.name === 'Health Potion') {
      spawnHealthPotion(map, e.x, e.y);
    } else if (e.name === 'Lightning Scroll') {
      spawnLightningScroll(map, e.x, e.y);
    } else if (e.name === 'Confusion Scroll') {
      spawnConfusionScroll(map, e.x, e.y);
    } else if (e.name === 'Fireball Scroll') {
      spawnFireballScroll(map, e.x, e.y);
    }
  }
  return [map, player];
}
```

Finally, we loop over all the entities in the save game and apwn new versions of them, setting their attributes accordingly.
For `Actor` types, we set their hp, and set their AI type. This way if we save the game while an enemy is confused, they
will still be confused when we load the game again. We then return the new map and the player entity. We'll make use of 
this new `load` method in the `GameScreen` constructor:

```typescript
constructor(
  display: Display,
  player: Actor,
  serializedGameMap: string | null = null,
) {
  super(display, player);

  if (serializedGameMap) {
    const [map, loadedPlayer] = GameScreen.load(serializedGameMap, display);
    this.gameMap = map;
    this.player = loadedPlayer;
  } else {
    this.gameMap = generateDungeon(
      GameScreen.MAP_WIDTH,
      GameScreen.MAP_HEIGHT,
      GameScreen.MAX_ROOMS,
      GameScreen.MIN_ROOM_SIZE,
      GameScreen.MAX_ROOM_SIZE,
      GameScreen.MAX_MONSTERS_PER_ROOM,
      GameScreen.MAX_ITEMS_PER_ROOM,
      this.player,
      this.display,
    );
  }

  this.inputHandler = new GameInputHandler();
  this.gameMap.updateFov(this.player);
}
```

We're adding a new optional parameter to our constructor that will be used to pass in a save game string when loading
a game. If we're starting a whole new game, this parameter will be null. If a save game string is passed in, we then
call our `load` method to bring the old game back up. Let's bring this all together by opening up `main-menu.ts` to make
some changes:

```typescript
import { renderFrameWithTitle } from '../render-functions';

const OPTIONS = ['[N] Play a new game'];

if (localStorage.getItem('roguesave')) {
  OPTIONS.push('[C] Continue last game');
}
```

We'll use the `renderFrameWithTitle` function to render a popup message in the event a saved game fails to load. We 
also change our `OPTIONS` to only include the continue option if we have a game saved already. We'll add a new
instance variable to the `MainMenu` class:

```typescript
export class MainMenu extends BaseScreen {
  inputHandler: BaseInputHandler;
  showPopup: boolean;

  constructor(display: Display, player: Actor) {
    super(display, player);
    this.inputHandler = new GameInputHandler();
    this.showPopup = false;
  }
```

`showPopup` will track whether we want to display an error message to the user. Next we'll modify the `update` method:

```typescript
update(event: KeyboardEvent): BaseScreen {
  if (this.showPopup) {
    this.showPopup = false;
  } else {
    if (event.key === 'n') {
      return new GameScreen(this.display, this.player);
    } else if (event.key === 'c') {
      try {
        const saveGame = localStorage.getItem('roguesave');
        return new GameScreen(this.display, this.player, saveGame);
      } catch {
        this.showPopup = true;
      }
    }
  }

  this.render();
  return this;
}
```

We first check if we are currently showing the pop-up message and if we are, dismiss it with any keypress. Otherwise
we check if 'n' is pressed and start a new game, or if 'c' is pressed, we attempt to retrieve a save game from
local storage and load it. Any errors in loading would cause us to display the pop-up message. 

Finally, we'll update the `render` method to draw the popup message when we have an error loading a saved game:

```typescript
render() {
  this.display.clear();
  OPTIONS.forEach((o, i) => {
    const x = Math.floor(Engine.WIDTH / 2);
    const y = Math.floor(Engine.HEIGHT / 2 - 1 + i);

    this.display.draw(x, y, o.padEnd(MENU_WIDTH, ' '), '#fff', '#000');
  });

  if (this.showPopup) {
    const text = 'Failed to load save.';
    const options = this.display.getOptions();
    const width = text.length + 4;
    const height = 7;
    const x = options.width / 2 - Math.floor(width / 2);
    const y = options.height / 2 - Math.floor(height / 2);
    renderFrameWithTitle(x, y, width, height, 'Error');
    this.display.drawText(x + 1, y + 3, text);
  }
}
```

If you run the game now you should be able to save a game at any time by pressing the 's' key. Try reloading the game 
after that and hitting 'c' at the main menu and it should load your save exactly where you left off. You can find
the complete code for this chapter [here](https://github.com/bodiddlie/js-rogue-tutorial/tree/part10).