---
title: 'ROT.js Tutorial Part 11: Leveling Up AND Down'
date: 2022-08-10T08:00:00.000Z
meta:
    title: 'ROT.js Tutorial Part 11: Leveling Up AND Down'
    date: "August 10, 2022"
    description: "In this chapter we'll be adding functionality for our players to continue into deeper floors of the dungeon. We'll add a new tile type to represent a staircase down to the next floor, and generate a new dungeon when the player chooses to move down. We'll also be adding a progression system to the game allowing for players to level up and get stronger when they kill enough monsters. And the best part is......no big refactors this time!"
---

# {attributes.title}
{attributes.date.toDateString()}

In this chapter we'll be adding functionality for our players to be able to move in to deeper floors of the dungeon. We'll add
a new tile type to represent a staircase down to the next floor, and generate a new dungeon when the player chooses
to move down. We'll also be adding a progression system to the game allowing for players to level up and get stronger
when they kill enough monsters. And the best part is......no big refactors this time!

### What Goes Down

Currently, our game consists of a single dungeon floor. Once you kill all the monsters, there's nothing left to
do. Let's give the game some legs and allow for the player to delve deeper in to the dungeon, floor after floor. First,
we'll add a new `Descend` color to our enum in `colors.ts`:

```typescript
export enum Colors {
  //....
  StatusEffectApplied = '#3FFF3F',
  Descend = '#9F3FFF',
  PlayerDie = '#ff3030',
  //....
}
```

Next, we'll add a new tile in `tile-types.ts` that represents a staircase down to the next floor:

```typescript
export const STAIRS_DOWN_TILE: Tile = {
  walkable: true,
  transparent: true,
  visible: false,
  seen: false,
  dark: { char: '>', fg: '#000064', bg: '#323296' },
  light: { char: '>', fg: '#ffffff', bg: '#c8b432' },
};
```

This tile is walkable like the floor tiles, but has a different character as its display. Now we'll jump over to 
`base-screen.ts` and update our abstract screen class to account for generating new dungeon floors:

```typescript
export abstract class BaseScreen {
  abstract inputHandler: BaseInputHandler;
  protected constructor(public display: Display, public player: Actor) {}

  abstract update(event: KeyboardEvent): BaseScreen;

  generateFloor() {}

  abstract render(): void;
}
```

We're adding a `generateFloor` method to our base screen. We add an empty default implementation because we don't want
to have to implement the method in our main menu, just the game screen. Let's jump over to `game-screen.ts` and start
building out this functionality:

```typescript
export class GameScreen extends BaseScreen {
  // omitting static constants for brevity
  gameMap!: GameMap;
  inputHandler: BaseInputHandler;

  constructor(
    display: Display,
    player: Actor,
    serializedGameMap: string | null = null,
    public currentFloor: number = 0,
  ) {
    super(display, player);

    if (serializedGameMap) {
      const [map, loadedPlayer, floor] = GameScreen.load(
        serializedGameMap,
        display,
      );
      this.gameMap = map;
      this.player = loadedPlayer;
      this.currentFloor = floor;
    } else {
      this.generateFloor();
    }

    this.inputHandler = new GameInputHandler();
    this.gameMap.updateFov(this.player);
  }
```

The first change we make here is to mark our `gameMap` as being non-null by affixing it with an exclamation mark. This
tells TypeScript that the variable will not be null. We're doing this because instead of generating a dungeon in our
constructor, we're calling a method to do that for us. TypeScript will complain that `gameMap` could possibly be null
or undefined if we don't add the exclamation mark. Because we know it will be assigned in the `generateFloor` method
we'll implement shortly, it's safe for us to tell TypeScript to ignore this error. The non-null assertion operator is
useful, but should be used sparingly since it bypasses TypeScript's type inference. 

We're also adding a third value to our tuple when we load a saved game. This will be the current floor that the player
is on in the saved game. Now we can implement the `generateFloor` method that will assign our game map variable:

```typescript
generateFloor(): void {
  this.currentFloor += 1;

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
```

