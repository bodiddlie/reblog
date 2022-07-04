import styles from 'highlight.js/styles/night-owl.css';
import type {LinksFunction} from '@remix-run/node';
import {Outlet} from "@remix-run/react";

export const links: LinksFunction = () => {
  return [
    {
      rel: 'stylesheet',
      href: styles,
    }
  ];
}

export default function Blog() {
  return (
    <div className="w-3/4">
      <div className="prose max-w-none lg:prose-lg py-10 pl-5">
        <Outlet />
      </div>
    </div>
  )
}
