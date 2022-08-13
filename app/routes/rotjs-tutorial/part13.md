---
title: 'ROT.js Tutorial Part 13: Equipment'
date: 2022-08-12T08:00:00.000Z
meta:
    title: 'ROT.js Tutorial Part 13: Equipment'
    date: "August 12, 2022"
    description: "We've reached the final chapter of this tutorial series. In this entry we'll add weapons and armor that the player can add to their inventory and then equip. This equipment will bolster the player's attributes and allow them to hit harder or block more damage."
---

# {attributes.title}
{attributes.date.toDateString()}

We've reached the final chapter of this tutorial series. In this entry, we'll add weapons and armor that the player can add
to their inventory and then equip. This equipment will bolster the player's attributes and allow them to hit harder or
block more damage. 

We'll get started by adding a new file called `equipment-types.ts`. In this file, we'll create an enum that will represent
the different categories of equipment we'll have in our game:

```typescript
export enum EquipmentType {
  Weapon,
  Armor,
}
```

Next we'll create a new component that will be a base class for different equipment. Create a new file in the `components`
directory called `equippable.ts`:

```typescript
import { BaseComponent } from './base-component';
import { Item } from '../entity';
import { EquipmentType } from '../equipment-types';

export abstract class Equippable extends BaseComponent {
  parent: Item | null;

  constructor(
    public equipmentType: EquipmentType,
    public powerBonus: number = 0,
    public defenseBonus: number = 0,
  ) {
    super();
    this.parent = null;
  }
}
```

The `Equippable` class contains data of what category equipment it is, and what bonuses it provides to power
and defense. In this same file let's create some subclasses that represent specific equipment:

```typescript
export class Dagger extends Equippable {
  constructor() {
    super(EquipmentType.Weapon, 2);
  }
}

export class Sword extends Equippable {
  constructor() {
    super(EquipmentType.Weapon, 4);
  }
}

export class LeatherArmor extends Equippable {
  constructor() {
    super(EquipmentType.Armor, 0, 1);
  }
}

export class ChainMail extends Equippable {
  constructor() {
    super(EquipmentType.Armor, 0, 3);
  }
}
```

The benefit of creating classes like this instead of just instantiating the `Equippable` class is we have the flexibility
to add functionality to these subclasses if we want to later.

Next we'll make some changes to the `Item` class in `entity.ts`. First, add some new imports at the top of the file:

```typescript
import {
  ChainMail,
  Dagger,
  Equippable,
  LeatherArmor,
  Sword,
} from './components/equippable';
```

Then we'll update the `Item` class to also be able to take an `Equippable`:

```typescript
export class Item extends Entity {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public char: string = '?',
    public fg: string = '#fff',
    public bg: string = '#000',
    public name: string = '<Unnamed>',
    public consumable: Consumable | null = null,
    public equippable: Equippable | null = null,
    public parent: GameMap | BaseComponent | null = null,
  ) {
    super(x, y, char, fg, bg, name, false, RenderOrder.Item, parent);
    if (this.consumable) {
      this.consumable.parent = this;
    }

    if (this.equippable) {
      this.equippable.parent = this;
    }
  }
}
```

We've changed `consumable` to be an optional property. Because of this, we need to check if it exists in the constructor
before setting the parent. We do the same for `equippable` as well. Now let's create some new spawn functions for our
different equipment:

```typescript
export function spawnDagger(gameMap: GameMap, x: number, y: number): Item {
  return new Item(
    x,
    y,
    '/',
    '#00bfff',
    '#000',
    'Dagger',
    null,
    new Dagger(),
    gameMap,
  );
}

export function spawnSword(gameMap: GameMap, x: number, y: number): Item {
  return new Item(
    x,
    y,
    '/',
    '#00bfff',
    '#000',
    'Sword',
    null,
    new Sword(),
    gameMap,
  );
}

export function spawnLeatherArmor(
  gameMap: GameMap,
  x: number,
  y: number,
): Item {
  return new Item(
    x,
    y,
    '[',
    '#8b4513',
    '#000',
    'Leather Armor',
    null,
    new LeatherArmor(),
    gameMap,
  );
}

export function spawnChainMail(gameMap: GameMap, x: number, y: number): Item {
  return new Item(
    x,
    y,
    '[',
    '#8b4513',
    '#000',
    'Chain Mail',
    null,
    new ChainMail(),
    gameMap,
  );
}
```

For these items we pass `null` for the `consumable` parameter, and use one of our `Equippable` subclasses for the 
`equippable` parameter. Let's add these new functions to our `spawnMap` so we can use them when we generate a level:

