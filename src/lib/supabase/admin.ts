import { env } from "@/lib/config";

const BASE = () => `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`;

function authHeaders() {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY!,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY!}`,
    "Content-Type": "application/json",
    Accept: "application/json"
  };
}

function q(value: unknown): string {
  if (value === null || value === undefined) return "null";
  return encodeURIComponent(String(value));
}

class AdminQueryBuilder {
  url: string;
  headers: Record<string, string>;
  method: string = "GET";
  body: string | null = null;
  _single: boolean = false;

  constructor(table: string) {
    this.url = `${BASE()}/${table}`;
    this.headers = authHeaders();
  }

  select(columns: string) {
    this.url += `?select=${encodeURIComponent(columns)}`;
    return this;
  }

  eq(column: string, value: unknown) {
    const sep = this.url.includes("?") ? "&" : "?";
    this.url += `${sep}${column}=eq.${q(value)}`;
    return this;
  }

  not(column: string, operator: string, value: unknown) {
    const sep = this.url.includes("?") ? "&" : "?";
    this.url += `${sep}${column}=not.${operator}.${q(value)}`;
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }) {
    const sep = this.url.includes("?") ? "&" : "?";
    const dir = opts?.ascending === false ? "desc" : "asc";
    this.url += `${sep}order=${encodeURIComponent(column)}.${dir}`;
    return this;
  }

  limit(n: number) {
    const sep = this.url.includes("?") ? "&" : "?";
    this.url += `${sep}limit=${n}`;
    return this;
  }

  single() {
    this._single = true;
    this.url += "&limit=1";
    return this;
  }

  maybeSingle() {
    this._single = true;
    this.url += "&limit=1";
    return this;
  }

  private async execute<T>(): Promise<{ data: T | null; error: null | { message: string; code: string } }> {
    try {
      const response = await fetch(this.url, {
        method: this.method,
        headers: {
          ...this.headers,
          Prefer: this.method === "POST" ? "return=representation" : ""
        },
        body: this.body
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null) as { message?: string; code?: string } | null;
        return { data: null, error: { message: err?.message ?? `HTTP ${response.status}`, code: err?.code ?? String(response.status) } };
      }

      const result = await response.json() as T;

      if (Array.isArray(result) && this._single) {
        return { data: (result.length > 0 ? result[0] : null) as T, error: null };
      }

      return { data: result, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return { data: null, error: { message, code: "FETCH_ERROR" } };
    }
  }

  async then<T>(resolve: (value: { data: T | null; error: null | { message: string; code: string } }) => T): Promise<T> {
    const result = await this.execute<T>();
    return resolve(result);
  }
}

export function createSupabaseAdminClient() {
  return {
    from: (table: string) => ({
      select: (columns: string) => new AdminQueryBuilder(table).select(columns),
      insert: (rows: Record<string, unknown> | Record<string, unknown>[], opts?: { onConflict?: string }) => {
        const qb = new AdminQueryBuilder(table);
        qb.method = "POST";
        qb.body = JSON.stringify(Array.isArray(rows) ? rows : [rows]);
        qb.headers["Prefer"] = "return=representation";
        if (opts?.onConflict) {
          // Handled via query param
        }
        return {
          ...qb,
          then: qb.then.bind(qb),
          select: (columns: string) => {
            qb.url = `${BASE()}/${table}?select=${encodeURIComponent(columns)}`;
            return qb;
          },
          maybeSingle: () => qb,
          single: () => qb
        } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      },
      update: (values: Record<string, unknown>) => {
        const qb = new AdminQueryBuilder(table);
        qb.method = "PATCH";
        qb.body = JSON.stringify(values);
        return {
          ...qb,
          then: qb.then.bind(qb),
          eq: (column: string, value: unknown) => {
            qb.url += `?${column}=eq.${q(value)}`;
            return qb;
          }
        } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      },
      upsert: (rows: Record<string, unknown> | Record<string, unknown>[], opts?: { onConflict?: string }) => {
        const qb = new AdminQueryBuilder(table);
        qb.method = "POST";
        qb.body = JSON.stringify(Array.isArray(rows) ? rows : [rows]);
        qb.headers["Prefer"] = "return=representation";
        if (opts?.onConflict) {
          qb.url += `?on_conflict=${encodeURIComponent(opts.onConflict)}`;
        }
        return {
          ...qb,
          then: qb.then.bind(qb),
          select: (columns: string) => {
            const sep = qb.url.includes("?") ? "&" : "?";
            qb.url += `${sep}select=${encodeURIComponent(columns)}`;
            return qb;
          }
        } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      }
    }),
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, file: Blob | ArrayBuffer | string, opts?: { contentType?: string; upsert?: boolean }) => {
          
          const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;
          const response = await fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY!}`,
              "Content-Type": opts?.contentType ?? "application/octet-stream",
              "x-upsert": opts?.upsert ? "true" : "false"
            },
            body: file
          });

          if (!response.ok) {
            const err = await response.json().catch(() => null) as { error?: string } | null;
            return { data: null, error: { message: err?.error ?? `Upload failed: ${response.status}` } };
          }

          return { data: { path }, error: null };
        },
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}` }
        })
      })
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

export async function adminInsert<T extends Record<string, unknown>>(
  table: string,
  rows: T | T[]
): Promise<T[]> {
  return createSupabaseAdminClient().from(table).insert(rows).then((r: { data: T[] | null }) => r.data ?? []);
}

export async function adminUpdate<T extends Record<string, unknown>>(
  table: string,
  match: Record<string, unknown>,
  values: Partial<T>
): Promise<void> {
  const qb = createSupabaseAdminClient().from(table).update(values);
  for (const [k, v] of Object.entries(match)) {
    qb.eq(k, v);
  }
  await qb.then(() => {});
}
