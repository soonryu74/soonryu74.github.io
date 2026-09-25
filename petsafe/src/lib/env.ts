// 환경 설정. 서버 전용 키는 이 모듈의 serverEnv()로만 읽는다.
export function publicEnv() {
  return {
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    kakaoMapKey: process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY || "",
  };
}

export function isSupabaseConfigured(): boolean {
  const e = publicEnv();
  return Boolean(e.supabaseUrl && e.supabaseAnonKey);
}

export function serverEnv() {
  if (typeof window !== "undefined") throw new Error("serverEnv() must not run in the browser");
  return {
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    kakaoRestKey: process.env.KAKAO_REST_API_KEY || "",
    publicDataKey: process.env.PUBLIC_DATA_SERVICE_KEY || "",
    tourApiKey: process.env.TOUR_API_SERVICE_KEY || "",
    cronSecret: process.env.CRON_SECRET || "",
    adminBootstrapEmail: (process.env.ADMIN_BOOTSTRAP_EMAIL || "").trim().toLowerCase(),
    demoDir: process.env.PETSAFE_DEMO_DIR || ".demo-data",
  };
}
