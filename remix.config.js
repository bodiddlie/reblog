/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  serverBuildTarget: 'vercel',
  // When running locally in development mode, we use the built in remix
  // server. This does not understand the vercel lambda module format,
  // so we default back to the standard build output.
  serverDependenciesToBundle: [
    /rehype.*/,
    /lowlight/,
    /fault/,
    /hast-util-to-text/,
    /hast-util-is-element/,
    /unist-util-find-after/,
    /unist-util-is/,
    /unist-util-visit/,
  ],
  server: process.env.NODE_ENV === 'development' ? undefined : './server.js',
  ignoredRouteFiles: ['**/.*'],
  // appDirectory: "app",
  // assetsBuildDirectory: "public/build",
  // serverBuildPath: "api/index.js",
  // publicPath: "/build/",
  // mdx: async filename => {
  //   const [rehypeHighlight] = await Promise.all([
  //     import("rehype-highlight").then(mod => mod.default),
  //   ]);
  //   return {
  //     rehypePlugins: [rehypeHighlight]
  //   };
  // }
};
