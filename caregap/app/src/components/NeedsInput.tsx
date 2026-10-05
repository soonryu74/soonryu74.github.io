import { demoInput } from '../engine/defaults';
import { go } from '../state/router';
import { useStore } from '../state/store';

export default function NeedsInput() {
  const { replace } = useStore();
  return (
    <div className="page narrow center">
      <h1 className="page-title">먼저 돌봄 상황을 알려주세요</h1>
      <p className="lead-sm">입력한 내용이 없어 결과를 만들 수 없습니다.</p>
      <div className="hero-cta">
        <a className="btn btn-primary" href="#/start/1">돌봄 공백 확인하기</a>
        <button type="button" className="btn btn-ghost" onClick={() => { replace(demoInput(), true); go('result'); }}>예시로 체험하기</button>
      </div>
    </div>
  );
}