Whenever we generate a new dungeon floor, we'll increase the current floor variable. We generate the floor the same way
we were previously, just now contained in this new method instead of the constructor. 

Next we'll update the render method to add information to the UI telling the player what floor they are on:

```typescript
render() {
  this.display.clear();
  window.messageLog.render(this.display, 21, 45, 40, 5);
  renderHealthBar(
    this.display,
    this.player.fighter.hp,
    this.player.fighter.maxHp,
    20,
  );
  renderNamesAtLocation(
    21,
    44,
    this.inputHandler.mousePosition,
    this.gameMap,
  );

  this.display.drawText(0, 47, `Dungeon level: ${this.currentFloor}`);

  this.gameMap.render();
  //omitting rest of method for brevity
```

The last thing we need to do is update how we save and load our game to keep track of the floor the player is on. Update
the `SerializedGameMap` type:

```typescript
type SerializedGameMap = {
  currentFloor: number;
  width: number;
  height: number;
  tiles: Tile[][];
  entities: SerializedEntity[];
};
```

Then update the `toObject` method to include the current floor for saving:

```typescript
private toObject(): SerializedGameMap {
  return {
    currentFloor: this.currentFloor,
    width: this.gameMap.width,
    // rest of method omitted for brevity
```

And lastly update the return of the `load` method to include the current floor from the saved game:

```typescript
return [map, player, parsedMap.currentFloor];
```

Next we'll open `game-map.ts` and add a new instance variable to the `GameMap` class to track the location of the staircase:

```typescript
export class GameMap {
  tiles: Tile[][];
  downstairsLocation: [number, number];

  constructor(
    public width: number,
    public height: number,
    public display: Display,
    public entities: Entity[],
  ) {
    this.tiles = new Array(this.height);
    for (let y = 0; y < this.height; y++) {
      const row = new Array(this.width);
      for (let x = 0; x < this.width; x++) {
        row[x] = { ...WALL_TILE };
      }
      this.tiles[y] = row;
    }
    this.downstairsLocation = [0, 0];
  }
```

We set the location of the staircase to [0, 0] to start. We'll be updating that location when we generate a map. Open up
`procgen.ts` and be sure to add the new `STAIRS_DOWN_TILE` to the imports. We'll first add a new local variable inside
the `generateDungeon` function:

```typescript
export function generateDungeon(
  // parameters omitted for brevity
): GameMap {
  const dungeon = new GameMap(mapWidth, mapHeight, display, [player]);

  const rooms: RectangularRoom[] = [];
  let centerOfLastRoom: [number, number] = [0, 0];
```

We'll track the center of the last room added to the map and use that as the location of the staircase. To set that 
variable we'll add a line at the end of our loop over the rooms:

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
  placeEntities(newRoom, dungeon, maxMonsters, maxItems);

  rooms.push(newRoom);
  centerOfLastRoom = newRoom.center;
}
```

We can then use that variable to tell our generated dungeon where the staircase should be and set the tile to our new
tile type:

```typescript
dungeon.tiles[centerOfLastRoom[1]][centerOfLastRoom[0]] = {
  ...STAIRS_DOWN_TILE,
};
dungeon.downstairsLocation = centerOfLastRoom;

return dungeon;
```

With the map ready to go, we just need to add the functionality for the player to choose to descend the staircase. Open
`actions.ts` and we'll add a new action to represent that choice:

```typescript
export class TakeStairsAction extends Action {
  perform(entity: Entity, gameMap: GameMap) {
    if (
      entity.x === gameMap.downstairsLocation[0] &&
      entity.y == gameMap.downstairsLocation[1]
    ) {
      window.engine.screen.generateFloor();
      window.messageLog.addMessage(
        'You descend the staircase.',
        Colors.Descend,
      );
    } else {
      throw new ImpossibleException('There are no stairs here.');
    }
  }
}
```

This new action checks if the player is by the staircase. If they are, we tell the screen to generate
a new floor and add a message to the log. If not, we print a message that they can't descend if there's no staircase. 

The last thing we need to do to is wire up this new action in our input handler. Open `input-handler.ts` and be sure
to import the new `TakeStairsAction`. The update our `handleKeyboardEvent` method in `GameInputHandler`:

```typescript
if (event.key === '/') {
  this.nextHandler = new LookHandler();
}
if (event.key === '>') {
  return new TakeStairsAction();
}

