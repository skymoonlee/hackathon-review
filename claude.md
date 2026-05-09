# hackathon-review — CLAUDE.md

> 본 문서는 이 프로젝트에서 작업할 때 따라야 할 **절대 규칙**과 **컨벤션**을 정의한다.
> 이 프로젝트는 **해커톤 데모용**이며, 비즈니스 로직이나 프로덕션 안정성보다 **빠른 데모 기능 구현**을 최우선으로 한다.

---

## 0. 절대 규칙 (Hard Rules)

다음은 어떤 상황에서도 어겨서는 안 된다. 위반 시 즉시 수정.

1. **하드코딩 금지 (No Hardcoding)**
   - 문자열 라벨, 색상, 사이즈, 임계값, URL, ID 등 **리터럴을 컴포넌트/페이지에 직접 박지 않는다**.
   - 모든 상수는 `src/config/`, `src/constants/`, 또는 환경변수(`.env`)에서 가져온다.
   - UI 카피/라벨은 `src/i18n/` 또는 `src/constants/copy.ts` 같은 단일 진실 공급원(SSOT)에 둔다.
   - "임시값"이라도 매직 넘버를 코드에 그대로 두지 않는다 — 상수로 추출 후 그 상수를 사용한다.

2. **공유 컴포넌트 우선 (Reuse Shared Components)**
   - UI 요소는 `src/components/ui/` 또는 `src/components/shared/`에 정의된 공통 컴포넌트를 **먼저 사용**한다.
   - 동일/유사한 마크업이 두 번 이상 등장하면 즉시 공통 컴포넌트로 추출한다.
   - 새 컴포넌트가 필요하면 기존 디자인 시스템과 톤(Tailwind 토큰)을 따라 만든 뒤 공유 위치에 둔다.

3. **동적 / 전역 변수 사용 (Dynamic & Global Variables)**
   - 데이터, 옵션, 메뉴 항목, 상태 라벨 등은 **배열/맵을 동적으로 순회**하여 렌더한다 — 하나하나 직접 쓰지 않는다.
   - 전역으로 쓰이는 값(theme, brand color, 카테고리 enum, 평가 기준 등)은 `src/config/global.ts` 같은 곳에 모은다.
   - 반복 데이터는 `.map()`으로 렌더하고, 상수는 `as const` + 타입 추론으로 안전하게 노출한다.

4. **시크릿은 `.env` 에만**
   - API 키, 토큰, 프로젝트 ID 등은 절대 코드에 박지 않는다. `.env` (gitignored)를 통해서만 로드.
   - 클라이언트에 노출돼도 되는 값만 `NEXT_PUBLIC_*` 접두사로 노출.

> 위 규칙들은 **데모 코드라도 예외 없이** 적용한다. 해커톤이라고 해서 하드코딩이 허용되는 것은 아니다 — 오히려 빠르게 변경 가능한 구조가 필요하기 때문에 더 엄격히 지킨다.

---

## 1. 프로젝트 개요

- **이름**: hackathon-review
- **목적**: 해커톤 결과물(또는 프로젝트)을 **평가/리뷰**하기 위한 데모 웹앱.
- **범위**: 비즈니스 로직 없음. **데모에 필요한 핵심 기능만** 구현.
- **GitHub**: https://github.com/skymoonlee/hackathon-review

---

## 2. 기술 스택

| 영역      | 사용 기술                                                       |
| --------- | --------------------------------------------------------------- |
| Framework | **Next.js** (App Router)                                        |
| Language  | **TypeScript** (strict)                                         |
| UI        | **React** + **Tailwind CSS**                                    |
| Backend   | **InsForge** (project: `ab4253b4-91aa-41e4-9650-3adfd6eb8b65`)  |
| 코드검색/RAG | **Nia** (Nozomio Labs) — `nia` CLI                            |

### 백엔드: InsForge
- 모든 백엔드 작업(테이블, 인증, 스토리지, edge functions 등)은 **InsForge CLI / 스킬**을 통해 수행한다.
- 직접 SQL이나 raw HTTP를 작성하기 전에 InsForge skill을 먼저 검토한다.
- Dashboard: https://insforge.dev/dashboard/project/ab4253b4-91aa-41e4-9650-3adfd6eb8b65

### 코드 검색/RAG: Nia
- 외부 패키지/문서 검색 시 `nia` CLI 또는 Nia 스킬 사용. 무료 플랜 한도(쿼리 50, 컨텍스트 5 등)에 유의.

### 설치된 Agent Skills

이 프로젝트에는 다음 Claude/Agent 스킬이 글로벌로 설치되어 있다 (`~/.claude/skills/`, `~/.agents/skills/`):

