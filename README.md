# 쫑이 게임 — 모두가 보는 TOP 10 랭킹 버전

기존 게임은 그대로이며 게임을 클리어한 뒤 닉네임으로 점수를 등록할 수 있습니다.

## 최초 1회 무료 랭킹 연결하기
1. https://supabase.com 에서 무료 계정과 새 프로젝트 만들기.
2. 프로젝트 SQL Editor를 열고 `setup.sql`의 내용을 붙여 넣어 실행하기.
3. Supabase 프로젝트 **Settings → API** (또는 API Keys)에서 Project URL과 공개용 `publishable` 키(`sb_publishable_...`) 또는 legacy `anon` 키 복사.
4. `leaderboard-config.js` 안에 `JJONGI_SUPABASE_URL`과 `JJONGI_SUPABASE_KEY` 채우기. **service_role/secret 키 절대 금지**.
5. ZIP의 파일·폴더를 전부 GitHub 저장소 최상위에 올리기. `index.html`의 확장자는 한 번만 `.html` 이어야 합니다.
6. 저장소 Settings → Pages → Deploy from a branch → main / (root) → Save.
7. 배포 뒤 게임 시작 화면의 `전체 랭킹 TOP 10` 버튼에서 확인.

`leaderboard-config.js`가 빈 상태면 게임은 실행되지만 전체 랭킹은 아직 동작하지 않습니다.

## 주의
- 점수를 등록한 사람의 전체 기록이 공개됩니다. 실명 대신 닉네임을 사용하세요.
- 현재는 익명 공개 랭킹으로, 조작을 완전히 막는 서버 검증은 없습니다. 광고·상금용 경쟁에는 사용하지 마세요.
- 같은 닉네임의 기록도 매번 추가됩니다. TOP 10은 최고 점수 10건으로 보여줍니다.