return null;
```

If the player hits the right angle bracket key (SHIFT + period), they will attempt to descend to a new level. Run the
game and explore until you find our new staircase tile. Press the right angle bracket key and you should find yourself
on a whole new floor.

### Must Level Up

Now that the player can delve deeper into the dungeon, we should add a way for them to get stronger as they make progress.
We'll add a level-up mechanic to our game. Start by creating a new file called `level.ts`:

```typescript
import { BaseComponent } from './base-component';
import { Actor } from '../entity';

export class Level extends BaseComponent {
  constructor(
    public levelUpBase: number = 0,
    public xpGiven: number = 0,
    public currentLevel: number = 1,
    public currentXp: number = 0,
    public levelUpFactor: number = 200,
  ) {
    super();
  }
```

Our new component for tracking the player's progress has several instance variables. The `levelUpBase` and `levelUpFactor`
variables will be used in our calculation for how much experience is required to level up. `xpGiven` is used to 
tell how much experience is granted when an actor is killed. The `currentLevel` and `currentXp` track the current
state of the player's progress.

```typescript
public get experienceToNextLevel(): number {
  return this.levelUpBase + this.currentLevel * this.levelUpFactor;
}

public get requiresLevelUp(): boolean {
  return this.currentXp > this.experienceToNextLevel;
}
```

We then add two getters to the class. `experienceToNextLevel` calculates how much experience is required to advance to 
the next level. We take the `levelUpBase` and then add the `currentLevel` multiplied by the `levelUpFactor` this gives
us progression that requires more experience for each level gained. The other getter, `requiresLevelUp` check if the
current experience earned by the player is greater than the experience required. We'll use this to determine if it's
time to level up or not.

```typescript
addXp(xp: number) {
  if (xp === 0 || this.levelUpBase === 0) return;

  this.currentXp += xp;

  window.messageLog.addMessage(`You gain ${xp} experience points.`);

  if (this.requiresLevelUp) {
    window.messageLog.addMessage(
      `You advance to level ${this.currentLevel + 1}`,
    );
  }
}
```

The `addXp` method takes in an amount of experience to add to the player, and prints a message to the log. It also
checks if it's time to level up, and if so, adds another message to the log. 

```typescript
private increaseLevel() {
  this.currentXp -= this.experienceToNextLevel;
  this.currentLevel++;
}

increaseMaxHp(amount: number = 20) {
  const actor = this.parent as Actor;
  if (!actor) return;
  actor.fighter.maxHp += amount;
  actor.fighter.hp += amount;

  window.messageLog.addMessage('Your health improves!');

  this.increaseLevel();
}

  increasePower(amount: number = 1) {
  const actor = this.parent as Actor;
  if (!actor) return;
  actor.fighter.power += amount;

  window.messageLog.addMessage('You feel stronger!');

  this.increaseLevel();
}

