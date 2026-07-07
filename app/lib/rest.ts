// app/lib/rest.ts
import { api } from "./api";

type Id = string | number;
type CompositeId = Id | Id[];

function idToPath(id: CompositeId) {
  return Array.isArray(id) ? id.map(encodeURIComponent).join("/") : encodeURIComponent(String(id));
}

export const rest = {
  // GET /recurso?limit=...&offset=...
  list: async <T>(resource: string, params?: Record<string, any>) => {
    const { data } = await api.get<T[]>(`/${resource}`, { params });
    return data;
  },

  // GET /recurso/:id   o   /recurso/:id1/:id2 (PK compuesta)
  get: async <T>(resource: string, id: CompositeId) => {
    const { data } = await api.get<T>(`/${resource}/${idToPath(id)}`);
    return data;
  },

  // POST /recurso
  create: async <TOut, TIn = any>(resource: string, body: TIn) => {
    const { data } = await api.post<TOut>(`/${resource}`, body);
    return data;
  },

  // PUT /recurso/:id
  update: async <TOut, TIn = any>(resource: string, id: CompositeId, body: TIn) => {
    const { data } = await api.put<TOut>(`/${resource}/${idToPath(id)}`, body);
    return data;
  },

  // DELETE /recurso/:id  (según tu backend: hard/soft/state/forbid)
  remove: async (resource: string, id: CompositeId) => {
    const res = await api.delete(`/${resource}/${idToPath(id)}`);
    return res.data; // a veces devuelve el registro actualizado (soft/state), a veces vacío (204)
  },
};