```typescript
export const spawnMap: SPAWNMAP = {
  spawnOrc,
  spawnTroll,
  spawnHealthPotion,
  spawnConfusionScroll,
  spawnLightningScroll,
  spawnFireballScroll,
  spawnDagger,
  spawnSword,
  spawnLeatherArmor,
  spawnChainMail,
};  
```

With `consumable` possibly being null, we now need to update the `perform` method in `ItemAction`in `actions.ts` to 
handle this possibility:

```typescript
perform(entity: Entity, gameMap: GameMap) {
  this.item?.consumable?.activate(this, entity, gameMap);
}
```

Next we'll create another component that will operate like an inventory. This class will have "slots" for equipment:
one for a weapon, and one for armor. We'll then add this equipment inventory to our `Actor` class. Start by creating
a new file in `components` called `equipment.ts`:

```typescript
import { BaseComponent } from './base-component';
import { Actor, Item } from '../entity';
import { EquipmentType } from '../equipment-types';

type Slot = {
  [slotName: string]: Item | null;
};

export class Equipment extends BaseComponent {
  parent: Actor | null;
  slots: Slot;

  constructor(weapon: Item | null = null, armor: Item | null = null) {
    super();
    this.slots = {
      weapon,
      armor,
    };
    this.parent = null;
  }
}
```

We type the `slots` property this way because we want to dynamically reference them in some methods we'll implement shortly.
Let's add a couple getters that will be useful for calculating how equipment affects the player's attributes:

```typescript
public get defenseBonus(): number {
  let bonus = 0;
  if (this.slots['weapon'] && this.slots['weapon'].equippable) {
    bonus += this.slots['weapon'].equippable.defenseBonus;
  }
  if (this.slots['armor'] && this.slots['armor'].equippable) {
    bonus += this.slots['armor'].equippable.defenseBonus;
  }
  return bonus;
}

public get powerBonus(): number {
  let bonus = 0;
  if (this.slots['weapon'] && this.slots['weapon'].equippable) {
    bonus += this.slots['weapon'].equippable.powerBonus;
  }
  if (this.slots['armor'] && this.slots['armor'].equippable) {
    bonus += this.slots['armor'].equippable.powerBonus;
  }
  return bonus;
}
```

These getters total up the power and defense bonuses provided by all the items currently equipped and returns the total
bonus. Next we'll add a couple utility methods:

```typescript
itemIsEquipped(item: Item): boolean {
  return this.slots['weapon'] === item || this.slots['armor'] === item;
}

unequipMessage(itemName: string) {
  window.messageLog.addMessage(`You remove the ${itemName}.`);
}

equipMessage(itemName: string) {
  window.messageLog.addMessage(`You equip the ${itemName}.`);
}
```

`itemIsEquipped` checks if the given item is currently equipped on the actor. The two message methods add messages
to the log indicating an item was equipped or unequipped. Next we'll add a method to unequip an item:

```typescript
unequipFromSlot(slot: string, addMessage: boolean) {
  const currentItem = this.slots[slot];
  if (addMessage && currentItem) {
    this.unequipMessage(currentItem.name);
  }
  this.slots[slot] = null;
}
```

This method checks if there is an item in the given slot, and then unequips it. Being able to reference a slot via a 
string like this is why we gave the `slots` property the type we did. Otherwise, we would have to directly reference
each slot. With only two slots currently that doesn't seem so bad, but if we wanted to add multiple slot types, it would
get cumbersome. 

Next we'll add a method to equip an item:

```typescript
equipToSlot(slot: string, item: Item, addMessage: boolean) {
  const currentItem = this.slots[slot];
  if (currentItem) {
    this.unequipFromSlot(slot, addMessage);
  }
  this.slots[slot] = item;

  if (addMessage) {
    this.equipMessage(item.name);
  }
}
```

This method checks if an item is currently equipped in the given slot, and if so, removes it. It then equips the item
and adds a message to the log. The last thing we'll add to this class is a method to toggle between equipped and 
unequipped:

```typescript
toggleEquip(item: Item, addMessage: boolean = true) {
  let slot = 'armor';
  if (
    item.equippable &&
    item.equippable.equipmentType === EquipmentType.Weapon
  ) {
    slot = 'weapon';
  }

  if (this.slots[slot] === item) {
    this.unequipFromSlot(slot, addMessage);
  } else {
    this.equipToSlot(slot, item, addMessage);
  }
}
```

This method checks the type of equipment we have and then either equips or removes it from the slot for that type. 