  increaseDefense(amount: number = 1) {
  const actor = this.parent as Actor;
  if (!actor) return;
  actor.fighter.defense += amount;

  window.messageLog.addMessage('Your movements are getting swifter!');

  this.increaseLevel();
}
```

We then add methods for leveling up our different attributes. Each method increases its relevant attribute by the given
amount, and adds a message to the log. Now let's add this new component to our actors. Open `entity.ts` and import
`Level`. Then update the constructor for `Actor` to add a new `level` instance variable:

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
    public level: Level,
    public parent: GameMap | null = null,
  ) {
```

We'll then update our `spawnPlayer` function to add a level component:

```typescript
export function spawnPlayer(
  x: number,
  y: number,
  gameMap: GameMap | null = null,
): Actor {
  const player = new Actor(
    x,
    y,
    '@',
    '#fff',
    '#000',
    'Player',
    null,
    new Fighter(30, 2, 5),
    new Inventory(26),
    new Level(20),
    gameMap,
  );
  player.level.parent = player;
  return player;
}
```

Note that we need to explicitly set the parent of the level component to the player. This is so the different `increase`
methods on the level can properly reference the actor they are leveling up. We'll then add level components to our orc
and troll actors, so they can give xp when killed:

```typescript
export function spawnOrc(gameMap: GameMap, x: number, y: number): Actor {
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
    new Level(0, 35),
    gameMap,
  );
}
export function spawnTroll(gameMap: GameMap, x: number, y: number): Actor {
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
    new Level(0, 100),
    gameMap,
  );
}
```

Now open `fighter.ts` and we'll add a line of code to give xp to the player when a monster dies:

```typescript
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

  window.messageLog.addMessage(deathMessage, fg);

  window.engine.player.level.addXp(this.parent.level.xpGiven);
}
```

When a monster dies we call the `addXp` method on the player's level component, and add the `xpGiven` from the monster's
level component. 

Next, we need to add a new input handler so the player can choose which attribute they want to increase when 
they level up. Start by opening `input-handler.ts` and adding a new import:

```typescript
import { renderFrameWithTitle } from './render-functions';
```

We'll use this render function to draw some UI to the screen when the player levels up. Next we'll update our `GameInputHandler`
to check if it's time for the player to level up or not:

```typescript
export class GameInputHandler extends BaseInputHandler {
  constructor() {
    super();
  }

  handleKeyboardInput(event: KeyboardEvent): Action | null {
    if (window.engine.player.fighter.hp > 0) {
      if (window.engine.player.level.requiresLevelUp) {
        this.nextHandler = new LevelUpEventHandler();
        return null;
      }
      if (event.key in MOVE_KEYS) {
```

We check if the player has reached enough experience to level up, and if so, switch to a new input handler. Let's create
that new input handler:

```typescript
export class LevelUpEventHandler extends BaseInputHandler {
  constructor() {
    super();
  }

  onRender(display: Display) {
    let x = 0;
    if (window.engine.player.x <= 30) {
      x = 40;
    }

    renderFrameWithTitle(x, 0, 35, 8, 'Level Up');

    display.drawText(x + 1, 1, 'Congratulations! You level up!');
    display.drawText(x + 1, 2, 'Select and attribute to increase.');

    display.drawText(
      x + 1,
      4,
      `a) Constitution (+20 HP, from ${window.engine.player.fighter.maxHp})`,
    );
    display.drawText(
      x + 1,
      5,
      `b) Strength (+1 attack, from ${window.engine.player.fighter.power})`,
    );
    display.drawText(
      x + 1,
      6,
      `c) Agility (+1 defense, from ${window.engine.player.fighter.defense})`,
    );
  }

  handleKeyboardInput(event: KeyboardEvent): Action | null {
    if (event.key === 'a') {
      window.engine.player.level.increaseMaxHp();
    } else if (event.key === 'b') {
      window.engine.player.level.increasePower();
    } else if (event.key === 'c') {
      window.engine.player.level.increaseDefense();
    } else {
      window.messageLog.addMessage('Invalid entry.', Colors.Invalid);
      return null;
    }

    this.nextHandler = new GameInputHandler();
    return null;
  }
}
```

We use the `onRender` method to draw a window on the screen showing the choices the player has for leveling up. Then in 
the `handleKeyboardInput` method we call the related `increase*` method on the level component for the attribute they choose.
If they press a key that isn't valid, we add a message to the log and keep them on the level up window. If they make a 
valid choice, we increase the attribute and close the window. 

The last thing we need to do is make sure we can save and load the current level information. Open `game-screen.ts` and
we'll update the `SerializedEntity` type and add a new `SerializedLevel` type as well:

```typescript
type SerializedEntity = {
  x: number;
  y: number;
  char: string;
  fg: string;
  bg: string;
  name: string;
  fighter: SerializedFighter | null;
  level: SerializedLevel | null;
  aiType: string | null;
  confusedTurnsRemaining: number;
  inventory: SerializedItem[] | null;
};

type SerializedLevel = {
  levelUpBase: number;
  xpGiven: number;
  currentLevel: number;
  currentXp: number;
  levelUpFactor: number;
};
```

