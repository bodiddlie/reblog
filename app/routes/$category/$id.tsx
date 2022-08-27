import * as React from 'react';
import type { LoaderFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { getPost } from '~/server/db.server';
import { useMemo } from 'react';
import { getMDXComponent } from 'mdx-bundler/client';
import dayjs from 'dayjs';

export const loader: LoaderFunction = async ({ params }) => {
  // TODO: redirect?
  if (!params.id) return;
  const post = await getPost(params.id);
  return post;
};

export default function Post() {
  const { code, frontmatter } = useLoaderData();

  const Component = useMemo(() => getMDXComponent(code), [code]);

  return (
    <>
      <h1>{frontmatter.title}</h1>
      <em>{dayjs(frontmatter.date).format('ddd MMM DD YYYY')}</em>
      <Component />
    </>
  );
}
