import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card py-8 text-center">
      <h1 className="h2">찾을 수 없어요</h1>
      <p className="text-muted mt-1">주소가 바뀌었거나, 볼 수 있는 권한이 없는 정보예요.</p>
      <div className="mt-4 flex justify-center gap-2"><Link href="/" className="btn btn-outline">홈으로</Link><Link href="/emergency" className="btn btn-danger">긴급 도움</Link></div>
    </div>
  );
}
