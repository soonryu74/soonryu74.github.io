import emergency from '../data/emergency.json';
import type { EmergencyContact } from '../types';
import { PhoneLink } from './shared';

export default function Emergency() {
  const contacts = emergency as EmergencyContact[];
  return (
    <div className="page narrow">
      <p className="eyebrow">급할 때</p>
      <h1 className="page-title">지금 바로 전화할 곳</h1>
      <p className="lead-sm">번호를 누르면 바로 전화가 걸려요. 전부 무료입니다.</p>
      <ul className="contact-list">
        {contacts.map((c) => (
          <li key={c.phone} className="card contact">
            <PhoneLink phone={c.phone} label={c.label} big />
            <p><b>이럴 때:</b> {c.when}</p>
            <p className="small muted">{c.hours}{c.url && <> · <a href={c.url} target="_blank" rel="noopener noreferrer">누리집 ↗</a></>}</p>
          </li>
        ))}
      </ul>
      <p className="small muted">말하기 어려우면 119는 문자(SMS)로도 신고할 수 있어요. 가까운 행정복지센터(주민센터)에 직접 찾아가도 됩니다.</p>
      <p><a className="btn btn-ghost" href="#/">← 처음으로</a></p>
    </div>
  );
}