Now we can add this component to our `Actor` class in `entity.ts`. First make sure you add the import for `Equipment` at
the top of the file. Then update `Actor` to look like this:

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
    public equipment: Equipment,
    public fighter: Fighter,
    public inventory: Inventory,
    public level: Level,
    public parent: GameMap | null = null,
  ) {
    super(x, y, char, fg, bg, name, true, RenderOrder.Actor, parent);
    this.fighter.parent = this;
    this.equipment.parent = this;
    this.inventory.parent = this;
  }

  public get isAlive(): boolean {
    return !!this.ai || window.engine.player === this;
  }
}
```

Then we'll update the spawn functions for our actors to use this component:

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
    new Equipment(),
    new Fighter(30, 1, 2),
    new Inventory(26),
    new Level(200),
    gameMap,
  );
  player.level.parent = player;
  return player;
}

export function spawnOrc(gameMap: GameMap, x: number, y: number): Actor {
  return new Actor(
    x,
    y,
    'o',
    '#3f7f3f',
    '#000',
    'Orc',
    new HostileEnemy(),
    new Equipment(),
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
    new Equipment(),
    new Fighter(16, 1, 4),
    new Inventory(0),
    new Level(0, 100),
    gameMap,
  );
}
```

Notice that we've reduced the power and defense of the player actor. We'll be depending on equipment to supplement
these attributes from now on. Let's update `fighter.ts` to reflect the equipment bonuses:

```typescript
export class Fighter extends BaseComponent {
  parent: Actor | null;
  _hp: number;

  constructor(
    public maxHp: number,
    public baseDefense: number,
    public basePower: number,
  ) {
    super();
    this._hp = maxHp;
    this.parent = null;
  }
```

We've updated the constructor to take in a base power and defense instead of the raw values. We'll use these to calculate
the total attribute along with any equipment bonuses. Let's add a few getters to do this for us:

```typescript
public get defenseBonus(): number {
  if (this.parent?.equipment) {
    return this.parent.equipment.defenseBonus;
  }
  return 0;
}

public get powerBonus(): number {
  if (this.parent?.equipment) {
    return this.parent.equipment.powerBonus;
  }
  return 0;
}

public get defense(): number {
  return this.baseDefense + this.defenseBonus;
}

public get power(): number {
  return this.basePower + this.powerBonus;
}
```

We'll now update `level.ts` to use these new bases when increasing attributes:

```typescript
increasePower(amount: number = 1) {
  const actor = this.parent as Actor;
  if (!actor) return;
  actor.fighter.basePower += amount;

  window.messageLog.addMessage('You feel stronger!');

  this.increaseLevel();
}

increaseDefense(amount: number = 1) {
  const actor = this.parent as Actor;
  if (!actor) return;
  actor.fighter.baseDefense += amount;

  window.messageLog.addMessage('Your movements are getting swifter!');

  this.increaseLevel();
}
```

Now we can update the weighted choices for items in `procgen.ts` to include chances for adding equipment:

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
    weights: [
      { value: 'spawnLightningScroll', weight: 25 },
      { value: 'spawnSword', weight: 5 },
    ],
  },
  {
    floor: 6,
    weights: [
      { value: 'spawnFireballScroll', weight: 25 },
      { value: 'spawnChainMail', weight: 15 },
    ],
  },
];
```

With this update, swords will have a chance to spawn starting at floor four, and chain mail will start at floor six. We don't
include the dagger or leather armor here because we'll start the player with these items. Open up `game-screen.ts` and
we'll make changes to add them when the player starts a new game. First we need to import the new spawn functions for all
our equipment:

```typescript
import {
  Actor,
  Item,
  spawnChainMail,
  spawnConfusionScroll,
  spawnDagger,
  spawnFireballScroll,
  spawnHealthPotion,
  spawnLeatherArmor,
  spawnLightningScroll,
  spawnOrc,
  spawnPlayer,
  spawnSword,
  spawnTroll,
} from '../entity';
```

Then in the constructor when we create a new game, we'll add a dagger and leather armor to the player:

```typescript
if (serializedGameMap) {
  // omitted branch for brevity
} else {
  this.generateFloor();
  const dagger = spawnDagger(this.gameMap, 0, 0);
  dagger.parent = this.player.inventory;
  this.player.inventory.items.push(dagger);
  this.player.equipment.toggleEquip(dagger, false);
  this.gameMap.removeEntity(dagger);

  const leatherArmor = spawnLeatherArmor(this.gameMap, 0, 0);
  leatherArmor.parent = this.player.inventory;
  this.player.inventory.items.push(leatherArmor);
  this.player.equipment.toggleEquip(leatherArmor, false);
  this.gameMap.removeEntity(leatherArmor);
}
```

While we're in this file we'll make a couple more changes. We currently render the inventory screen here in our `GameScreen`
class. It makes more sense for that to happen in the input handler for the inventory. We'll update that in a bit, but for
now we'll remove the rendering of the inventory in the `render` method. Remove the two `if` blocks that check for the
`UseInventory` and `DropInventory` values. We can also remove the `renderInventory` method now that isn't being used
any longer.

Next we'll update the `load` method to account for equipment when loading a saved game. Find the loop where we go over
the player's inventory and add cases for our equipment:

```typescript
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
    case 'Dagger': {
      item = spawnDagger(map, 0, 0);
      break;
    }
    case 'Sword': {
      item = spawnSword(map, 0, 0);
      break;
    }
    case 'Leather Armor': {
      item = spawnLeatherArmor(map, 0, 0);
      break;
    }
    case 'Chain Mail': {
      item = spawnChainMail(map, 0, 0);
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

Then find the loop where we go over all the entities on the map and add cases for the equipment as well:

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
  } else if (e.name === 'Dagger') {
    spawnDagger(map, e.x, e.y);
  } else if (e.name === 'Sword') {
    spawnSword(map, e.x, e.y);
  } else if (e.name === 'Leather Armor') {
    spawnLeatherArmor(map, e.x, e.y);
  } else if (e.name === 'Chain Mail') {
    spawnChainMail(map, e.x, e.y);
  }
}
```

Next we'll update the drop action so that when an equipped item is dropped it gets unequipped (wouldn't be fair to drop
an item and still get the bonus from it). Open up `actions.ts` and modify the `DropItem` class:

```typescript
export class DropItem extends ItemAction {
  perform(entity: Entity, gameMap: GameMap) {
    const dropper = entity as Actor;
    if (!dropper || !this.item) return;
    dropper.inventory.drop(this.item, gameMap);

    if (dropper.equipment.itemIsEquipped(this.item)) {
      dropper.equipment.toggleEquip(this.item);
    }
  }
}
```

Then we'll add a new action for equipping an item from the inventory:

```typescript
export class EquipAction extends Action {
  constructor(public item: Item) {
    super();
  }

