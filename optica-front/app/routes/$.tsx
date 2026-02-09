import { useLocation } from "react-router";

export function loader() {
  throw new Response("Not Found", { status: 404 });
}

export default function NotFound() {
  const loc = useLocation();
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">404</h1>
      <p className="text-slate-600">No existe: {loc.pathname}</p>
    </div>
  );
}
