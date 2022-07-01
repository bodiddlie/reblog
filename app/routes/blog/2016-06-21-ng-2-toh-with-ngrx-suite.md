---
layout: post
title: "Angular 2 Tour of Heroes Tutorial With the NGRX Suite"
categories: [javascript, typescript, web, programming, angular2, redux, ngrx]
date: 2016-06-21
comments: true
meta:
  title: Angular 2 Tour of Heroes Tutorial With the NGRX Suite
  date: "June 21, 2016"
  description: I recently was tasked with starting a brand new project at work that would be used for taking  some simple internal surveys. Something like SurveyMonkey was overkill for what we're looking for, but using the built-in survey features in SharePoint (I know, I know, ugh) weren't going to be powerful enough. I originally planned on writing the application in Angular 1, but after going to a local Angular user group meeting, I decided to try writing it with Angular 2.
---

# {attributes.title}
{attributes.date.toDateString()}

**Update: 09/26/2016** Updated repo to Angular 2 final. See [the repo](https://github.com/bodiddlie/rxheroes) for more info.

I recently was tasked with starting a brand new project at work that would be used for taking
some simple internal surveys. Something like SurveyMonkey was overkill for what we're looking for,
but using the built-in survey features in SharePoint (I know, I know, ugh) weren't going to be
powerful enough. I originally planned on writing the application in Angular 1, but after going
to a local Angular user group meeting, I decided to try writing it with Angular 2.

### Redux-like Concepts

---

I've been playing around a bit with React/Redux on the side, and the patterns that emerge from
that combination appeal to me. Using pure functions as reducers make testing so simple. Not mutating
state makes debugging much easier to reason about, not to mention the possibility of time-travel/undo
that it affords.

[Ngrx/store](https://github.com/ngrx/store) is a Redux inspired library for Angular 2. It operates on many
of the same concepts: actions, reducers, and a single store. The unique part here is that the DNA of
ngrx/store is all about [RXJS](https://github.com/Reactive-Extensions/RxJS). Observables are at the heart of
what makes ngrx/store tick. Check out the [Comprehensive Introduction to @ngrx/store](https://gist.github.com/btroncone/a6e4347326749f938510)
and [Lukas Ruebbelke's great post on ngrx](http://onehungrymind.com/build-better-angular-2-application-redux-ngrx/)
for an overview.

The one problem I've always had with the Redux pattern is that it seems like a lot of
boilerplate and abstractions to jump through to get to a functional state. You've got actions,
reducers, the store, and then somewhere in there async data from a server needs to fit in
somehow. There are tons of tutorials out there that go over the basics of using Redux, but
it's hard to find a lot of info on fitting it all together. Even once your figure out how they all fit
together, it can seem like a lot of extra work with little benefit.

My hope with this post is to convey that "Aha!" moment I had where the benefit became clear to me, and I made up
my mind that this was a really great way to architect an application. I thought that rewriting the
[Angular 2 Tour of Heroes example application](https://angular.io/docs/ts/latest/tutorial/)
with the ngrx suite, would be a great way to show these concepts.

### A brief word on setup

---

Before we get started, I wanted to go over some of the infrastructure details of the example. You can see the
complete example app at [my github](https://github.com/bodiddlie/rxheroes).

I'm using [webpack](https://webpack.github.io/) as my module loader/build tool. While webpack is not required
for using any of the libraries discussed, my use of it makes a couple minor differences in code. Any
component templates and styles are `required` and placed into the `template` and `styles` properties in the
`@Component` decorator as opposed to using their related URL siblings. Everything else should be
interchangeable with SystemJS (don't quote me on that, though). For a great intro to using webpack with
Angular 2, check out the [docs](https://angular.io/docs/ts/latest/guide/webpack.html).

One other quick difference from the Tour of Heroes tutorial is that for my backend http calls, I'm using
the node package [json-server](https://github.com/typicode/json-server). Using this in conjunction with a
webpack-dev-server configuration allows me to proxy all calls to `/api/*` to the `json-server` instance. This
serves up data from a simple JSON file. I found this method to be useful in the project I'm working
on as I can mock out my backend API without having to spin up IIS express (the backend for that is a ASP.NET
Web API project).

### Taking Action

---

At the heart of ngrx/store is the Action. By dispatching actions to the store, the state of our application is
updated. There are many ways to construct actions and dispatch them. They are, after all just simple
objects with a `type` and a `payload` property. The [ngrx example app](https://github.com/ngrx/example-app)
uses a structure that may seem verbose, but I feel is very extensible and easy to maintain. Here's the
contents of our Tour of Heroes actions:

```typescript
import { Injectable } from '@angular/core';
import { Action } from '@ngrx/store';

import { Hero } from '../models';

@Injectable()
export class HeroActions {
  static LOAD_HEROES = '[Hero] Load Heroes';
  loadHeroes(): Action {
    return {
      type: HeroActions.LOAD_HEROES,
    };
  }

  static LOAD_HEROES_SUCCESS = '[Hero] Load Heroes Success';
  loadHeroesSuccess(heroes): Action {
    return {
      type: HeroActions.LOAD_HEROES_SUCCESS,
      payload: heroes,
    };
  }

  static GET_HERO = '[Hero] Get Hero';
  getHero(id): Action {
    return {
      type: HeroActions.GET_HERO,
      payload: id,
    };
  }

  static GET_HERO_SUCCESS = '[Hero] Get Hero Success';
  getHeroSuccess(hero): Action {
    return {
      type: HeroActions.GET_HERO_SUCCESS,
      payload: hero,
    };
  }

  static RESET_BLANK_HERO = '[Hero] Reset Blank Hero';
  resetBlankHero(): Action {
    return {
      type: HeroActions.RESET_BLANK_HERO,
    };
  }

  static SAVE_HERO = '[Hero] Save Hero';
  saveHero(hero): Action {
    return {
      type: HeroActions.SAVE_HERO,
      payload: hero,
    };
  }

  static SAVE_HERO_SUCCESS = '[Hero] Save Hero Success';
  saveHeroSuccess(hero): Action {
    return {
      type: HeroActions.SAVE_HERO_SUCCESS,
      payload: hero,
    };
  }

  static ADD_HERO = '[Hero] Add Hero';
  addHero(hero): Action {
    return {
      type: HeroActions.ADD_HERO,
      payload: hero,
    };
  }

  static ADD_HERO_SUCCESS = '[Hero] Add Hero Success';
  addHeroSuccess(hero): Action {
    return {
      type: HeroActions.ADD_HERO_SUCCESS,
      payload: hero,
    };
  }

  static DELETE_HERO = '[Hero] Delete Hero';
  deleteHero(hero): Action {
    return {
      type: HeroActions.DELETE_HERO,
      payload: hero,
    };
  }

  static DELETE_HERO_SUCCESS = '[Hero] Delete Hero Success';
  deleteHeroSuccess(hero): Action {
    return {
      type: HeroActions.DELETE_HERO_SUCCESS,
      payload: hero,
    };
  }
}
```

I won't spend a lot of time on this file as it is fairly simple and can seem almost repetitive. I'll just
highlight a few key points. I start with the imports. Using `@Injectable` allows this to be injected by
the Angular 2 dependency injector. `Action` is a simple interface that ngrx/store provides and since we're
using Typescript we might as well have all the type checking we can get. The `Hero` model is no different
from what is used in the official tutorial.

```typescript
import { Injectable } from '@angular/core';
import { Action } from '@ngrx/store';

import { Hero } from '../models';
```

Next we have our class that defines our actions. Since an action type is just a unique string, I include all
the action types as static properties on the class. This makes them easy to use and alleviates the problem
of having a typo in a magic string somewhere in the app. You'll see a pattern here for most of the actions
where I have an initial action and a success action. This maps out to any asynchronous actions we might take.
The initial action kicks off a chain of events, and the success action notifies the application
that the state has been successfully updated. In a real world application, you would also want to have
separate error actions for handling unsuccessful calls.

Sometimes an action does not include a payload, like in the `LOAD_HEROES` action. This action doesn't need
to convey any information other than notifying that it is being dispatched. Its subsequent success action
has a payload that contains all the loaded heroes. The `SAVE_HERO` action includes a payload, which is the
hero we wish to save. Its success action also includes the saved hero as a payload. You'll see why all of
this is important in the next section on reducers.

```typescript
export class HeroActions {
  static LOAD_HEROES = '[Hero] Load Heroes';
  loadHeroes(): Action {
    return {
      type: HeroActions.LOAD_HEROES,
    };
  }

  static LOAD_HEROES_SUCCESS = '[Hero] Load Heroes Success';
  loadHeroesSuccess(heroes): Action {
    return {
      type: HeroActions.LOAD_HEROES_SUCCESS,
      payload: heroes,
    };
  }

  static SAVE_HERO = '[Hero] Save Hero';
  saveHero(hero): Action {
    return {
      type: HeroActions.SAVE_HERO,
      payload: hero,
    };
  }

  static SAVE_HERO_SUCCESS = '[Hero] Save Hero Success';
  saveHeroSuccess(hero): Action {
    return {
      type: HeroActions.SAVE_HERO_SUCCESS,
      payload: hero,
    };
  }
}
```

Having the actions setup in this way makes it very convenient when we are later building our components. By
being able to inject them, we can have access to those actions wherever we need them, and can quickly
and easily dispatch them to the store.

```typescript
@Component({
})
export class SomeComponent implments OnInit {
constructor(
private heroActions: HeroActions,
private store: Store<AppState>
) {}

    ngOnInit() {
        this.store.dispatch(this.heroActions.loadHeroes());
    }

}
```

You'll see how this all ties together later.

### A Fine Wine Reduction

---

Ah reducers. The deceptively simple functions that end up being the representation of your application's state.
For me, this was one of the concepts that I had a hard time wrapping my head around. Not how the functions work,
but in how they are actually consumed and mapped out to the rest of the application.

The concept of a reducer is very simple. It's a pure function, meaning that it produces no side effects, that
given a state, and an action, will return a new state. That textbook definition is all
well and good, but what does it mean to us in practice?

In ngrx/store, each reducer function is used to represent some branch of our application state. Let's look
at the Tour of Heroes reducers as an example. We'll start with the index file that builds out the final
state represenation, and then show each individual reducer.

```typescript
//app/reducers/index.ts
//imports snipped for brevity

import heroListReducer, _ as fromHeroList from './hero-list';
import heroReducer, _ as fromHero from './hero';

export interface AppState {
  heroes: fromHeroList.HeroListState;
  hero: fromHero.HeroState;
};

export default compose(combineReducers)({
  heroes: heroListReducer,
  hero: heroReducer
});
```

After importing all our library stuff, we bring in the reducer functions themselves, as well as any other
exports from those files. The other exports in this case are simple interfaces representing the state of
that reducer. The nice thing about this, is that each reducer is only given the state that is relevant to it.
In our application, the `heroListReducer` only cares about the list of heroes and not a single selected hero.
This separation makes the logic much easier to reason about, although it took me some time to figure out exactly
how the state moved around the application.

The `AppState` interface is just a simple final representation of the state for the entire app. We'll use this
later when we are grabbing a reference to the store and selecting data from it.

The default export for this module is the combination of all the reducers into one final state. `compose` and
`combineReducers` come from the ngrx suite. You don't have to do it this way, but it seems to be the most
convenient to me.

Now let's take a look at the hero-list reducer:

```typescript
//app/reducers/hero-list.ts
//imports snipped for brevity

export type HeroListState = Hero[];

const initialState: HeroListState = [];
```

`HeroListState` is the representation of the shape of the state that this reducer will produce. In this instance
it's just an array of `Hero` objects. In the real world, you would probably include some other info, such
as if the list is currently loading or not, so you can display something like a spinner. We then set up an initial
state of an empty array. We use this below as a default parameter to the function, so that we always have a
valid state coming in to the function.

```typescript
export default function(state = initialState, action: Action): HeroListState {
  switch (action.type) {
  //...
  }
}
```

The basic reducer signature is a function that takes in a state and an action, and returns a new state. Here
we are giving a default value of the `initialState` so we at least always have a valid empty array. We are
returning a `HeroListState` which again is just an array of `Hero` objects. We do a `switch` on the type of
action, and then do whatever we need to generate a new state.

```typescript
case HeroActions.LOAD_HEROES_SUCCESS: {
  return action.payload;
}
```

When we have successfully retrieved the heroes from the server, we just want to return the payload, which
will be an array of `Hero` objects. Simple.

```typescript
case HeroActions.ADD_HERO_SUCCESS: {
  return [...state, action.payload];
}
```

After successfully adding a brand new hero, we just need to add it to the array. However, since reducers
should not modify existing state, but rather return a new state, we compose a new array using the spread
operator from ES6.

```typescript
case HeroActions.SAVE*HERO_SUCCESS: {
  let index = *.findIndex(state, {id: action.payload.id});
  if (index >= 0) {
    return [
      ...state.slice(0, index),
      action.payload,
      ...state.slice(index + 1)
    ];
  }
  return state;
}
```

Saving an existing hero requires building out a new array with the old hero replaced by the new one. I'm using
[lodash](https://lodash.com/) here to quickly find the index of the old hero and using the array `slice` method
along with the ES7 spread operator to build out a new array.

```typescript
case HeroActions.DELETE_HERO_SUCCESS: {
  return state.filter(hero => {
    return hero.id !== action.payload.id;
  });
}
```

Deleting a hero is as simple as returning a new array that no longer contains the old hero. `filter` is perfect
for that.

```typescript
default: {
  return state;
}
```

Earlier I said that only the relevant state is passed to a reducer. It also is sent every single
action that is dispatched to the store. This makes sense, but could easily be forgotten as often the actions
and state map neatly together (although not always). Since a reducer needs to always return a valid state,
if we get an action we don't care about (or is invalid), we just return the state we were given.

Now let's look at the other reducer for handling a single hero.

```typescript
// /app/reducers/hero.ts
...
export type HeroState = Hero;

const initialState: HeroState = {
  id: 0,
  name: ''
};
```

Another simple representation of state here as it is just a `Hero` model. Creating a new type here is just
to simplify imports where the full AppState is concerned. We then setup `initialState` as a blank hero.

```typescript
export default function(state = initialState, action: Action): HeroState {
  switch (action.type) {
    case HeroActions.RESET_BLANK_HERO: {
      return initialState;
    }
    case HeroActions.GET_HERO_SUCCESS: {
      return action.payload;
    }
    default: {
      return state;
    }
  }
}
```

We're really only dealing with two actions here. The first is when we want to deal with a new, blank hero. In
that case we just return the `initialState` as an empty hero object. The other is when we have successfully
retrieved a single hero from the server. There we just return the given payload.

The really nice thing about reducers is that they are easily testable without having to jump through a bunch
of Angular 2 test setup hoops. No dependency injection to muss with, no http backend to mock. It's just a
function that doesn't care about anything else and produces no side effects. The definition of highly testable code.

```typescript
describe('HeroList', () => {
  it('should return an array with the new hero added to it', () => {
    const oldState = [{ id: 1, name: 'First' }, { id: 2, name: 'Second' }];
    const newHero = { id: 3, name: 'New Guy' };
    const newState = heroReducer(oldState, {
      type: HeroActions.ADD_HERO_SUCCESS,
      payload: newHero,
    });
    expect(newState.length).toBe(3);
  });
});
```

By carefully thinking about the shape and structure of the state of your application, and building your reducers
properly, you can remove a lot of logic from your components into these little bits that much more easily tested.
That's probably one of the biggest benefits in my mind!

### Service With a Smile

---

Okay, simple pure functions, neat self-describable action classes. That's great Nick. Fantastic. Now where the
hell is all the data coming from? You haven't used `http` at all anywhere yet. What good is an application
that doesn't communicate to a server in someway?

This was something that I struggled with when playing around with React/Redux and in initially looking at
ngrx/store. Most of the examples out there are trivial and work with state that exists only within the
client side code. It wasn't until I found the ngrx example app and spent a few days really understanding it
that I was able to wrap my head around this.

But first to get data we need to call out to the server, and what better place to do that than in a service?

```typescript
// /app/services/hero.ts
...
@Injectable()
export class HeroService {
constructor(private http: Http) {}

    getHeroes(): Observable<Hero[]> {
        return this.http.get('/api/heroes')
        .map(res => res.json());
    }

    getHero(id): Observable<Hero> {
        return this.http.get('/api/heroes/' + id)
        .map(res => res.json());
    }

    saveHero(hero) {
        if (hero.id === 0) {
            return this.http.post('/api/heroes', hero)
            .map(res => res.json());
        } else {
            return this.http.put('/api/heroes/' + hero.id, hero)
            .map(res => res.json());
        }
    }

    deleteHero(hero) {
        return this.http.delete('/api/heroes/' + hero.id)
        map(res => hero);
    }

}
```

This is all pretty standard Angular 2 stuff. Notice that we're returning Observables. The only other thing
to point out here is that in the `deleteHero` method, in the `map`, we're returning the passed in hero. The
`DELETE` call doesn't return any response body, but our effect and subsequent action will need to know
what hero to act on. We'll see that later.

### Cause and ngrx/effects

---

So we've got our service that can retrieve data from the backend, but where should we use it? Let's think
about the case where the application first loads up and we want to load the list of heroes. We have an action
for starting this with `LOAD_HEROES`. So we should just use that action, right? Well, yes that's what we'll
end up doing, but as it stands currently, that won't do anything.

If you look back at our reducer, it only cares about the `LOAD_HEROES_SUCCESS` action. So how do we get from
the initial action to the success one? We could just call the service in our components and pass the data
from there to our actions and through the store. That works, but that ends up putting more logic into our
components, which we're trying to avoid. Also, moving all of this out to the ngrx chain enables some
interesting behavior. For instance, if we had multiple components across the application that are loading
the list of heroes, we could do things like debounce the call, to avoid calling the server too frequently.
Something like that becomes really easy to do when we separate it out in this way.

So, where do we make the call then? This is where [ngrx/effects](https://github.com/ngrx/effects) comes in.
Ngrx/effects is a library that enables you to generate side effects when actions are dispatched to the
store. I know I said earlier that side effects are unwanted, but in this case we are taking action based off
of previous actions and not mutating state.

A simple way to think of it is that ngrx/effects is an event listener of sorts. It listens for actions
being dispatched to the store. You can then tell ngrx/effects that when a particular action is dispatched,
to take another, new action as a result. At the end, what's really happening is ngrx/effects is an action
generator that dispatches a new action as a result of a different action.

Let's take a look at the Tour of Heroes effects.

```typescript
// /app/effects/hero.ts
...

@Injectable()
export class HeroEffects {
  constructor (
    private update$: StateUpdates<AppState>,
    private heroActions: HeroActions,
    private svc: HeroService
  ) {}
...
}
```

In our constructor we're asking for a few things to be injected. The `update$` variable is a `StateUpdate` from
ngrx/effects. This is an observable that emits everytime an action flows through the store. We then have our
action class and service.

```typescript
...
@Effect() loadHeroes$ = this.update$
  .whenAction(HeroActions.LOAD_HEROES)
  .switchMap(() => this.svc.getHeroes())
  .map(heroes => this.heroActions.loadHeroesSuccess(heroes));
```

Here's our first effect. We first subscribe to the `update$` observable by asking for anytime the `LOAD_HEROES`
action is dispatched. Then we call `switchMap` on that as we're going to get a whole new observable from the
service that we want to emit from (if this Observable stuff is confusing, you're not alone. Check out this
[awesome manual on rxjs](http://reactivex.io/rxjs/manual/overview.html) to get a better grasp). The
subsequent `map` call then operates on a list of heroes from the service. We pass that list to our action
creator `loadHeroesSuccess`. Ngrx/effects then will take care of dispatching this new action to the store for us.

The other effects take a similar approach.

```typescript
...
@Effect() getHero$ = this.update$
  .whenAction(HeroActions.GET_HERO)
  .map<string>(toPayload)
  .switchMap(id => this.svc.getHero(id))
  .map(hero => this.heroActions.getHeroSuccess(hero));

@Effect() saveHero$ = this.update$
  .whenAction(HeroActions.SAVE_HERO)
  .map(update => update.action.payload)
  .switchMap(hero => this.svc.saveHero(hero))
  .map(hero => this.heroActions.saveHeroSuccess(hero));

@Effect() addHero$ = this.update$
  .whenAction(HeroActions.ADD_HERO)
  .map(update => update.action.payload)
  .switchMap(hero => this.svc.saveHero(hero))
  .map(hero => this.heroActions.addHeroSuccess(hero));

@Effect() deleteHero$ = this.update$
  .whenAction(HeroActions.DELETE_HERO)
  .map(update => update.action.payload)
  .switchMap(hero => this.svc.deleteHero(hero))
  .map(hero => this.heroActions.deleteHeroSuccess(hero));
```

Note the delete effect. Earlier in the service section I said that we were returning the hero that got passed to
the service. This is so that this effect can take that hero and send it on in the `DELETE_HERO_SUCESS` action.

So now the data is able to move around and be acted upon, we just need to create some components to display it.

### Children Should be Contained and Displayed

---

A pattern that has emerged from the React community and is starting to take hold in Angular 2 as well is the
idea of Smart vs Dumb components. Labeling them as smart vs dumb components can be misleading as the "dumb" components
aren't dumb, just light on logic. I like thinking of them as Container components and Display
components. This also can be misleading as containers often have some display pieces as well.

The basic idea is there is a container component that is responsible for gathering all the data to display
and handling all the UI logic. It then delegates the actual rendering and UI event handling to child display
components. In Angular 2, you use `Input` and `Output` properties on the display components to achieve this.
Let's look at the `Heroes` and `HeroList` components to see what I mean.

```typescript
// /app/components/heroes/heroes.component.ts
...
@Component({
...
})
export class Heroes {
heroes: Observable<any>;
addingHero = false;
selectedHero;

    constructor(
        private store: Store<AppState>,
        private heroActions: HeroActions,
        private router: Router
    ) {
        this.heroes = store.select('heroes');
    }

    addHero() {
        this.addingHero = true;
        this.selectedHero = null;
    }

    close() {
        this.addingHero = false;
    }

    delete(hero) {
        this.store.dispatch(this.heroActions.deleteHero(hero));
    }

    select(hero) {
        this.selectedHero = hero;
        this.addingHero = false;
    }

    gotoDetail() {
        this.router.go('/detail/' + this.selectedHero.id);
    }

}
```

There's not a lot happening here, but it's all the logic we need to display and interact with the list of
heroes. I'll come back to the constructor last as it's the most important regarding all the ngrx concepts.
All the other methods are just simple bits of logic we'll take as a result of things happening in the UI.
You can see in the delete method, we just simply dispatch a `DELETE_HERO` action to the store.

The constructor is where we tap in to the store to get our list of heroes. `store.select()` returns an
Observable based off of what you ask for. Here we're asking for the piece of `AppState` that has the list of
heroes. Once we have this Observable, how do we display it? Well, first let's take a look at the template
for this component.

```html
<h2>My Heroes</h2>
<rx-hero-list
    [heroes]="heroes | async"
    [selectedHero]="selectedHero"
    (onSelect)="select($event)"
    (onDelete)="delete($event)"
></rx-hero-list>

...
```

Here we're passing the info we need for display to our `rx-hero-list` component. We pass the list of heroes and
the selected hero as inputs, and then subscribe to two events as outputs. The important point to notice
is the use of the `async` pipe. This pipe essentially automatically subscribes to the observable for
us, and returns any emitted values. This means that the `rx-hero-list` component only needs to know that
it's getting a list of heroes. It doesn't need to worry itself with any Observable business at all.

Now let's look at that display component.

```typescript
import {Component, Input, Output, EventEmitter} from '@angular/core';

@Component({
...
})
export class HeroList {
@Input() heroes;
@Input() selectedHero;

    @Output() onSelect = new EventEmitter();
    @Output() onDelete = new EventEmitter();

    delete($event, hero) {
        $event.stopPropagation();
        this.onDelete.emit(hero);
    }

}
```

This is a good example of what a display component should be. It focuses on the data it needs
to display and what events it should fire off. The only bit of logic here is to avoid events bubbling up on
button click. The `heroes` input isn't an observable, as the `async` pipe in the container component handles
unwrapping that for us. This makes dealing with the incoming data simple, and makes the template simple for
us as well.

```html
<ul class="heroes">
    <li
        *ngFor="let hero of heroes"
        (click)="onSelect.emit(hero)"
        [class.selected]="hero === selectedHero"
    >
        <span class="hero-element">
            <span class="badge">{{hero.id}}</span> {{hero.name}}
        </span>
        <button class="delete-button" (click)="delete($event, hero)">Delete</button>
    </li>
</ul>
```

Nice and simple. We just loop over the list of heroes and display them, and then emit the events that we need to
when the user interacts with the elements. The container `Heroes` component will pass in the data and subscribe to the output events.
When one of the events emits a new value, the container component will handle that and perform any relevant
logic. The display component doesn't need to know anything about how the logic of the application works,
and is just concerned with displaying its data and sending out its events.

Breaking the `Heroes` component up into separate components like this goes a little further than the official
tutorial does. I think this is a good illustration of how to separate logic from display using containers and
display components. There are other components in the application that I haven't shown here, but they follow
much the same pattern.

I'll quickly go over the `HeroForm` component that is a display component for the `HeroDetail` container. Here's
the relevant code:

```typescript
@Component({
...
})
export class HeroForm {
_hero;
@Input() set hero(value) {
this.\_hero = Object.assign({}, value);
}
get hero() {
return this._hero;
}

    @Output() back = new EventEmitter();
    @Output() save = new EventEmitter();

}
```

The important part here is in the set method for the `hero` input property. The container is passing a hero in
as an input. That could be either a hero from the server or a blank one depending on the route we used (check
the `HeroDetail` component for that).

So let's assume that we've loaded a hero from the server. That hero is now in the store in the `hero` part of
the `AppState`. This `HeroForm` component displays a simple form that has a text input for setting the name
of the hero. If we just passed in the hero straight from the store and then attached the name property to
the input via `ngModel`, we would be modifying the hero in the store. That's mutating state and we don't want
to do that. What if we load _Batman_ and start to change the name to _Batfleck_ but then change our minds?
Oops, we've mutated the state and will need to reload from the server to get back to _Batman_.

To avoid this, the setter sets a backing field as a copy using Object.assign. This way when we set up a two-way
binding with `ngModel` we're mutating our copy and not the state. We can then emit that copy back out to the
container, which can then send it on to the store via a dispatched action. This keeps the data flowing in a
strictly unidirectional manner, and can greatly simplify change detection and improve performance. See
[Pascal Precht's brilliant post](http://blog.thoughtram.io/angular/2016/02/22/angular-2-change-detection-explained.html)
on change detection in Angular 2 for more info on this.

### Wrap Up

---

Hopefully this shows how ngrx/store, ngrx/effects, and Angular 2 all work together, but really, I hope it shows
what the benefit is of following this particular architecture. By enforcing a unidirectional flow of data
through the application, you simplify the reasoning of how changes to that data happen in the application.
Two-way binding is wonderful tool, but when that binding makes changes several layers up through your code,
it can become really difficult to understand what happened when something goes wrong. With ngrx/store, when
your state changes in some way you didn't expect, it's pretty easy to figure out where it happened.

You can grab the full source for this post on [my github](https://github.com/bodiddlie/rxheroes). Again,
don't take anything I've written here as the way things should be done. This is the way I've found
that works for me right now. That might change in the future and I very well could be doing something
egregiously wrong. I'm learning this as I go, and I'm sure I'll look at this in a few months and shudder.
If you see something here that needs fixing or is just a plain bad idea, let me know in the comments or
hit me up on [twitter](https://twitter.com/bodiddlie).