  perform(entity: Entity, _gameMap: GameMap) {
    const actor = entity as Actor;
    if (!actor) return;
    actor.equipment.toggleEquip(this.item);
  }
}
```

Lastly, we'll bring this all together with some input handling. Open `input-handler.ts` and be sure
to import our new `EquipAction` class at the top. We'll update our `InventoryInputHandler` to have an `onRender` method
to handle the rendering we removed earlier:

```typescript
onRender(display: Display) {
  const title =
    this.inputState === InputState.UseInventory
      ? 'Select an item to use'
      : 'Select an item to drop';
  const itemCount = window.engine.player.inventory.items.length;
  const height = itemCount + 2 <= 3 ? 3 : itemCount + 2;
  const width = title.length + 4;
  const x = window.engine.player.x <= 30 ? 40 : 0;
  const y = 0;

  renderFrameWithTitle(x, y, width, height, title);

  if (itemCount > 0) {
    window.engine.player.inventory.items.forEach((i, index) => {
      const key = String.fromCharCode('a'.charCodeAt(0) + index);
      const isEquipped = window.engine.player.equipment.itemIsEquipped(i);
      let itemString = `(${key}) ${i.name}`;
      itemString = isEquipped ? `${itemString} (E)` : itemString;
      display.drawText(x + 1, y + index + 1, itemString);
    });
  } else {
    display.drawText(x + 1, y + 1, '(Empty)');
  }
}
```

This works similarly to the way we previously rendered the inventory, with the addition of drawing an `(E)` next to 
an equipped item. With that in place all we have to do is update the keyboard handling:

```typescript
handleKeyboardInput(event: KeyboardEvent): Action | null {
  if (event.key.length === 1) {
    const ordinal = event.key.charCodeAt(0);
    const index = ordinal - 'a'.charCodeAt(0);
    if (index >= 0 && index <= 26) {
      const item = window.engine.player.inventory.items[index];
      if (item) {
        this.nextHandler = new GameInputHandler();
        if (this.inputState === InputState.UseInventory) {
          if (item.consumable) {
            return item.consumable.getAction();
          } else if (item.equippable) {
            return new EquipAction(item);
          }
          return null;
        } else if (this.inputState === InputState.DropInventory) {
          return new DropItem(item);
        }
      } else {
        window.messageLog.addMessage('Invalid entry.', Colors.Invalid);
        return null;
      }
    }
  }
  this.nextHandler = new GameInputHandler();
  return null;
}
```

When using an item, we check whether it is consumable or equippable and return the relevant action. Run the game
and when you pull up your inventory, you should see that you start with a dagger and some leather armor. If you play for a 
while and delve deeper you should start to see swords and chain mail as well. 

If you made it all the way to the end of this series, then congratulations and *THANK YOU* so much for reading! This
has been a ton of fun to work on. I hope it was fun for you to follow!

You can find the complete code for the whole series at [my GitHub](https://github.com/bodiddlie/js-rogue-tutorial).
