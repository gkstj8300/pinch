/**
 * 공고 시작·종료 시각을 한국어 포맷으로 변환.
 *   - 같은 날: "5월 22일 (목) 15:30 ~ 16:30"
 *   - 다른 날: "5월 22일 (목) 15:30 ~ 5월 23일 (금) 16:30"
 *   - 시간대는 brand 의 Asia/Seoul 가정 (백엔드와 정합)
 */
const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatDateTime(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = WEEKDAY_KO[date.getDay()];
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${month}월 ${day}일 (${weekday}) ${hh}:${mm}`;
}

function formatTimeOnly(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatJobTime(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (isSameDay(start, end)) {
    return `${formatDateTime(start)} ~ ${formatTimeOnly(end)}`;
  }
  return `${formatDateTime(start)} ~ ${formatDateTime(end)}`;
}
