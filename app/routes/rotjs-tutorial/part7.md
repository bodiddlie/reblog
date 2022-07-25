---
title: 'ROT.js Tutorial Part 7: User Interface'
date: 2022-07-24T08:00:00.000Z
meta:
    title: 'ROT.js Tutorial Part 7: User Interface'
    date: "July 24, 2022"
    description: "In the last chapter we added ways for the player to interact with the world in our game. We can deal damage to and take damage from monsters. In this chapter we'll add some ways to provide some valuable information about the world to the player. We'll add user interface elements for displaying the player's current health, a log of events that have happened during the course of the game, and a way to get information about the entities visible on the screen."
---

# {attributes.title}
{attributes.date.toDateString()}

In the last chapter we added ways for the player to interact with the world in our game. We can deal damage to and take
damage from monsters. In this chapter we'll add some ways to provide some valuable information about the world to the
player. We'll add user interface elements for displaying the player's current health, a log of events that have happened
during the course of the game, and a way to get information about the entities visible on the screen.

### Health and Wellness

We currently just write some text to the screen showing how much health the player has. In this section we'll add a 
better looking way of conveying that information. First let's create a new file called `colors.ts`:

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
}
```

This enum gives us a convenient way to reference the various colors we'll be using in our game. This way we won't have
to reference a bunch of hard-coded strings throughout our code.

For showing the player's current health, we're going to display a bar that starts all green if they have full health.
As their health decreases, the green bar will get smaller, leaving a red background indicating the missing health. We'll
also still print the numerical value of their health so the player can get an exact idea of where they stand. In order to 
do this we'll introduce some functions for rendering these UI elements to the screen. Create a new file called
`render-functions.ts`. We'll start by adding a function for drawing a colored bar on the screen:


```typescript
import { Display } from 'rot-js';

import { Colors } from './colors';

function drawColoredBar(
  display: Display,
  x: number,
  y: number,
  width: number,
  color: Colors,
) {
  for (let pos = x; pos < x + width; pos++) {
    display.draw(pos, y, ' ', color, color);
  }
}
```

This function starts at a given position and draws a horizontal bar of the given color by looping over the width that
was passed in. To render our health bar we'll use this function to first draw a red bar at the full width of our
health meter. Then we'll draw a green bar that is as wide as the percentage of current health of the player. Since
we draw the red background first, the green bar will overwrite that bar resulting in a partially filled bar as the player's
health decreases. Let's add a function to render the full health bar:

```typescript
export function renderHealthBar(
  display: Display,
  currentValue: number,
  maxValue: number,
  totalWidth: number,
) {
  const barWidth = Math.floor((currentValue / maxValue) * totalWidth);

  drawColoredBar(display, 0, 45, totalWidth, Colors.BarEmpty);
  drawColoredBar(display, 0, 45, barWidth, Colors.BarFilled);

  const healthText = `HP: ${currentValue}/${maxValue}`;

  for (let i = 0; i < healthText.length; i++) {
    display.drawOver(i + 1, 45, healthText[i], Colors.White, null);
  }
}
```

We first calculate the width of the green bar (which represents the current health of the player) by calculating the 
percentage of health remaining, rounded down. Then we draw a red bar that is the total width of the health bar. Followed
by the green bar using the width we calculated before. Finally, we draw the text representation of the player's health.
We use the `drawOver` method of the display in order to preserve the background color of the health bar.

To get this health bar on screen, let's jump over to `engine.ts` and first import the new function:

```typescript
import { renderHealthBar } from './render-functions';
```

Next we just need to update the `render` method to use our new health bar function:

```typescript
render() {
  renderHealthBar(
    this.display,
    this.player.fighter.hp,
    this.player.fighter.maxHp,
    20,
  );
  this.gameMap.render();
}
```

Go ahead and run the game and take some damage. You should see the green portion of the health bar shrink. You can find the
complete code for this section [here](https://github.com/bodiddlie/js-rogue-tutorial/tree/part7-1).

### It's Log, It's Log, It's Better Than Bad It's Good

Currently, when something happens in our game, we write information about the event to `console.log`. This is a handy
development tool, but we can't expect a user to have the developer tools of their browser open to see information
about the game. In this section we'll add a message log to our user interface, so we can display messages to the user.
Create new file called `message-log.ts`. We'll put all the logic for rendering our log in this file. Start by adding the
below code:

```typescript
import { Display } from 'rot-js';
import { Colors } from './colors';

