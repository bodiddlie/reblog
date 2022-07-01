---
layout: post
title: "Xamarin vs Native Swift for iOS Development"
categories: [c#, swift, ios, xamarin, programming, mobile]
date: 2016-04-13
comments: true
meta:
  title: Xamarin vs Native Swift for iOS Development
  date: "April 13, 2016"
  description: At my job we're very much a Microsoft shop. Almost all of our code is C# and written for ASP.NET and its various frameworks. Recently management made the decision to switch to iPhones from Windows phones. This was mostly done because it turned out to be hard to find vendors that supported Windows phones.
---

# {attributes.title}
{attributes.date.toDateString()}

_I will preface this post with the statment that I have very, very little experience working
with Xamarin or native iOS development. Nothing I say here should be taken as anything more
than a quick, face-value judgement._

At my job we're very much a Microsoft shop. Almost all of our code is C# and written for
ASP.NET and its various frameworks. Recently management made the decision to switch to
iPhones from Windows phones. This was mostly done because it turned out to
be hard to find vendors that supported Windows phones.

We've not done any mobile development internally before, but our development team thought
that this might be a good time to investigate the potential of writing our own, in-house,
mobile apps. So we ordered some Mac minis, and set them up to hopefully start learning
iOS development. I personally started playing around with XCode and setting up a simple
proof of concept app using one of our internal APIs.

Jump to two weeks ago and the announcment at Microsoft's Build 2016 conference that Xamarin
would be free to use. With the prior pricing structure, Xamarin wasn't really a viable option
for us, especially because we didn't have any current plans to develop for the world at large,
only for internal organization use. Free though, is something we can't ignore; especially
when we could continue to write our code in the C# that we are all most familiar with.

So I worked up the same proof of concept using Xamarin. Here's the two relevant snippets:

```swift
//Swift version

import UIKit
import Alamofire

class DataViewController: UIViewController {
  @IBOutlet weak var textView: UITextView!

  override func viewDidLoad() {
    super.viewDidLoad();

    let un = "username"
    let pw = "password"

    Alamofire.request(.GET, "http://example.com/api/things")
      .authenticate(user: un, password: pw)
      .responseJSON { response in
        if let JSON = response.result.value {
          self.textView.text = "JSON: \(JSON)"
        }
      }
  }
}
```

```c#
//C# Xamarin version

using RestSharp;
using RestSharp.Authenticators;
using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using UIKit;

namespace IncidentProof
{
public partial class ViewController : UIViewController
{
public ViewController(IntPtr handle) : base(handle)
{
}

        public override void ViewDidLoad()
        {
            base.ViewDidLoad();
            // Perform any additional setup after loading the view, typically from a nib.

            var client = new RestClient("http://example.com");
            client.Authenticator = new NtlmAuthenticator("username", "password");

            var request = new RestRequest("api/things", Method.GET);
            var response = client.Execute(request);
            textView.Text = response.Content;
        }

        public override void DidReceiveMemoryWarning()
        {
            base.DidReceiveMemoryWarning();
            // Release any cached data, images, etc that aren't in use.
        }
    }

}
```

All these are doing is grabbing a bunch of JSON from a WebAPI endpoint, and dumping it as a
string into a text view. Nothing interesting, just wanted to see how it worked with our
APIs.

### Coding Experience

---

Looking at just the code, I would say that I prefer the C# version, but that's probably
just because of my familiarity with the language. The somewhat Ruby-esque nature of Swift
is something I still need to get used to, but I can see the appeal of it, especially when
compared to Objective-C.

In both, I'm using third-party libraries to facilitate the network call to the API. Alamofire
appears to be one of the leading libraries for doing this kind of thing in the iOS world,
and RestSharp was mentioned specifically in a few places in the official Xamarin docs.

### Development Workflow

---

While working in C# feels more comfortable, I have to say that the rest of the dev workflow
with Xamarin feels clunky at best. When designing directly for iOS, the designer actually
remotely connects to your Mac and gives you a reasonable facsimille of Interface Builder to
layout your views. Unfortunately, it seems slow, not as easy to use as the actual IB, and I
ran in to multiple times where I needed to toggle the sharing functionality off and on again
on my Mac so that Visual Studio could connect again.

The build/debug process is much the same. It remotely connects to the Mac and loads the app
in the simulator. I ran into many of the same issues, and the startup time from code change,
to running app seemed woefully slow.

It appears that if I were to use Xamarin.Forms instead of designly directly to iOS, then I
wouldn't have the Interface Builder problems. However, .Forms uses XAML for its layout,
and that's one Microsoft technology that I've never really embraced. I have enough XML based
markup languages in my life, thank you very much.

Working in XCode seems to be a pretty good experience from what I can tell. I know that a
lot of people deride the IDE and I've heard plenty of horror stories of it crashing constantly,
but in my very limited experience with it, it seemed to be fine. Interface Builder and the
storyboard system strike me as being one of the best visual designers I've played with.
The Autolayout stuff can be fairly obtuse, but I'm sure I'll get the hang of it eventually.

### So which one?

---

At this point it's looking to me like sticking with learning Swift and doing native iOS
will be the best road to take. I've always felt that a good developer will be good regardless
of the language they are using, so learning Swift shouldn't be a roadblock for us. With that
out of the way, we're left with the experience of working with both toolsets. For me personally,
the things that irritate me about Xamarin seem to outweigh the ability to stick with a familiar
environment.
