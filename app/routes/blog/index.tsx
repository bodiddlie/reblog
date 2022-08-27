import { Link, useLoaderData } from '@remix-run/react';
import type { LoaderFunction } from '@remix-run/node';
import { getPosts } from '~/server/db.server';
import dayjs from 'dayjs';

export const loader: LoaderFunction = async () => {
  return await getPosts();
};

export default function Index() {
  const posts = useLoaderData();

  return (
    <div className="not-prose">
      {posts.map((post: any) => (
        <div className="mb-8" key={post.slug}>
          {post.publish_date ? (
            <div className="text-neutral-500 text-sm">
              {dayjs(post.publish_date).format('MMMM DD, YYYY')}
            </div>
          ) : null}
          <Link
            to={post.slug}
            className="text-sky-500 text-2xl no-underline hover:underline"
          >
            {post.title}
          </Link>
          {post.description ? (
            <p className="mt-0 text-base">{post.description}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
