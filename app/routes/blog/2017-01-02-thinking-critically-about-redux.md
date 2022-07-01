---
layout: post
title: "Thinking Critically About Redux In Your Application"
categories: [javascript, react, redux, web, programming]
date: 2017-01-02
comments: true
meta:
  title: Thinking Critically About Redux In Your Application
  date: "January 2, 2017"
  description: When someone new to React asks online how to handle state or passing of props in their application, the answer often includes using Redux. While I think that Redux is a fantastic library and love using it, this post will hopefully illustrate why it isn't always necessary or even a good idea.
---

# {attributes.title}
{attributes.date.toDateString()}

When someone new to React asks online how to handle state or passing of props in
their application, the answer often includes using Redux. While I
think that Redux is a fantastic library and love using it, this post will hopefully illustrate
why it isn't always necessary or even a good idea.

### Hammer Time.....Stop

---

When I first started learning React, nearly every blog post, article, or tutorial I read
also included Redux. Many places refer to the two as React/Redux, as if they are somehow
inseparable or part of one larger framework. This is unfortunate, as React itself presents
beginners with enough challenges to learning without the complexities of Redux thrown in.
It also turns into the old problem of if the only tool you have is a hammer, everything
begins to look like a nail.

Redux is a tool that you can add to an application, and is not a necessary part of React. React
isn't even necessary to use Redux, that's just where it is used the most. Fully
grokking the concept of state, and how it differs from props takes a little time when first
being introduced to React. Adding Redux to the mix doesn't alleviate the need to understand
these concepts, and just ends up adding more complexity to wrap your head around. Dan Abramov, the
creator of Redux, wrote a [great post](https://medium.com/@dan_abramov/you-might-not-need-redux-be46360cf367#.u4inwzlbh)
about Redux being completely unnecessary for most applications. In it, he describes how
the simple concept of state in components is _perfectly fine_ for most applications.

### Do you even lift?

---

The most common use case for Redux that I encounter is for managing shared state. There are two
separate components that need to somehow reflect the same data. Loading that data in each
component's `componentDidMount` is a bad idea, so you need some other way to load it in one place and
then share out to each component. Using Redux may seem like a perfect fit, but local state
might be a simpler and more proper solution.

The main concept to understand in using local state is to _lift_ that state to a common
ancestor. So if you have a `<Widget/>` and a `<Doodad/>` that need to share a list of
**Whatchamacallits**, you would need to look up the component hierarchy for a common
ancestor. For example, if these two components are contained in a `<Panel/>`,
it might make sense to have the **Panel** be responsible for loading the data and then
passing it down via props. The React docs even have
[a page specifically about this concept](https://facebook.github.io/react/docs/lifting-state-up.html).

This can easily become tedious if there are multiple levels of components to pass props. In that situation, my first suggestion would be to
examine carefully how the component hierarchy is structured. Are the levels
of components really providing a value? If not, it's time for a refactor. Also, all those levels
might not be necessary and you could flatten the hierarchy. Dan Abramov once again has some great [insight into this](https://www.reddit.com/r/reactjs/comments/5lbp9a/how_to_update_state_in_parents_parent/dbur5os/).
If they are necessary you may be already typing `yarn add redux` (because [yarn is awesome](https://yarnpkg.com)),
but wait....

### Providing a little context

---

If the shared state you're working with is small and isn't going to change a lot, there
is a mechanism built in to React that might be a good fit: context. The React docs
have a lot of [scary things to say](https://facebook.github.io/react/docs/context.html)
about using context, but it is a perfectly viable solution if you pay attention and use
it correctly and carefully. In fact, context is how [React-Redux](https://github.com/reactjs/react-redux)
is able to connect the store to your components. It's just all abstracted away inside of
a Higher Order Component.

In an app I've been working on, the only real piece of shared state is the current user.
Several components need the ID of the current user in order to load data from the server.
Passing it down via props is possible, but tedious. I find it is simpler to actually provide the ID in context
from the `<App />` component. Now any component under `<App />` can get that ID from context
should it be needed.

The key here is that what you pass around via context should be minimized. The official docs
warn that this is an experimental API and could undergo breaking changes at any time. Many
critical libraries are currently using context. I don't think the React team is likely to
actually make such changes, but the warning is there for a reason. As long as you keep the use
to a minimum, you minimize the risks that your app might break in the future.

### We're gonna need a bigger boat

---

If you're sharing a lot of data, have data that changes frequently and your component
hierarchy requires multiple levels such that passing via props doesn't work, then it
probably is time to consider something like Redux or Mobx. At this point your application
is sufficiently complex that the addition of these libraries would likely be a major
benefit.

Many apps don't need the added complexity of working
with Redux. Applying some careful analysis to how your app is structured and what it is
supposed to do will probably reveal whether or not you need to add Redux at all. One of
React's greatest selling points in my opinion, is that you only have to bring in what you
need. See if you can build something with just React, and if you can't, then reach for
Redux.
