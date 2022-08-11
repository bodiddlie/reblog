---
title: 'ROT.js Tutorial Part 12: Increasing Difficulty'
date: 2022-08-11T08:00:00.000Z
meta:
    title: 'ROT.js Tutorial Part 11: Increasing Difficulty'
    date: "August 11, 2022"
    description: "In this chapter, we'll be updating our game to get harder as the player goes deeper into the dungeon. Each floor will have a chance of having more monsters per room, and of spawning more difficult monsters. We'll balance this with an increased chance for strong items."
---

# {attributes.title}
{attributes.date.toDateString()}

In this chapter, we'll be updating our game to get harder as the player goes deeper into the dungeon. Each floor will
have a chance of having more monsters per room, and of spawning more difficult monsters. We'll balance this with an 
increased chance for strong items.

### Increasing Monster Counts

Currently, when we generate a new dungeon, we have a fixed maximum number of monsters and items that we could spawn into
a map. We'll start by adding functionality to allow for a variable maximum that will get higher as the player goes
deeper into the dungeon. We'll start by adding some new constants at the top of `procgen.ts`:

```typescript
type FloorValue = [number, number][];

const MAX_ITEMS_BY_FLOOR: FloorValue = [
  [1, 1],
  [4, 2],
];

const MAX_MONSTERS_BY_FLOOR: FloorValue = [
  [1, 2],
  [4, 3],
  [6, 5],
];
```

The `FloorValue` type is a list of tuples. Each tuple represents a minimum floor number, and a maximum number of something
for that floor. So in the above, from floors one through three, there would be a maximum of *one* item per room. Once 
the player reaches the fourth floor, that maximum will go up to *two*. We can then update `placeEntities` to use
these new constants:

```typescript
function placeEntities(
  room: RectangularRoom,
  dungeon: GameMap,
  floorNumber: number,
) {
  const numberOfMonstersToAdd = generateRandomNumber(
    0,
    getMaxValueForFloor(MAX_MONSTERS_BY_FLOOR, floorNumber),
  );
  const numberOfItemsToAdd = generateRandomNumber(
    0,
    getMaxValueForFloor(MAX_ITEMS_BY_FLOOR, floorNumber),
  );
```

We no longer take in the maximums for monsters and items as parameters, and instead get them from our new constants. The
`getMaxValueForFloor` function will look at a given `FloorValue` and return the maximum for that floor. Let's implement
that function:

```typescript
function getMaxValueForFloor(
  maxValueByFloor: FloorValue,
  floor: number,
): number {
  let current = 0;

  for (let [min, value] of maxValueByFloor) {
    if (min > floor) break;
    current = value;
  }

  return current;
}
```

We loop over each of the entries in the `FloorValue` array, and check if the current floor is under the minimum or not. 
If it is we break from the loop and return the new max that we found. If it isn't, then we continue the loop, increasing
the maximum value we'll return.

Next let's update `generateDungeon` to take in the current floor that it's generating for, and pass that to the `placeEntities`
function call:

```typescript
export function generateDungeon(
  mapWidth: number,
  mapHeight: number,
  maxRooms: number,
  minSize: number,
  maxSize: number,
  player: Entity,
  display: Display,
  currentFloor: number,
): GameMap {
  //omitted rest of function for brevity

placeEntities(newRoom, dungeon, currentFloor);
```

Now we need to open `game-screen.ts` and update our call to `generateDungeon` to pass the current floor:

```typescript
generateFloor(): void {
  this.currentFloor += 1;
  this.gameMap = generateDungeon(
    GameScreen.MAP_WIDTH,
    GameScreen.MAP_HEIGHT,
    GameScreen.MAX_ROOMS,
    GameScreen.MIN_ROOM_SIZE,
    GameScreen.MAX_ROOM_SIZE,
    this.player,
    this.display,
    this.currentFloor,
  );
}
```

Run the game, and you should see monster and item counts within the new maximums we set.

### Weighted Entity Choices

We've changed how many entities we spawn into a map, but not which kinds of entities. If the player gets a bunch of 
over-powered lightning scrolls on the first level it would be too easy. Also, if they ran into rooms with all trolls,
it would be too hard. We need a way to gradually increase the difficulty as the player progresses. To do this we'll use
a function from ROT.js that takes a weighted set of options, and chooses them at random based on the weights. 

First let's open up `entity.ts` and add a new type and an export at the bottom of the file:

```typescript
type SPAWNMAP = {
  [key: string]: (gameMap: GameMap, x: number, y: number) => Entity;
};

export const spawnMap: SPAWNMAP = {
  spawnOrc,
  spawnTroll,
  spawnHealthPotion,
  spawnConfusionScroll,
  spawnLightningScroll,
  spawnFireballScroll,
};
```

