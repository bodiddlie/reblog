---
layout: post
title: "Adventures with Node Callback Hell"
categories: [node, javascript, programming]
date: 2016-02-07
comments: true
meta:
  title: "Adventures with Node Callback Hell"
  date: "February 7, 2016"
  description: I've been playing around with creating a simple web API using NodeJS and Express recently. I've found it to be a lot of fun to work with, however, I'm still fairly new to Node. In particular, I'm still trying to figure out how best to structure my code. This has led to some seriously ugly and over-indented code.
---

# {attributes.title}
{attributes.date.toDateString()}

I've been playing around with creating a simple web API using [NodeJS](http://nodejs.org) and
[Express](http://expressjs.org) recently. I've found it to be a lot of fun to work with, however,
I'm still fairly new to Node. In particular, I'm still trying to figure out how best to structure
my code. This has led to some seriously ugly and over-indented code.

I've been working on a simple login endpoint for the API that would return a JWT for a valid user.
I've been refactoring this piece of code for quite a bit today, and I think finally have it
where I'm happy with it. I'd like to run through some of the iterations, so you could see
the process of improving this code.

So first up is the ugly version:

```javascript
//login-controller.js

module.exports = function(User, secret, jwt) {
  return {
    login: function(email, password, cb) {
      User.findOne({ email: email }, function(err, user) {
        if (err) return cb(err);
        if (user) {
          user.comparePassword(password, function(err, isMatch) {
            if (isMatch) {
              var payload = {
                email: email,
                userid: user._id,
              };
              var token = jwt.sign(payload, secret);
              return cb(null, token);
            }
            return cb(null, null);
          });
        }
        return cb(null, null);
      });
    },
  };
};
```

A brief explanation of the above code. I'm using the pattern above to inject dependencies into
the module to facilitate testing (something I'm also still trying to figure out the best way
to do). Beyond that it's pretty straight-foward:

1.  Try to find a user with a given email
2.  If we find one, check the validity of the password
3.  If the password is valid, create and return a JWT

Like I said, straight-forward.....but ugly as all hell. There are so many levels of indentation
in that code, that I guarantee if I left this code for a month and came back, I would have a
hell of a time figuring it out again. So, how do I make it better?

After [wracking my brain](http://www.google.com) for a while, I realized that I could flatten
this out by declaring each of the callbacks as discrete, named functions. So I gave that a try.

```javascript
//login-controller.js Part Deux

module.exports = function(User, secret, jwt) {
  return {
    login: login,
  };

  function login(email, password, cb) {
    User.findOne({ email: email }, make_handleFindUser(cb));
  }

  function make_handleFindUser(cb) {
    return function(err, user) {
      if (err) return cb(err);
      if (user) {
        user.comparePassword(password, make_handleCompare(user, cb));
      }
      return cb(null, null);
    };
  }

  function make_handleCompare(user, cb) {
    return function(err, isMatch) {
      if (isMatch) {
        var payload = {
          email: user.email,
          userid: user._id,
        };
        var token = jwt.sign(payload, secret);
        return cb(null, token);
      }
      return cb(null, null);
    };
  }
};
```

This cuts the max level of indentation almost in half. It does look better and is easier to follow,
but it also added an extra 10 lines of code. This module also handles registering a new user, so
I wasn't happy with the longer code. Something also rubbed me the wrong way about having functions
just to generate callback functions.

It was about this time that I started having some issues with testing. One big thing I'm trying
to avoid is actually hitting the database during tests. This means mocking out models and
injecting them into the controller. That's when I realized that the problem wasn't in the
structure of the code in the controller. It was in my user model.

My user model was responsible for way too much. In particular, it was responsible for checking
if the password was valid. So I took that logic out of the model and moved it into a separate
module for security (along with the JWT creation). I switched to using the synchronous version
of compare in [bcrypt](https://github.com/ncb000gt/node.bcrypt.js), which isn't recommended,
but cleaned the code up for this simple instance. I might change it later. I also created a module for generating a generic repository based off a
[Mongoose](http://mongoosejs.com) model.

With all that in place, I was able to refactor the controller to the current version:

```javascript
//login-controller.js - Return of the Callback

module.exports = function(UserRepository, security) {
  return {
    login: login,
  };

  function login(email, password, cb) {
    UserRepository.findOne({ email: email }, function(err, user) {
      if (err) return cb(err);
      if (user && security.isValidPassword(password, user.password)) {
        return cb(
          null,
          security.makeJwt({
            email: user.email,
            userid: user._id,
          })
        );
      }
      return cb(null, null);
    });
  }
};
```

Much easier to follow, and shorter! I'm still not convinced it's the best way to do it. I'm
contemplating adding a `findValidUser` method to the UserRepository, thus offloading the
checking from the controller altogether, but for now this seems to work.

### Moral of the Story

---

Again, I'm new to Node, so don't take this example as something _you_ should do. There is a
lesson you can learn from all this, though. When you have code smell, make sure you look at
all the pieces that affect the problematic code. The biggest cause of the problem might very
well be poor design in another piece of code.