export class Message {
  count: number;

  constructor(public plainText: string, public fg: Colors) {
    this.count = 1;
  }

  get fullText(): string {
    if (this.count > 1) {
      return `${this.plainText} (x${this.count})`;
    }
    return this.plainText;
  }
}
```

Our new `Message` class will represent a single message to be displayed on the log. It has the text to be displayed
as well as the color we want to display it in. We also keep track of a count. This will allow us to collapse repeated
messages and show how many times that repeated message has been logged. 

Next we'll start building our actual `MessageLog` class. 

```typescript
export class MessageLog {
  messages: Message[];

  constructor() {
    this.messages = [];
  }
}
```

The log will start out with an empty list of messages that we'll add to over time. Let's create a method for adding 
messages to this list:

```typescript
addMessage(text: string, fg: Colors = Colors.White, stack: boolean = true) {
  if (
    stack &&
    this.messages.length > 0 &&
    this.messages[this.messages.length - 1].plainText === text
  ) {
    this.messages[this.messages.length - 1].count++;
  } else {
    this.messages.push(new Message(text, fg));
  }
}
```

This method checks if we want to stack repeating messages. If we do, it then checks if the last message added is the 
same as the message being added. If they are, we increase the `count` on the previous message. If they aren't the same,
we create a new message object and add it to the list. 

Now let's write the function for rendering this log to the screen:

```typescript
  renderMessages(
  display: Display,
  x: number,
  y: number,
  width: number,
  height: number,
  messages: Message[],
) {
  let yOffset = height - 1;

  const reversed = messages.slice().reverse();
  for (let msg of reversed) {
    let lines = [msg.fullText];
    if (msg.fullText.length > width) {
      const words = msg.fullText.split(' ');
      let currentLine = '';
      lines = [];

      // loop through words
      while (words.length > 0) {
        // if current line length + word length > width: start new line
        if ((currentLine + ' ' + words[0]).length > width) {
          lines.push(currentLine);
          currentLine = '';
        } else {
          // else add word to current line
          currentLine += ' ' + words.shift();
        }
      }

      lines.push(currentLine);
      lines.reverse();
    }

    for (let line of lines) {
      const text = `%c{${msg.fg}}${line}`;
      display.drawText(x, y + yOffset, text, width);
      yOffset -= 1;
      if (yOffset < 0) return;
    }
  }
}
```

This is a fairly lengthy method, so let's break down piece by piece:

```typescript
  render(
  display: Display,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  let yOffset = height - 1;
```

We take in the display we want to draw to, the position of the top left of our message log "window", and the width and 
height of the log. We then start by calculating a `yOffset` that we'll use for drawing messages from the bottom of the log
so that most recent messages are at the bottom.

```typescript
const reversed = messages.slice().reverse();
for (let msg of reversed) {
```

We then reverse the list of messages because we want to render the most recent messages first. We first call `slice`
on the list because `reverse` actually mutates the array in place, and we want to keep our messages in order. We only need
to reverse for rendering. We then start looping over each message in the list to start drawing them.

```typescript
let lines = [msg.fullText];
if (msg.fullText.length > width) {
  const words = msg.fullText.split(' ');
  let currentLine = '';
  lines = [];
```

Inside our loop we first create a list with just the text of the current message. We then check if that message is longer
than the width of our log window. If it isn't we'll just skip over the following if statement and render the message.
If it is longer than the width of the window though, we split the text into a list of all the words. We set up an empty
string to track the text we'll build up using those words, and clear out our `lines` array.

```typescript
// loop through words
while (words.length > 0) {
  // if current line length + word length > width: start new line
  if ((currentLine + ' ' + words[0]).length > width) {
    lines.push(currentLine);
    currentLine = '';
  } else {
    // else add word to current line
    currentLine += ' ' + words.shift();
  }
}
```

Next we start a loop as long as there are words still in the list. For each word we check if adding that word to our
`currentLine` string will make it longer than the window width. If it does, we push the current line into our list of 
lines, and then reset `currentLine` to an empty string. This will start a new line for us to render. If the current line
isn't longer than the window, then we'll add the new word by popping it off the front of the list.

```typescript
  lines.push(currentLine);
  lines.reverse();
}
```

We then make sure we push the last line built in the loop to lour list, and then reverse it, so it renders in the order
we want. We can reverse this list in place because it is local to this function, and we wouldn't be mutating any state
that would cause problems later in the game.

```typescript
  for (let line of lines) {
    const text = `%c{${msg.fg}}${line}`;
    display.drawText(x, y + yOffset, text, width);
    yOffset -= 1;
    if (yOffset < 0) return;
  }
 }
}
```

We then loop over each of these built lines and construct a string with the text and foreground color for the message.
ROT.js uses the `%c{}` syntax to render text in a given color. We draw that text to the screen and then reduce the yOffset
by 1. Doing this makes it so the next message in the list will render above this one. If the yOffset drops below 0 then
we have filled our log window and can return from the function and stop rendering.

Add one more method to our message log class:

```typescript
render(
  display: Display,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  this.renderMessages(display, x, y, width, height, this.messages);
}
```

This is just a simple method that defaults to trying to display all our messages. To put this message log to work, 
jump over to `engine.ts` and add some imports:

```typescript
import { MessageLog } from './message-log';
import { Colors } from './colors';
```

Next we need to make a little room for our log window by changing the height of our map:

```typescript
public static readonly MAP_HEIGHT = 43;
```

We'll then add a new instance variable and update the constructor:

```typescript
messageLog: MessageLog;

