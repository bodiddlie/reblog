import {redirect} from "@remix-run/node";

export function loader() {
  return redirect('/blog');
}

export default function Index() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.4" }}>
    </div>
  );
}