We'll then update the `toObject` method to include the current level information when we save:

```typescript
private toObject(): SerializedGameMap {
  return {
    currentFloor: this.currentFloor,
    width: this.gameMap.width,
    height: this.gameMap.height,
    tiles: this.gameMap.tiles,
    entities: this.gameMap.entities.map((e) => {
      let fighter = null;
      let level = null;
      let aiType = null;
      let inventory = null;
      let confusedTurnsRemaining = 0;

      if (e instanceof Actor) {
        const actor = e as Actor;
        const { maxHp, _hp: hp, defense, power } = actor.fighter;
        const {
          currentXp,
          currentLevel,
          levelUpBase,
          levelUpFactor,
          xpGiven,
        } = actor.level;
        fighter = { maxHp, hp, defense, power };
        level = {
          currentXp,
          currentLevel,
          levelUpBase,
          levelUpFactor,
          xpGiven,
        };
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
        level,
        aiType,
        confusedTurnsRemaining,
        inventory,
      };
    }),
  };
}
```

Lastly, we need to update the `load` method to reload the level information from the saved game:

```typescript
private static load(
  serializedGameMap: string,
  display: Display,
): [GameMap, Actor, number] {
  const parsedMap = JSON.parse(serializedGameMap) as SerializedGameMap;
  const playerEntity = parsedMap.entities.find((e) => e.name === 'Player');
  if (!playerEntity) throw new Error('shit broke');
  const player = spawnPlayer(playerEntity.x, playerEntity.y);
  player.fighter.hp = playerEntity.fighter?.hp || player.fighter.hp;
  player.level.currentLevel = playerEntiGty.level?.currentLevel;
  player.level.currentXp = playerEntity.level?.currentXp;
  window.engine.player = player;
```

Run the game and kill enough monsters to level up and you should be presented with a window to make a choice, and get stronger.

### Know Thyself

The last thing we'll add in this chapter is a nice quality of life feature. Right now, the player can't tell how close they are
to leveling up, and they can't see what their current attributes are. We'll add a new input handler that will allow the player to 
bring up a character information screen. Open up `input-handler.ts` and we'll update the `GameInputHandler` class
to handle a new keypress:

```typescript
if (event.key === 'd') {
  this.nextHandler = new InventoryInputHandler(InputState.DropInventory);
}
if (event.key === 'c') {
  this.nextHandler = new CharacterScreenInputHandler();
}
if (event.key === '/') {
  this.nextHandler = new LookHandler();
}
```

Now we can implement this new handler:

```typescript
export class CharacterScreenInputHandler extends BaseInputHandler {
  constructor() {
    super();
  }

  onRender(display: Display) {
    const x = window.engine.player.x <= 30 ? 40 : 0;
    const y = 0;
    const title = 'Character Information';
    const width = title.length + 4;

    renderFrameWithTitle(x, y, width, 7, title);

    display.drawText(
      x + 1,
      y + 1,
      `Level: ${window.engine.player.level.currentLevel}`,
    );
    display.drawText(
      x + 1,
      y + 2,
      `XP: ${window.engine.player.level.currentXp}`,
    );
    display.drawText(
      x + 1,
      y + 3,
      `XP for next Level: ${window.engine.player.level.experienceToNextLevel}`,
    );
    display.drawText(
      x + 1,
      y + 4,
      `Attack: ${window.engine.player.fighter.power}`,
    );
    display.drawText(
      x + 1,
      y + 5,
      `Defense: ${window.engine.player.fighter.defense}`,
    );
  }

  handleKeyboardInput(_event: KeyboardEvent): Action | null {
    this.nextHandler = new GameInputHandler();
    return null;
  }
}
```

Similarly to the level up handler, we use `onRender` to draw a window to the screen, this time including details about the
current status of the player. Pressing any key will return to the game screen. 

Run the game and you should be able to press the 'c' key to see your current experience, level, and attributes. You can 
find the complete code for this chapter [here](https://github.com/bodiddlie/js-rogue-tutorial/tree/part11).

[Click here to move on to Part 12](/rotjs-tutorial/part12)!