| 스킬                    | 용도                                                         |
| ----------------------- | ------------------------------------------------------------ |
| `nia`                   | Nia 코드/문서 RAG 검색, 외부 레포 인덱싱·쿼리                 |
| `insforge`              | InsForge 메인 스킬 — 테이블/auth/스토리지 등 백엔드 빌드     |
| `insforge-cli`          | `@insforge/cli` 명령(login/link/migrate 등) 헬퍼             |
| `insforge-debug`        | InsForge 백엔드 디버깅 (로그/요청 추적)                      |
| `insforge-integrations` | InsForge ↔ 외부 서비스(OAuth, 결제 등) 연동                  |
| `find-skills`           | 어떤 스킬을 쓸지 먼저 검색하는 메타 스킬                     |

> 백엔드 관련 작업이 들어오면 **`find-skills` → `insforge` 또는 `insforge-*`** 순서로 확인 후 진행한다.
> 외부 라이브러리/문서 조사가 필요하면 **`nia`** 스킬을 우선 사용한다 (무료 플랜 한도 주의).

---

## 3. 디렉토리 구조 (목표)

```
src/
├── app/                  # Next.js App Router 페이지/레이아웃
├── components/
│   ├── ui/               # 기본 UI 프리미티브 (Button, Input, Card …)
│   └── shared/           # 도메인 공통 컴포넌트 (ReviewCard, CriteriaList …)
├── config/
│   ├── global.ts         # 전역 상수 (브랜드, 테마, 라우트 등)
│   ├── criteria.ts       # 평가 기준 정의 (동적으로 사용)
│   └── env.ts            # process.env → 타입 안전 export
├── constants/
│   └── copy.ts           # UI 카피/라벨 (i18n 대비)
├── lib/
│   ├── insforge.ts       # InsForge 클라이언트
│   └── utils.ts
└── types/
```

> 폴더가 아직 없다면 처음 파일을 만들 때 함께 생성한다.

---

## 4. 코딩 컨벤션

- **TypeScript strict** — `any` 금지, `unknown` + 타입 가드 사용.
- **Tailwind 유틸리티** 우선. 커스텀 CSS는 Tailwind로 표현 불가능할 때만.
- **공통 토큰** (`text-brand`, `bg-surface` 등)은 `tailwind.config.ts`에서 정의 후 사용.
- **컴포넌트 prop**은 `as const` 배열/맵으로 옵션을 받아 동적으로 렌더.
- **Server Component 기본**, 상태/이벤트가 필요한 곳만 `"use client"`.
- **import 별칭**: `@/` → `src/` (tsconfig paths).

---

## 5. 데모 스코프 가이드라인

해커톤 데모이므로 다음 우선순위를 지킨다:

1. ✅ **눈에 보이는 흐름** — 핵심 사용자 시나리오 1~2개가 끝까지 동작.
2. ✅ **데이터는 동적으로** — 더미 데이터라도 InsForge 테이블 또는 `src/config/*.ts` 배열에서 읽어와 렌더.
3. ⛔ **인증/권한 정교화, 에러 핸들링 풀 커버, 폼 밸리데이션 풀세트 등은 데모에 보이는 한도까지만**.
4. ⛔ 추상화 / 미래 확장성 / 백워드 호환을 위한 코드는 작성하지 않는다.

---

## 6. 환경변수

`.env` (gitignored) — 키는 `.env.example` 참고.

| 변수                         | 설명                                |
| ---------------------------- | ----------------------------------- |
| `NIA_API_KEY`                | Nia CLI 인증                        |
| `INSFORGE_USER_API_KEY`      | InsForge CLI 사용자 키              |
| `INSFORGE_PROJECT_ID`        | InsForge 프로젝트 ID                |
| `INSFORGE_API_KEY`           | InsForge 프로젝트 서버 키           |
| `INSFORGE_OSS_HOST`          | InsForge 호스트 URL                 |
| `NEXT_PUBLIC_INSFORGE_*`     | 클라이언트 노출 가능한 값만         |

---

## 7. 작업 흐름 (Claude에게)

1. **읽기 먼저** — 새 파일을 만들기 전, 관련 폴더(`src/config`, `src/components/ui`)에 이미 있는 토큰/컴포넌트를 확인한다.
2. **상수부터 추출** — 코드를 쓰면서 라벨/숫자가 등장하면 먼저 `src/config` 또는 `src/constants`에 정의 후 사용.
3. **공통 컴포넌트 후보 탐지** — 동일 마크업이 두 번 보이면 그 자리에서 추출.
4. **InsForge 작업은 InsForge skill 사용** — 테이블 생성, 인증 설정 등.
5. **체크 후 보고** — 변경 후에는 변경된 파일과 어떤 절대 규칙을 만족시켰는지 한 줄 요약.

---

## 8. Git

- 원격: `origin` → https://github.com/skymoonlee/hackathon-review
- 사용자 요청이 있을 때만 커밋/푸시한다 (자동 커밋 금지).
- `.env`, `.insforge/`, `node_modules/`는 절대 커밋하지 않는다 (`.gitignore`로 차단됨).