We'll be using the `spawnMap` as a dynamic way to spawn entities instead of explicitly referencing the functions. This
will make more sense when we implement the weighted choices. Jump back over to `procgen.ts` and update our imports:

```typescript
import { GameMap } from './game-map';
import { FLOOR_TILE, WALL_TILE, Tile, STAIRS_DOWN_TILE } from './tile-types';
import { Display, RNG } from 'rot-js';
import { Entity, spawnMap } from './entity';
```

We import the `RNG` module from ROT.js for the weighted choices, and we bring in our new `spawnMap`.

We'll need some new types to represent our weighted options. Add them underneath where we declared our maximum values:

```typescript
type Choice = {
  value: string;
  weight: number;
};

type WeightedChoices = {
  floor: number;
  weights: Choice[];
};
```

A `Choice` object is just a map with a key that is a string that will be a key into our `spawnMap` and a weight that is 
how much weight the `RNG` module should give when making a choice. `WeightedChoices` is a map that has a list of choices
for a given floor. Let's create our options now using these types:

```typescript
const ITEM_CHANCES: WeightedChoices[] = [
  {
    floor: 0,
    weights: [{ value: 'spawnHealthPotion', weight: 35 }],
  },
  {
    floor: 2,
    weights: [{ value: 'spawnConfusionScroll', weight: 10 }],
  },
  {
    floor: 4,
    weights: [{ value: 'spawnLightningScroll', weight: 25 }],
  },
  {
    floor: 6,
    weights: [{ value: 'spawnFireballScroll', weight: 25 }],
  },
];

const MONSTER_CHANCES: WeightedChoices[] = [
  {
    floor: 0,
    weights: [{ value: 'spawnOrc', weight: 80 }],
  },
  {
    floor: 3,
    weights: [{ value: 'spawnTroll', weight: 15 }],
  },
  {
    floor: 5,
    weights: [{ value: 'spawnTroll', weight: 30 }],
  },
  {
    floor: 7,
    weights: [{ value: 'spawnTroll', weight: 60 }],
  },
];
```

The `RNG` module uses the weights given to determine how likely a choice is. The numbers are arbitrary, but a higher
number means a higher likelihood of that choice being picked. To use these weights we'll implement a utility function
that will give us just the weights for a given a floor. Add this function to the bottom of the file:

```typescript
type WeightMap = {
  [key: string]: number;
};

function getWeights(
  chancesByFloor: WeightedChoices[],
  floorNumber: number,
): WeightMap {
  let current: WeightMap = {};

  for (let { floor, weights } of chancesByFloor) {
    if (floor > floorNumber) break;

    for (let { value, weight } of weights) {
      current[value] = weight;
    }
  }

  return current;
}
```

Much like `getMaxValueForFloor` we loop over a given set of options and build up the map of weights that apply to a given
floor. With this function in plce we just need to update `placeEntities` to use it. First we'll update the loop where
we add monsters to the map:

```typescript
for (let i = 0; i < numberOfMonstersToAdd; i++) {
  const x = generateRandomNumber(bounds.x1 + 1, bounds.x2 - 1);
  const y = generateRandomNumber(bounds.y1 + 1, bounds.y2 - 1);

  if (!dungeon.entities.some((e) => e.x == x && e.y == y)) {
    const weights = getWeights(MONSTER_CHANCES, floorNumber);
    const spawnType = RNG.getWeightedValue(weights);
    if (spawnType) {
      spawnMap[spawnType](dungeon, x, y);
    }
  }
}
```

We get the weighted options for the current floor, and then use the `getWeightedValue` function from ROT.js to get
a type of monster to spawn. We then use that spawn type as a key into our map of spawn functions to dynamically spawn
a monster of that type. 

Lastly, we need to update the loop where we add items:

```typescript
for (let i = 0; i < numberOfItemsToAdd; i++) {
  const x = generateRandomNumber(bounds.x1 + 1, bounds.x2 - 1);
  const y = generateRandomNumber(bounds.y1 + 1, bounds.y2 - 1);

  if (!dungeon.entities.some((e) => e.x == x && e.y == y)) {
    const weights = getWeights(ITEM_CHANCES, floorNumber);
    const spawnType = RNG.getWeightedValue(weights);
    if (spawnType) {
      spawnMap[spawnType](dungeon, x, y);
    }
  }
}
```

The item loop works just like the monster loop, using the `ITEM_CHANCES` options instead of `MONSTER_CHANCES`. Run the
game and progress through the dungeon. On floor one you should only see orcs and health potions, but as you go deeper
you should start running into more enemies per room, start seeing trolls more often, and see different items. You
can find the complete code for this chapter [here](https://github.com/bodiddlie/js-rogue-tutorial/tree/part12).