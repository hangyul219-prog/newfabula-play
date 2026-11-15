# 파뷸라 시트·플레이툴 Firebase 설정과 공개 게시 가이드

툴 안에는 이제 Firebase 정보가 들어 있지 않습니다. GM이 자기 Firebase를 만들고, 그 설정을 플레이어에게 직접 건네줍니다.

- **같은 Firebase 설정을 넣은 사람끼리만 같은 방에 들어갑니다.** 설정이 다르면 데이터베이스 자체가 달라서 방 코드가 같아도 서로 보이지 않습니다.
- 설정은 **한 번만 입력하면 됩니다.** 브라우저에 저장되고, 같은 주소(`hangyul219-prog.github.io`)에 있는 시트와 플레이툴이 같이 씁니다.
- 처음 열면 순서는 **로고 → (테마 선택) → Firebase 입력 → 로그인**입니다.

---

## 1. Firebase 프로젝트 만들기 (GM이 한 번만)

1. https://console.firebase.google.com 에 구글 계정으로 들어갑니다.
2. **프로젝트 추가**를 누르고 이름을 정합니다(예: `my-fabula`).
3. Google 애널리틱스는 **사용 안 함**으로 두고 프로젝트를 만듭니다.

## 2. Realtime Database 만들기 (잠금 모드)

1. 왼쪽 메뉴 **빌드 → Realtime Database → 데이터베이스 만들기**를 누릅니다.
2. 위치는 **싱가포르(asia-southeast1)** 를 고릅니다. 한국에서 가장 빠릅니다.
3. 보안 규칙은 **잠금 모드로 시작**을 고릅니다. 이 상태에서는 아무도 읽거나 쓸 수 없습니다.

## 3. 익명 로그인 켜기

잠금 규칙은 "로그인한 사람만" 방을 읽고 쓰게 합니다. 툴은 접속할 때 자동으로 **익명 로그인**을 합니다(아이디·비밀번호 없음).

1. **빌드 → Authentication → 시작하기**를 누릅니다.
2. **로그인 방법** 탭에서 **익명**을 고르고 **사용 설정**을 켠 다음 저장합니다.
3. **설정** 탭 → **승인된 도메인**에서 **도메인 추가**를 눌러 `hangyul219-prog.github.io` 를 넣습니다. `localhost` 는 처음부터 들어 있습니다.

## 4. 보안 규칙 넣기

1. **Realtime Database → 규칙** 탭으로 갑니다.
2. 내용을 모두 지우고, 이 저장소의 [`database.rules.json`](database.rules.json) 내용을 그대로 붙여 넣은 다음 **게시**합니다.

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "fabula": {
      "rooms": {
        "$room": {
          ".read": "auth != null && $room.matches(/^[A-Z0-9_-]{1,24}$/)",
          ".write": "auth != null && $room.matches(/^[A-Z0-9_-]{1,24}$/)"
        }
      }
    }
  }
}
```

이 규칙이 하는 일은 세 가지입니다.

- 데이터베이스 전체는 계속 잠겨 있고, `fabula/rooms/방코드` 아래만 열립니다.
- 그것도 익명 로그인을 한 사람(곧 툴로 접속한 사람)만 읽고 쓸 수 있습니다.
- 방 목록 전체는 누구도 읽을 수 없습니다. 방 코드를 알아야만 그 방에 들어갈 수 있습니다.

## 5. 웹 앱 설정(firebaseConfig) 복사하기

1. 왼쪽 위 **톱니바퀴 → 프로젝트 설정 → 일반** 탭으로 갑니다.
2. 아래쪽 **내 앱**에서 웹 아이콘 **`</>`** 를 누릅니다.
3. 앱 별명을 적고(예: `fabula-web`), **Firebase 호스팅은 체크하지 않고** 등록합니다.
4. 다음과 같은 코드가 나옵니다. `{ }` 부분을 포함해 통째로 복사합니다.

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "my-fabula.firebaseapp.com",
  databaseURL: "https://my-fabula-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "my-fabula",
  storageBucket: "my-fabula.firebasestorage.app",
  messagingSenderId: "...",
  appId: "..."
};
```

> `databaseURL` 줄이 없으면 2번(데이터베이스 만들기)보다 앱 등록을 먼저 한 경우입니다. 프로젝트 설정 화면을 새로고침하고 다시 복사하세요.
> 이 주소는 Realtime Database 화면 맨 위에도 나옵니다.

## 6. 툴에 넣기, 플레이어에게 나눠 주기

1. 시트나 플레이툴을 엽니다. 로고 다음에 나오는 **FIREBASE** 화면에 복사한 코드를 붙여 넣고 **저장**을 누릅니다.
2. 같은 코드를 플레이어에게 **개인 메시지로** 보냅니다(디스코드 DM 등). 공개 채널이나 공개 게시판에는 올리지 마세요.
   **이 설정이 사실상 비밀번호입니다.** 설정과 방 코드를 둘 다 아는 사람은 그 방에 들어올 수 있습니다.
3. 플레이어도 처음 한 번만 붙여 넣으면 다음부터는 묻지 않습니다.

