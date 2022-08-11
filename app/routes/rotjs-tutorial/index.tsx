import {json} from '@remix-run/node';
import {Link, useLoaderData} from "@remix-run/react";
import type {LoaderFunction} from "@remix-run/node";

import * as part0 from './part0.md';
import * as part1 from './part1.md';
import * as part2 from './part2.md';
import * as part3 from './part3.md';
import * as part4 from './part4.md';
import * as part5 from './part5.md';
import * as part6 from './part6.md';
import * as part7 from './part7.md';
import * as part8 from './part8.md';
import * as part9 from './part9.md';
import * as part10 from './part10.md';
import * as part11 from './part11.md';

function postFromModule(mod: any) {
  return {
    slug: mod.filename.replace(/\.mdx?$/, ''),
    ...mod.attributes.meta
  }
}

export const loader: LoaderFunction = async () => {
  return json([
    postFromModule(part0),
    postFromModule(part1),
    postFromModule(part2),
    postFromModule(part3),
    postFromModule(part4),
    postFromModule(part5),
    postFromModule(part6),
    postFromModule(part7),
    postFromModule(part8),
    postFromModule(part9),
    postFromModule(part10),
    postFromModule(part11),
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
