---
layout: post
title: 'Big Talk about Micro-Frontends'
date: 2019-06-15
comments: true
meta:
  title: Big Talk About Micro-Frontends
  description: After a recent post on Martin Fowler's blog, there's been a lot of chatter online about micro-frontends. I am taking this opportunity to share my opinion of them, and highlight a recent project I worked on that utilized the micro-frontend idea.
  date: "June 15, 2019"
---

# {attributes.title}
{attributes.date.toDateString()}

After a recent post on [Martin Fowler's](https://martinfowler.com/articles/micro-frontends.html) blog, there's been a lot of chatter
online about micro-frontends. I am taking this opportunity to share
my opinion of them, and highlight a recent project I worked on that
utilized the micro-frontend idea.

### So What Are Micro-Frontends?

The basic idea behind micro-frontends is to decompose a web application
into completely separate, independently deployable, self-contained
mini applications. A common example of this that gets thrown around
is a product website. The product listings, search, and cart would
all be architected as separate pieces that could be maintained and
deployed on their own.

Breaking up an application like this theoretically allows for wholly
different teams to own each individual piece. This separation also means
that those teams can iterate and upgrade their pieces without causing
issues in other parts of the overall application.

### Giving It The Ol' College Try

At the end of every quarter at my work, we have a three day hack-a-thon.
For the most recent hack-a-thon, I signed up with a team that was going
to work on a proof-of-concept of a vertical slice of a micro-service,
complete with a micro-frontend using web components. To be honest, I was
highly skeptical of the concept, but was excited to give it a try. I
also had never done anything with web components before, so I was looking forward
to trying them out.

Rather than try to use the standard web component spec (which many of us
on the team had heard was difficult to work with), we planned on using
a framework. Polymer is a leading contender, but we decided to give
[StencilJS](https://stenciljs.com/) a try due to its familiar and React-like
API.

Our use case for the project was a simple feedback widget that could be
added to any internal project. By simply adding our web component and providing
the required information, any application could have a simple, and uniform
across the enterprise, feedback form:

```tsx
import { Component, Prop, State, Listen, h } from '@stencil/core';

@Component({
  tag: 'feedback-button',
})
export class FeedbackButton {
  @Prop() appName: string;
  @Prop() primaryColor: string;
  @Prop() secondaryColor: string;

  @State() showForm: boolean;

  handleClick() {
    this.showForm = !this.showForm;
  }

  @Listen('closeform')
  closeFormHandler() {
    this.showForm = false;
  }

  render() {
    return (
      <div>
        <button
          onClick={() => this.handleClick()}
          style={{
            background: this.secondaryColor || '#cccccc',
            color: this.primaryColor || 'papayawhip',
          }}
        >
          Feedback
        </button>
        {this.showForm ? <feedback-form app-name={this.appName} /> : null}
      </div>
    );
  }
}
```

Here you can see an example of a simple `feedback-button` component. Stencil
uses a familiar React like API that also takes advantage of typescript
decorators for annotations. Using decorators like `@Component`, `@Prop`,
and `@State`, we can build out a component in much the same way we would
build a React component. This example has a `@Prop` that takes in the app
name our component is being embedded in. It also tracks a piece of `@State`
for whether or not to show our feedback form. Handling events is also similar
to React in that we can add a `onClick` prop to a button to tie it to a
handler function.

One other interesting bit to note is the use of `@Listen`. Stencil and web
components give us the ability to use custom events easily. This `@Listen`
annotation tells our component to listen for the `closeform` event and
call the annotated function. This allows for some interesting capabilities
for tying components together without having them actually coupled.

Stencil also uses a `render` method much like React. With the important bit
being that we are using another web component that we will create next,
`<feedback-form>`. Because web components are registered globally, there
is no need to import them explicitly.

```tsx
import { Component, Prop, State, Event, EventEmitter, h } from '@stencil/core';

@Component({
  tag: 'feedback-form',
})
export class FeedbackForm {
  @Prop() appName: string;

  @State() submitted: boolean;

  @Event() closeform: EventEmitter;

  close() {
    this.closeform.emit();
  }

  submitFeedback() {
    const comments = this.feedbackText.value;
    fetch('http://localhost:8080/feedback', {
      method: 'POST',
      body: JSON.stringify({
        appName: this.appName,
        comments,
      }),
    }).then(() => {
      this.submitted = true;
      setTimeout(() => this.closeform.emit(), 2000);
    });
  }

  render() {
    <div>
      <header>
        <h2>{this.appName} Feedback</h2>
        <button onClick={() => this.close()}>X</button>
      </header>
      {this.submitted ? (
        <main>
          <p>Successfully submitted. Thank you for your feedback!</p>
        </main>
      ) : (
        <main>
          <textarea
            ref={el => (this.feedbackText = el as HTMLTextAreaElement)}
            rows={10}
          />
          <button onClick={() => this.submitFeedback()}>Submit</button>
        </main>
      )}
    </div>;
  }
}
```

Looking at the implementation of our `<feedback-form>`, it looks like a
normal React-like component. Something that stands out is the uses of
`@Event` and `@EventEmitter`. These are the mechanism for creating a
custom DOM event and emitting it. Our custom `closeform` event will
be emitted if the user clicks the close button, or two seconds after
a successful submission of the form.

Note that we are specifying the call to our backend service here. This
is the crucial piece that in my opinion makes micro-frontends possibly a
worthwhile idea. The application that uses our feedback component doesn't
have to know anything about how to wire up to our backend service. All
the funcionality is encapsulated within our component.

For our hack-a-thon project, we simply served up the built bundle of our
component from our API server. The application using it only has to
add a script tag and then add our component to their markup like any
other HTML element.

### Micro All the Things?

So it made for an interesting hack-a-thon project, but is it a viable strategy
in the real world?
Micro-frontends may be a good fit in cases where a simple small piece
of functionality can be completely self-contined from UI down to the
data layer, and with a team dedicated to owning the entire service
from database to backend, to UI.

However, I do think that there are many potential pitfalls in the concept of
micro-frontends. The idea that separate teams can use completely separate
frameworks to build out pieces of an application is a recipe for disaster.
Bundle sizes will bloat, keeping designs in sync will be highly difficult,
and interoperability will grow more and more difficult as the application ages. Yes, teams can agree
on the use of a common framework, but I would argue that this isn't building
micro-frontends, but just building component libraries, which has been a
fairly standard practice for a while now.

Outside of the technical challenges, I have larger concerns about design
and UX regarding micro-frontends. Design systems can help
mitigate the risk of diverging designs, but the dedication required is
hard to maintain. User experience might suffer
if not carefully focused on. UX is already a very hard thing to get right,
and when not tackling an application as a whole, would likely become more
difficult.

Like any technology we use as software developers, micro-frontends have
tradeoffs that must be considered. If a service can be completely
self-contained and removed from the containing application without incident,
it might be a good candidate for a micro-frontend. Most other cases, in my
opinion, would be best served by more typical methods of development.
