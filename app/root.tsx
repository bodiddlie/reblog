import type { MetaFunction, LinksFunction } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  Link
} from "@remix-run/react";
import styles from './tailwind.css';
import {FaGithub, FaTwitter} from "react-icons/fa";

export const links: LinksFunction = () => [{
  rel: 'stylesheet',
  href: styles
}];

export const meta: MetaFunction = () => ({
  charset: "utf-8",
  title: "Nick Klepinger's Blog",
  viewport: "width=device-width,initial-scale=1",
});

export default function App() {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <div className="flex flex-col">
          <header className="bg-zinc-800 text-white py-8 px-4 flex flex-row justify-between">
            <div className="flex items-center justify-between">
              <Link className="text-2xl block hover:underline mr-8" to="/">Nick Klepinger</Link>
              <Link className="hover:underline" to="/blog">Blog</Link>
            </div>
            <div className="flex items-center justify-between">
                <a href="https://github.com/bodiddlie">
                  <FaGithub size={40} />
                </a>
                <a href="https://twitter.com/bodiddlie">
                  <FaTwitter size={40} />
                </a>
            </div>
          </header>
          <Outlet />
        </div>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