constructor(public player: Actor) {
  this.display = new ROT.Display({
    width: Engine.WIDTH,
    height: Engine.HEIGHT,
    forceSquareRatio: true,
  });
  const container = this.display.getContainer()!;
  document.body.appendChild(container);
  this.messageLog = new MessageLog();
  this.messageLog.addMessage(
    'Hello and welcome, adventurer, to yet another dungeon!',
    Colors.WelcomeText,
  );
```

We've created a new instance of the message log and added a starting message to it. Now we just need to render the log
to the screen:

```typescript
render() {
  this.messageLog.render(this.display, 21, 45, 40, 5);

  renderHealthBar(
    this.display,
    this.player.fighter.hp,
    this.player.fighter.maxHp,
    20,
  );
  this.gameMap.render();
}
```

There's also a small bug I discovered at this point in writing the tutorial. If you press a key on your keyboard that isn't
in our input mapping, the monsters will still take an action. That's because the method call to handle enemy turns is outside
the if statement checking if the player took an action. Fix that by changing the if statement in the `update` method to
look like this:

```typescript
if (action) {
  action.perform(this.player);
  this.handleEnemyTurns();
}
```

One more small bug that was masked by what we just fixed is that if you hit the period key on your keyboard now nothing
happens at all. We've designated this as a `WaitAction` so we would expect the monsters to move. The reason for this
is that the `KeybaordEvent.key` code uses a string of `'.'` and not the word `Period` as we have written our input mapping.
Change the mapping to this:

```typescript
const MOVE_KEYS: MovementMap = {
  // Other keys omitted for brevity
  // Wait keys
  5: new WaitAction(),
  '.': new WaitAction(),
};
```

Run the application now, and you should see our friendly welcome message at the bottom of the screen and the keyboard inputs
should be fixed. You can find the complete code for this section [here](https://github.com/bodiddlie/js-rogue-tutorial/tree/part7-2).

### The Hits Keep Coming

The actions that happen in our game are still writing to `console.log` and not to our message log. Let's fix that now.
Open up `input-handler.ts` and first import our colors:

```typescript
import { Colors } from '../colors';
```

Now let's update the places where we log to the console in the `MeleeAction` class to use our new message log:

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
```

Here we just determine the color to use by checking if the entity taking action is the player or not. We build our text
the same way as before, but instead of logging to the console, we add a new message to our `MessageLog` class on the
global engine.

The last place we're logging to the console is when an entity dies. Open up `fighter.ts` and we'll add our colors:

```typescript
import { Colors } from '../colors';
```

Now we can update the `die` method to use our message log:

```typescript
die() {
  if (!this.entity) return;

  let deathMessage = '';
  let fg = null;
  if (window.engine.player === this.entity) {
    deathMessage = 'You died!';
    fg = Colors.PlayerDie;
  } else {
    deathMessage = `${this.entity.name} is dead!`;
    fg = Colors.EnemyDie;
  }

  this.entity.char = '%';
  this.entity.fg = '#bf0000';
  this.entity.blocksMovement = false;
  this.entity.ai = null;
  this.entity.name = `Remains of ${this.entity.name}`;
  this.entity.renderOrder = RenderOrder.Corpse;

  window.engine.messageLog.addMessage(deathMessage, fg);
}
```

We use the text we previously built, and then determine a color to use based on which entity is dying. We then add a new
message to the log.

Run the game and hit some monsters and let them hit you. You should see messages in different colors displayed in our 
new log. You can find the complete code for this section [here](https://github.com/bodiddlie/js-rogue-tutorial/tree/part7-3).

### What's the Point

While it's easy now to remember that an `o` is an orc and a `T` is a troll in our game, as we add more things on screen
it will become harder to keep track of. Rather than force the player to memorize some esoteric list of letters that map
to entities, let's provide a way for them to get information about something by hovering their mouse over it. We'll
start by adding a new function to `render-functions.ts`:

```typescript
export function renderNamesAtLocation(x: number, y: number) {
  const [mouseX, mouseY] = window.engine.mousePosition;
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

This function first takes the mouse position from the engine (which we'll be adding momentarily) and checks if that 
position is in bounds of the map, and hovering over a visible location. We then loop over all the entities and check
if any are in this position, and if so, draw their name to the screen.

Before we go update the engine to use this, let's get ahead of a little rendering problem. When we start the game
we render at the end of our engine constructor. We've been adding a lot of things that use the global engine that is 
stored at `window.engine`. The problem is that until the constructor has completed, that global engine variable isn't
populated. So we could get ourselves into a situation where we render before our constructor has finished and can run
into some hard to diagnose bugs. To fix this we'll wait to render until the constructor finishes. Update `main.ts` to look
like this:

```typescript
window.addEventListener('DOMContentLoaded', () => {
  window.engine = new Engine(spawnPlayer(Engine.WIDTH / 2, Engine.HEIGHT / 2));
  window.engine.render();
});
```

Next let's remove the call to render from the end of the constructor in `engine.ts`. Now we can start rendering the 
names of entities we hover over. Let's import our new function:

```typescript
import { renderHealthBar, renderNamesAtLocation } from './render-functions';
```

Now we'll add a new instance variable for tracking the mouse position and initialize it:

```typescript
display: ROT.Display;
gameMap: GameMap;
messageLog: MessageLog;
mousePosition: [number, number];

constructor(public player: Actor) {
  this.display = new ROT.Display({
    width: Engine.WIDTH,
    height: Engine.HEIGHT,
    forceSquareRatio: true,
  });
  this.mousePosition = [0, 0];
```

Then after we set up the `keydown` event listener, let's add a new event listener for tracking when the user moves
their mouse:

```typescript
window.addEventListener('mousemove', (event) => {
  this.mousePosition = this.display.eventToPosition(event);
  this.render();
});
```

This event listener uses the `eventToPosition` method on our display. This will convert a pixel coordinate across the whole
browser viewport to a position on our ASCII display. This saves us a lot of tedious calculations to find the position in 
our map. We then render the screen without calling other updates because we only need to update the name display.

Next we can update our `render` method to actually display the hovered entities names:

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
}
```

We can also remove the `this.display.clear()` call at the top of `update` as it makes more sense in our render call. Run
the game, find some monsters and hover over them. You should see the names displayed just above our message log. If you
can gather a few corpses of monsters in one tile, you see that it renders all the names at once. The complete code for 
this section can be [found here](https://github.com/bodiddlie/js-rogue-tutorial/tree/part7-4).

### A Brief History of the World

Right now our message log just shows the five most recent messages. What if we wanted to see the entire history of messages
that have been logged so far? For the last part of this chapter we'll add the functionality to pop up a window that shows 
a scrollable history of all the messages in our log. We'll start by adding a new function to our `render-functions.ts` file:

```typescript
export function renderFrameWithTitle(
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
) {
  const topLeft = '┌';
  const topRight = '┐';
  const bottomLeft = '└';
  const bottomRight = '┘';
  const vertical = '│';
  const horizontal = '─';
  const leftTitle = '┤';
  const rightTitle = '├';
  const empty = ' ';

  const innerWidth = width - 2;
  const innerHeight = height - 2;
  const remainingAfterTitle = innerWidth - (title.length + 2); // adding two because of the borders on left and right
  const left = Math.floor(remainingAfterTitle / 2);

  const topRow =
    topLeft +
    horizontal.repeat(left) +
    leftTitle +
    title +
    rightTitle +
    horizontal.repeat(remainingAfterTitle - left) +
    topRight;
  const middleRow = vertical + empty.repeat(innerWidth) + vertical;
  const bottomRow = bottomLeft + horizontal.repeat(innerWidth) + bottomRight;

  window.engine.display.drawText(x, y, topRow);
  for (let i = 1; i <= innerHeight; i++) {
    window.engine.display.drawText(x, y + i, middleRow);
  }
  window.engine.display.drawText(x, y + height - 1, bottomRow);
}
```

Let's break this one down:

```typescript
export function renderFrameWithTitle(
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
) {
  const topLeft = '┌';
  const topRight = '┐';
  const bottomLeft = '└';
  const bottomRight = '┘';
  const vertical = '│';
  const horizontal = '─';
  const leftTitle = '┤';
  const rightTitle = '├';
  const empty = ' ';
```

The function takes in the x/y coordinate of the top left of the history window, the width and height of the window, and a
title to print at the top of it. We then establish some constants we'll use for drawing the border of the window.

```typescript
const innerWidth = width - 2;
const innerHeight = height - 2;
const remainingAfterTitle = innerWidth - (title.length + 2); // adding two because of the borders on left and right
const left = Math.floor(remainingAfterTitle / 2);
```

We calculate the inner width and height of the window minus the borders. We subtract the title from that innerwidth
to find out how many tiles we have left for border at the top. We divide that remaining amount by two and round down
to determine how many border tiles to render to the left of the title.

```typescript
const topRow =
  topLeft +
  horizontal.repeat(left) +
  leftTitle +
  title +
  rightTitle +
  horizontal.repeat(remainingAfterTitle - left) +
  topRight;
const middleRow = vertical + empty.repeat(innerWidth) + vertical;
const bottomRow = bottomLeft + horizontal.repeat(innerWidth) + bottomRight;
```

We build out a top row that includes corners, horizontal borders, and the title. The middle row just has vertical borders
at the left and right side with empty space between. Then a bottom row that is corners and horizontal borders.

```typescript
window.engine.display.drawText(x, y, topRow);
for (let i = 1; i <= innerHeight; i++) {
  window.engine.display.drawText(x, y + i, middleRow);
}
window.engine.display.drawText(x, y + height - 1, bottomRow);
```

We draw the top border, then loop over the inner height of the window and draw each row with the middle row we built.
Finally, we draw the bottom row. To test this out, let's open up `engine.ts` and add it to the imports:

```typescript
import {
  renderFrameWithTitle,
  renderHealthBar,
  renderNamesAtLocation,
} from './render-functions';
```

Then just add in our `render` method a call to this new function:

```typescript
renderFrameWithTitle(3, 3, 74, 38, 'Message History');
```

If you run the application a big blank log window should cover most of the screen. Go ahead and remove the call in the 
`render` method now that we can see it works. 

We need to add some way to track what state we are in, so we know whether to render the history view or the game view. At
the bottom of `engine.ts` let's add a new enum to help with this:

```typescript
export enum EngineState {
  Game,
  Dead,
  Log,
}
```

Then add a new instance variable for this and we'll initialize it to start in the `Game` state:

```typescript
_state: EngineState;

constructor(public player: Actor) {
  this._state = EngineState.Game;
```

Now let's jump over to `input-handler.ts` and make some updates to cause the state to change. First we need to import
our new enum:

```typescript
import { EngineState } from './engine';
```

Then we'll create a new action class that will handle switching to our log view state:

```typescript
export class LogAction implements Action {
  perform(_entity: Entity) {
    window.engine.state = EngineState.Log;
  }
}
```

We'll make use of this new action in our `MOVE_KEYS` map:

```typescript
const MOVE_KEYS: MovementMap = {
  // Other keys omitted for brevity
  // Wait keys
  5: new WaitAction(),
  '.': new WaitAction(),
  // UI keys
  v: new LogAction(),
};
```

We're going to have a couple different input handler functions, so let's rename our existing `handleInput` function:

```typescript
export function handleGameInput(event: KeyboardEvent): Action {
  return MOVE_KEYS[event.key];
}
```

We'll be adding a new input handler function, but first we need to create the key mapping for that function to use:

```typescript
interface LogMap {
  [key: string]: number;
}
const LOG_KEYS: LogMap = {
  ArrowUp: -1,
  ArrowDown: 1,
  PageDown: 10,
  PageUp: -1,
};
```

This maps keys to how many lines should scroll in our log. This way we can use arrow keys to scroll slowly, or the page
up/down keys to scroll faster. Now we can add our new handler function:

```typescript
export function handleLogInput(event: KeyboardEvent): number {
  if (event.key === 'Home') {
    window.engine.logCursorPosition = 0;
    return 0;
  }
  if (event.key === 'End') {
    window.engine.logCursorPosition =
      window.engine.messageLog.messages.length - 1;
    return 0;
  }

  const scrollAmount = LOG_KEYS[event.key];

  if (!scrollAmount) {
    window.engine.state = EngineState.Game;
    return 0;
  }
  return scrollAmount;
}
```

If we hit `Home` we set our log to the beginning. If we hit `End` we set it to the end of the log. If we hit a key in 
our mapping we scroll by that amount. Finally, if we hit any key **not** in our mapping, we switch back to the game
state. Here we're updating a `logCursorPosition` variable in our engine that we haven't created yet, so let's go take
care of that. First we'll update our imports for the input handlers:

```typescript
import { handleGameInput, handleLogInput } from './input-handler';
```

Now let's add our cursor instance variable:

```typescript
_state: EngineState;
logCursorPosition: number;

constructor(public player: Actor) {
  this._state = EngineState.Game;
  this.logCursorPosition = 0;
```

Now we can add a getter and setter for the state so we can reset the cursor position when the state changes:

```typescript
public get state() {
  return this._state;
}

public set state(value) {
  this._state = value;
  this.logCursorPosition = this.messageLog.messages.length - 1;
}
```

Next we'll change our `update` method to make use of the different states and input handlers:

```typescript
update(event: KeyboardEvent) {
  if (this.state === EngineState.Game) {
    this.processGameLoop(event);
  } else if (this.state === EngineState.Log) {
    this.processLogLoop(event);
  }

  this.render();
}
```

We check what state the engine is in and then call a method based on that. Let's start by creating the `processGameLoop`
method:

```typescript
processGameLoop(event: KeyboardEvent) {
  if (this.player.fighter.hp > 0) {
    const action = handleGameInput(event);

    if (action) {
      action.perform(this.player);

      if (this.state === EngineState.Game) {
        this.handleEnemyTurns();
      }
    }
  }

  this.gameMap.updateFov(this.player);
}
```

This is mostly just all the logic we already had in our `update` method before. The one change we do have is the check
if we're still in the `Game` state before we handle enemy turns. This is because if the player brings up the 
message log, we don't want to count that as a game action that would cause the enemies to take action and hit them.

Next we can add the `processLogLoop` method:

```typescript
processLogLoop(event: KeyboardEvent) {
  const scrollAmount = handleLogInput(event);
  if (scrollAmount < 0 && this.logCursorPosition === 0) {
    this.logCursorPosition = this.messageLog.messages.length - 1;
  } else if (
    scrollAmount > 0 &&
    this.logCursorPosition === this.messageLog.messages.length - 1
  ) {
    this.logCursorPosition = 0;
  } else {
    this.logCursorPosition = Math.max(
      0,
      Math.min(
        this.logCursorPosition + scrollAmount,
        this.messageLog.messages.length - 1,
      ),
    );
  }
}
```

This function first uses the new input handler to find out how much to scroll the history window by. If the scroll amount
is in the negative direction, and we are already at the beginning, we loop back around to the end of the log. Same for if 
the direction is positive, and we are at the end. Otherwise, we scroll by the amount given.

Now we just need to render the history view when applicable:

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
    renderFrameWithTitle(3, 3, 74, 38, 'Test Frame');
    this.messageLog.renderMessages(
      this.display,
      4,
      4,
      72,
      36,
      this.messageLog.messages.slice(0, this.logCursorPosition + 1),
    );
  }
}
```

We only render the history view if we are in the `Log` state. We still render all the game information underneath it first.
This gives a more interesting look where the log overlays the map. Run the application, build up the log, and hit `v` to
bring up the history and scroll through it.

You can find the complete code for this chapter [here](https://github.com/bodiddlie/js-rogue-tutorial/tree/part7).