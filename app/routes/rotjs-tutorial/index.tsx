import {json} from '@remix-run/node';
import {Link, useLoaderData} from "@remix-run/react";
import type {LoaderFunction} from "@remix-run/node";

import * as part0 from './part0.md';
import * as part1 from './part1.md';

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
