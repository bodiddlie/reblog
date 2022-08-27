import { createClient } from '@supabase/supabase-js';
import { bundleMDX } from 'mdx-bundler';
import rehypeHighlight from 'rehype-highlight';

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_KEY as string,
);

export async function getPosts(category: string, ascending: boolean = false) {
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .is('published', true)
    .eq('category', category)
    .order('publish_date', { ascending });
  return posts;
}

export async function getPost(slug: string) {
  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .single();

  const result = await bundleMDX({
    source: post.body,
    mdxOptions(options, frontmatter) {
      options.rehypePlugins = [rehypeHighlight];
      return options;
    },
  });

  return result;
}
