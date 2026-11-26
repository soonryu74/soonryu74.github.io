import { createLocalRepo } from "./local";
import { createSupabaseRepo } from "./supabase";
import type { Repo } from "./repo";

export * from "./repo";

let instance: Repo | null = null;

/** Supabase 키가 있으면 실제 DB, 없으면 이 기기에만 저장되는 예시 모드. */
export function getRepo(): Repo {
  if (instance) return instance;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  instance = url && key ? createSupabaseRepo(url, key) : createLocalRepo();
  return instance;
}

export const isExampleMode = !(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
