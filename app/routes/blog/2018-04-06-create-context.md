---
layout: post
title: "Taking React in Context"
date: 2018-04-06
categories: [javascript, react, context, web, programming]
comments: true
meta:
  title: Taking React in Context
  date: "April 6, 2018"
  description: Last month saw the release of React v16.3, and with it the much talked about new context API. The official docs have some great examples of how the new API works and even has a brief description of why you might use it. I'd like to take a moment to clearly lay out exactly how and why I've been using context in my applications, and why I'm so excited for this new API.
---

# {attributes.title}
{attributes.date.toDateString()}

Last month saw the release of React v16.3, and with it the much talked about new context API. The [official docs](https://reactjs.org/docs/context.html) have some great examples of how the new API works and even has a brief description of why you might use it. I'd like to take a moment to clearly lay out exactly how and why I've been using context in my applications, and why I'm so excited for this new API.

### New App, Who This?

---

Most applications have some concept of a currently logged in user. Apps can then use that user info for any number of purposes. Whether it's to display a profile page, render a list of photos, or just for simple authentication the app will need that user info. That means that potentially many parts of the app need to be aware of the current user.

In the React apps that I've worked on, I've been using the context API for a couple years now to pass that user info around. Most of the apps I build for work are simple line-of-business applications that don't have a lot of global state to manage, so introducing something like redux would be overkill. Context allows me to share a small amount of state around the app very easily.

However, prior to v16.3, the context API was labeled as unstable and the official docs discouraged its use. To illustrate why, here's an example of directly embedding the context API in a component:

```jsx
// this was the wrong way
class ComponentThatNeedsUserInfo extends React.Component {
  static contextTypes = {
    user: PropTypes.shape({}),
  };

  componentDidMount() {
    // call some api using info from this.context.user
  }
}
```

This works, but is incredibly fragile. If the context API were to change as the docs suggested it might, I would have to change every place in my code that touches the context API. To minimize the impact of those changes, I always wrap my context use in utility components:

```jsx
// root provider of context
class App extends React.Component {
  static childContextTypes = {
    user: PropTypes.shape({}),
  };

  getChildContext() {
    return this.state.user;
  }

  // user loading and setting of state in other lifecycle methods
}

// render prop component to get user
class User extends React.Component {
  static contextTypes = {
    user: PropTypes.shape({}),
  };

  render() {
    return this.props.children(this.context.user);
  }
}

// now use the render prop to get the user info
const NeedsUser = () => <User>{user => <div>{user.name}</div>}</User>;
```

And because [render-props are awesome](https://www.youtube.com/watch?v=BcVAq3YFiuc), I can use that component to build a higher-order component, just in case I or another developer would rather use that.

```jsx
function withUser(Component) {
  return class extends React.Component {
    render() {
      return <User>{user => <Component user={user} {...this.props} />}</User>;
    }
  };
}
```

### Consuming What is Provided

---

So what's changed now that v16.3 has dropped? First, no more static properties for `contextTypes` and `childContextTypes`. Instead we have a simple provider component that we feed the value we want to pass around via context.

```jsx
const UserContext = React.createContext(someDefaultUserValue);

class App extends React.Component {
  render() {
    //we've loaded the user somewhere else in this component
    const { user } = this.state;

    return (
      <UserContext.Provider value={user}>
        <RestOfApp />
      </UserContext.Provider>
    );
  }
}
```

There are two important bits here at lines 1 and 9. Line 1 shows the creation of our new context components (I'll get to why that is pluralized in a moment). The important thing to note here is the default value that we pass in to React.createContext. This will allow you to specify some sort of default that will be provided if the value is requested somehow before it has been set, e.g. loading user info asynchronously.

Line 9 is where we use the first of the context components. The `Provider` component takes one prop: `value`. This is the value that you want to pass around via context. The `Provider` component will then simply render its children.

The second component that `createContext` gives us is the `Consumer`. We use this component anywhere we want to "consume" the value that context is providing us.

```jsx
const NeedsUser = () => (
  <UserContext.Consumer>{user => <div>{user.name}</div>}</UserContext.Consumer>
);
```

Notice anything interesting? The way we use the consumer component is _exactly_ the same as the render-prop component from the earlier example! Even more lines of code eliminated, since we don't have to create a render-prop component. `createContext` takes care of all of that for us.

Another nice thing is that with the help of ES6 destructuring we can avoid typing out `UserContext.Provider` or `UserContext.Consumer`:

```jsx
const {Provider, Consumer} = React.createContext(...)

// you can rename if you're creating multiple contexts
const {Provider: UserProvider, Consumer: User} = React.createContext(...)
const {Provider: ThemeProvider, Consumer: Theme} = React.createContext(...)
```

### Conclusion

---

This new API provides a simple and concise way to share state throughout your component tree. If you just need to share a small amount of state, this is the perfect mechanism to do so. Once you have a more significant amount of global state to manage, it would then make sense to look at tools like redux or MobX.
