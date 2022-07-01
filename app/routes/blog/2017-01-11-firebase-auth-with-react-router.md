---
layout: post
title: "Firebase Auth with React Router v4"
date: 2017-01-11
categories: [javascript, react, react-router, firebase, web, programming, auth]
comments: true
meta:
  title: Firebase Auth with React Router v4
  date: "January 11, 2017"
  description: Firebase is a really cool Backend-as-a-Service (BaaS) similar to the now defunct Parse. They have a great free tier that I think is quite generous. Firebase offers a real-time database, storage options, hosting, and many other nice features worth checking out.
---

# {attributes.title}
{attributes.date.toDateString()}

[Firebase](https://firebase.google.com) is a really cool Backend-as-a-Service (BaaS) similar
to the now defunct Parse. They have a great free tier that I think is quite generous.
Firebase offers a real-time database, storage options, hosting, and many other nice
features worth checking out.

One feature that I really like is Authentication. Firebase Auth allows
you to use a bunch of different auth providers (Twitter, Google, Facebook, etc) for
your app. It's quite simple to set up if you follow the
[docs](https://firebase.google.com/docs). Once set up, you'll need to figure out how
it will fit in with your app; meaning protecting routes from being accessed by unauthorized
users, and how you utilize the currently logged in user throughout the app. In this post I'll
show how I've been handling all this in a React app using the alpha of React Router v4.

### Initial Setup

---

Once you've set up a project on the Firebase site, you need to get your app ready to use
it. Here's an example of how I do it in my app:

```jsx
import firebase from 'firebase';

let config = {
  //your settings from Firebase
};

//the root app just in case we need it
export const firebaseApp = firebase.initializeApp(config);

export const db = firebaseApp.database(); //the real-time database
export const auth = firebaseApp.auth(); //the firebase auth namespace

export const storageKey = 'KEY_FOR_LOCAL_STORAGE';

export const isAuthenticated = () => {
  return !!auth.currentUser || !!localStorage.getItem(storageKey);
};
```

Most of the code above is straight out of the set up documentation for a Firebase web
app. I set up the connection to firebase and exported the database and auth namespaces for
use throughout the app. The important part here is starting on line 13. I created and exported
a simple string constant `storageKey`. This is used in the simple function `isAuthenticated`.
I checked if the `auth.currentUser` is currently set. If it isn't, I look in local storage for
that key. I'll show where I set that item in local storage in a later snippet.

You might be wondering why I check `auth.currentUser` and local storage instead of
using `onAuthStateChanged` like the Firebase documentation recommends. I actually do use
`onAuthStateChanged` as you'll see in the next snippet, but the reason for this check
is because when the page loads and the routes are getting parsed and validated, the
`currentUser` variable hasn't been finalized yet. This means that if someone is
trying to access a route that should only be available to authenticated users, they will
always be denied access if the route is the first thing they load on the page or if they
reload.

There are [some examples](http://stackoverflow.com/questions/37370599/firebase-auth-delayed-on-refresh)
out there about how to work around this problem using local storage and searching for an
item that the Firebase SDK sets. However, I ran into an issue with IE11 where that item
did not exist in local storage. I haven't yet been able to find where it is in IE11, but
rather than digging into that nightmare, I went with the simple solution of setting my
own item. I do that in the root `<App />` component:

```jsx
class App extends Component {
  state = {
    uid: null,
  };

  componentDidMount() {
    auth.onAuthStateChanged(user => {
      if (user) {
        window.localStorage.setItem(storageKey, user.uid);
        this.setState({ uid: user.uid });
      } else {
        window.localStorage.removeItem(storageKey);
        this.setState({ uid: null });
      }
    });
  }
}
```

Here I'm just starting the listener for `onAuthStateChanged` when the component mounts.
Inside the listener I set the item in local storage based off of if I have a user or not.
Then I can move on to protecting routes in the app so that only authenticated users can
access them.

### Procting Routes

---

I've been playing with the alpha of v4 of the excellent [React Router](https://react-router.now.sh/).
I really like the new API that they're going with, particularly for route configuration.
`OnEnter` hooks are now no longer necessary for protecting routes and a nice, declarative
approach can be taken instead. Here's an example route setup :

```jsx
class App extends Component {
  //snip our user stuff from earlier

  render() {
    return (
      <BrowserRouter>
        <Match exactly pattern="/" component={HomePage} />
        <Match pattern="/login" component={Login} />
        <MatchWhenAuthorized pattern="/protected" component={ProtectedPage} />
      </BrowserRouter>
    );
  }
}

const MatchWhenAuthorized = ({ component: Component, ...rest }) => (
  <Match
    {...rest}
    render={renderProps =>
      isAuthenticated() ? (
        <Component {...renderProps} />
      ) : (
        <Redirect
          to={{
            pathname: '/login',
            state: { from: renderProps.location },
          }}
        />
      )
    }
  />
);
```

The render method is just setting up a pretty simple route config. The magic really comes
from the new `Match` component in React Router v4. Because of the new API with this
component, I can actually compose a new component to declaratively handle route
protection.

`MatchWhenAuthorized` isn't a part of the React Router API, but this example is pulled
straight from their [docs](https://react-router.now.sh/auth-workflow). Basically, it
piggy-backs on the `Match` component, using ES6 rest/spread to pass the props given to
it. The really interesting part is the `render` prop on `Match`. This prop takes a function
that will be passed all the props that the component would get on a regular match, but
allows you to do some extra manipulation. In this example, I check if the user is authenticated and if so
render the given component. If not, I use the React Router `Redirect` component to send
the user to the login page.

### Logging In

---

So now that the app has a route that only logged in users can see, I need to provide a
way for users to actually log in. Here I'm only dealing with email/password authentication,
so you would need to provide similar workflows for dealing with oAuth providers.

```jsx
class Login extends Component {
state = {
email: '',
password: '',
redirectToReferrer: false
}

handleSubmit = (evt) => {
evt.preventDefault();
auth.signInWithEmailAndPassword(this.state.email, this.state.password).then(() => {
this.setState({redirectToReferrer: true});
});
}

render() {
const {from} = this.props.location.state || '/';
const {redirectToReferrer} = this.state;

    return (
      <section>
        {redirectToReferrer && (
          <Redirect to={from || '/protected'}/>
        )}
        {from && (
          <p>You must log in to view the page at {from.pathname}</p>
        )}
        <form onSubmit={this.handleSubmit}>
          <input type="text" value={this.state.email} onChange={e => this.setState{email: e.target.value}} />
          <input type="password" value={this.state.password} onChange={e => this.setState{password: e.target.value}} />
          <button type="submit">Sign In</button>
        </form>
      </section>
    );

}
}
```

This is just standard form handling. The interesting bit is in `render` where I check for
`redirectToReferrer`. This bool gets set to true once the user has successfully signed
in. If true, I use the React Router `Redirect` component to send them to either the route
they requested or a default route if they just went straight to the login page.
Now the user is logged in and can access the protected route, how do I utilize the currently
logged in user?

### Current User

---

For this simple example, I'm going to use a list of to-do items. A logged in user should only
be able to see the items that they have entered. A simple way to structure this data in
the Firebase real-time database would be like this:

```json
{
  "todos": {
    "userid1": {
      "todo1": { "text": "Do something", "complete": false },
      "todo2": { "text": "Do something", "complete": false },
      "todo3": { "text": "Do something", "complete": false },
      "todo4": { "text": "Do something", "complete": false }
    },
    "userid2": {
      "todo5": { "text": "Do something", "complete": false },
      "todo6": { "text": "Do something", "complete": false },
      "todo7": { "text": "Do something", "complete": false },
      "todo8": { "text": "Do something", "complete": false }
    }
  }
}
```

Under the top to-dos object is a list of user ids. Under each user id is the list of to-do
items for that user. In a more complicated application you would want to denormalize
this data to reduce load size and simplify queries, but that's outside the scope
of this post. See the great [YouTube playlist from Firebase](https://www.youtube.com/playlist?list=PLl-K7zZEsYLlP-k-RKFa7RyNPa9_wCH2s)
for more info.

Retrieving this data means that we need the uid of the current user. We can check
`auth.currentUser` but that won't be guaranteed to be set by the time the component
renders if the user was already logged in (ie first visit or page refresh). Reading
from local storage might work, but I could see arguments for not storing the uid for
security reasons. To provide the uid, we go back to the `<App/>` component and add
the uid to context.

```jsx
class App extends Component {
  static childContextTypes = {
    uid: React.PropTypes.string,
  };

  getChildContext() {
    return { uid: this.state.uid };
  }

  //snip prior stuff
}
```

Now whenever the user auth state changes, the uid will be updated in context. In order
for a component to use the uid, it will need to request it from context. I could just
add a `contextTypes` to all the components that need it, but that isn't the best idea because
the context API is still experimental and could change. This would mean I would need to
update each component that used `contextypes` if something did change. The way around this is to
extract that functionality into something that will provide the uid for me.

I could do this with a HOC (higher order component) like in [this post](https://medium.com/@mweststrate/how-to-safely-use-react-context-b7e343eff076#.xaikh4ldc)
by Michael Westrate and linked in the official React docs. I however have taken a liking
to the function-as-child pattern and used it for this. If you aren't familiar with the
function-as-child pattern, check out [this post](https://medium.com/merrickchristensen/function-as-child-components-5f3920a9ace9#.2e0r9gutx)
by Merrick Christensen.

```jsx
class UidProvider extends Component {
  static contextTypes = {
    uid: React.PropTypes.string,
  };

  render() {
    return this.props.children(this.context.uid);
  }
}
```

Using this simple component, I can declaratively provide the uid to any components that
need it.

```jsx
const ProtectedPage = () => (
  <UidProvider>{uid => <SomeComponentThatNeedsUID uid={uid} />}</UidProvider>
);
```

I like this function-as-child pattern because I'm not bound to what props a HOC might
declare. I have full control over how the information is provided to my components. Now that
the uid is getting passed in to the component that needs it, it can be used in whatever way
the component needs. Anywhere else in the application that might need to use the uid can
simply use the `UidProvider` component and be safe from any changes in the React context API.

---

By combining the great features of Firebase, React, and React Router, I have a simple
way to authenticate users in my app. The new APIs provided by React Router v4 allow for my
route configurations to be much more expressive and declarative. This makes the code easier
to reason about, especially when returning to it after some time away.