- **설정을 바꾸려면:** 로그아웃한 뒤 로그인 화면 아래쪽 **Firebase 설정 바꾸기**를 누릅니다.
- **혼자 오프라인으로만 쓰려면:** FIREBASE 화면에서 **오프라인으로만 쓰기**를 누릅니다. 나중에 방 코드를 넣으면 그때 다시 설정을 묻습니다.

## 7. 공개로 게시하기 (GitHub Pages)

지금 저장소 두 개는 이미 게시되어 있습니다.

| 툴 | 주소 |
|---|---|
| 시트 | https://hangyul219-prog.github.io/newbula-sheet/ |
| 플레이툴 | https://hangyul219-prog.github.io/newfabula-play/ |

새 저장소에 게시하거나 다시 켜야 할 때는 이렇게 합니다.

1. GitHub 오른쪽 위 **+ → New repository**를 누릅니다. **Public**으로 만듭니다(무료 계정의 Pages는 공개 저장소만 됩니다).
2. **Add file → Upload files**로 `index.html` 을 저장소 **맨 위(root)** 에 올리고 **Commit changes**를 누릅니다.
3. 저장소의 **Settings → Pages**로 갑니다.
4. **Source: Deploy from a branch**, **Branch: `main`**, 폴더 **`/ (root)`** 를 고르고 **Save**를 누릅니다.
5. 1~2분 뒤 같은 화면 위쪽에 `https://아이디.github.io/저장소이름/` 주소가 나옵니다. 이 주소를 플레이어에게 주면 됩니다.
6. 이 주소의 도메인(`아이디.github.io`)을 **3번의 승인된 도메인**에 넣었는지 확인합니다.

> 시트와 플레이툴을 **같은 GitHub 계정** 아래에 두면 도메인이 같아서, Firebase 설정을 한 번만 넣으면 둘 다에 적용됩니다.
> Firebase 설정은 `index.html` 에 들어 있지 않으므로, 저장소가 공개여도 데이터베이스 주소가 드러나지 않습니다.

## 8. (선택) API 키를 내 사이트에서만 쓰게 묶기

1. https://console.cloud.google.com/apis/credentials 에서 Firebase 프로젝트를 고릅니다.
2. **Browser key (auto created by Firebase)** 를 엽니다.
3. **애플리케이션 제한사항 → 웹사이트**를 고르고 다음 두 개를 추가한 뒤 저장합니다.
   - `https://hangyul219-prog.github.io/*`
   - `http://localhost/*`

> 이렇게 하면 `index.html` 을 내려받아 파일로 직접 열었을 때는 온라인 방에 들어갈 수 없습니다. GitHub Pages 주소로만 쓴다면 켜 두는 것이 안전합니다.

## 9. 예전 Firebase(fabula-86cf6) 처리

예전 설정은 코드에서는 지웠지만, **공개 저장소의 커밋 기록에는 남아 있습니다.** 아래 중 하나를 하세요.

- **데이터를 옮기려면:** 예전 프로젝트의 **Realtime Database → 데이터** 탭에서 `⋮ → JSON 내보내기`를 합니다. 새 프로젝트의 같은 화면에서 `⋮ → JSON 가져오기`를 하면 방이 그대로 옮겨집니다.
- **그다음 잠그기:** 예전 프로젝트의 규칙을 아래처럼 바꾸고 게시합니다. 또는 **프로젝트 설정 → 일반 → 맨 아래 프로젝트 삭제**를 합니다.

```json
{ "rules": { ".read": false, ".write": false } }
```

## 10. 무료 한도 (Spark 요금제)

| 항목 | 한도 |
|---|---|
| 저장 용량 | 1 GB |
| 다운로드 | 월 10 GB |
| 동시 접속 | 100명 |

캐릭터 이미지와 스프라이트도 데이터베이스에 저장되므로, 큰 이미지를 많이 올리면 용량이 빨리 찹니다. 사용량은 **Realtime Database → 사용량** 탭에서 볼 수 있습니다.

## 11. 문제 해결

| 증상 | 원인과 해결 |
|---|---|
| `auth/operation-not-allowed` | 익명 로그인이 꺼져 있습니다 → 3번 |
| `auth/api-key-not-valid` | 설정을 잘못 복사했습니다 → 로그인 화면의 **Firebase 설정 바꾸기**로 다시 붙여 넣기 |
| `PERMISSION_DENIED` / 방 데이터를 읽지 못함 | 규칙이 아직 게시되지 않았거나 방 코드에 허용되지 않는 글자가 있습니다 → 4번 |
| `auth/requests-from-referer-...-are-blocked` | 8번 API 키 제한에 지금 쓰는 주소가 빠졌습니다 |
| 같은 방 코드인데 서로 안 보임 | 두 사람의 Firebase 설정이 다릅니다 → 같은 설정을 다시 붙여 넣기 |
| "apiKey와 databaseURL이…" 경고 | `databaseURL` 이 빠진 설정입니다 → 5번의 안내를 보고 다시 복사 |
