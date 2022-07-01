import {json} from '@remix-run/node';
import {Link, useLoaderData} from "@remix-run/react";
import type {LoaderFunction} from "@remix-run/node";

import * as indie from './2013-04-01-indie-games-vs-movies.md';
import * as callback from './2016-02-07-node-callback-hell.md';
import * as xamarin from './2016-04-13-xamarin-vs-native-ios.md';
import * as toh from './2016-06-21-ng-2-toh-with-ngrx-suite.md';
import * as redux from './2017-01-02-thinking-critically-about-redux.md';
import * as firebase from './2017-01-11-firebase-auth-with-react-router.md';
import * as context from './2018-04-06-create-context.md';
import * as microfrontends from './2019-06-15-microfrontends.md';

function postFromModule(mod: any) {
  return {
    slug: mod.filename.replace(/\.mdx?$/, ''),
    ...mod.attributes.meta
  }
}

export const loader: LoaderFunction = async () => {
  return json([
    postFromModule(microfrontends),
    postFromModule(context),
    postFromModule(firebase),
    postFromModule(redux),
    postFromModule(toh),
    postFromModule(xamarin),
    postFromModule(callback),
    postFromModule(indie),
  ])
}

export default function Index() {
  const posts = useLoaderData();

  return (
    <div className="not-prose">
      {posts.map((post: any) => (
        <div className="mb-8" key={post.slug}>
          {post.date ? (
            <div className="text-neutral-500 text-sm">{post.date}</div>
          ): null}
          <Link to={post.slug} className="text-sky-500 text-2xl no-underline hover:underline">{post.title}</Link>
          {post.description ? (
            <p className="mt-0 text-base">{post.description}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}