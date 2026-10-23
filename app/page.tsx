// Design Ref: §2.2 시작 화면 — 준비할 면접을 고른다. (BEI / AI 리터러시 / 토론)
// 디자인: 밝은 바탕, 굵은 가운데 제목, 노을빛 큰 카드 3장(겹쳐 쌓인 종이 층), 차례로 올라오는 등장 효과. 스타일은 home.css.
// 카드의 큰 숫자는 이 앱의 실제 사실만 쓴다. (경험당 질문 5개, 답변 300자, 10문제, 토큰 20,000, 의견 각 4개, 1분 이내)
import Link from "next/link";
import type { ReactNode } from "react";
import { AREAS, type Area } from "@/lib/areas";
import { LIMITS } from "@/lib/limits";
import "./home.css";

type Tone = "ember" | "tangerine" | "rust";

type CardContent = {
  tone: Tone;
  outcome: string;
  stats: [{ num: string; unit?: string; label: string }, { num: string; unit?: string; label: string }];
  steps: string[];
  cta: string;
  icon: ReactNode;
};

// 선으로 그린 작은 아이콘 (24×24 칸). BEI=말풍선 두 개, AI 리터러시=반짝임, 토론=서로 마주 보는 말풍선
const ICONS = {
  bei: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="home-card-icon">
      <path d="M4 5h11a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9l-3.5 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
      <path d="M19 10h1a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1v2.5L16.5 18H13" />
    </svg>
  ),
  literacy: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="home-card-icon">
      <path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9L11 3Z" />
      <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
    </svg>
  ),
  debate: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="home-card-icon">
      <path d="M3 4h10a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H7l-3 2.5V12a2 2 0 0 1-1-1.7V6a2 2 0 0 1 1-2Z" />
      <path d="M21 9H17M21 9v7a2 2 0 0 1-2 2h-5l-3 2.5V18" />
    </svg>
  ),
};

const CONTENT: Record<Area["id"], CardContent> = {
  bei: {
    tone: "ember",
    outcome: "내 경험으로 만드는 맞춤 질문",
    stats: [
      { num: "5", unit: "개", label: "경험 1개당 질문 (꼬리 질문 2개씩)" },
      { num: "300", unit: "자", label: "1분 모범 답변 (STAR 구조)" },
    ],
    steps: ["경험 고르기", "질문 확인", "모범 답변"],
    cta: "BEI 시작하기",
    icon: ICONS.bei,
  },
  literacy: {
    tone: "tangerine",
    outcome: "토큰 한도 안에서 푸는 모의 시험",
    stats: [
      { num: "10", unit: "문제", label: "100점 만점 채점·해설" },
      { num: LIMITS.LITERACY_BUNDLE_TOKENS.toLocaleString("ko-KR"), label: "묶음당 토큰 한도" },
    ],
    steps: ["파일 열기", "AI 어시스트", "제출·채점"],
    cta: "모의 시험 시작하기",
    icon: ICONS.literacy,
  },
  debate: {
    tone: "rust",
    outcome: "찬반 논거와 새로운 관점",
    stats: [
      { num: "4", unit: "개", label: "찬성·반대 각각의 의견" },
      { num: "1", unit: "분", label: "이내에 만드는 의견" },
    ],
    steps: ["주제 고르기", "입장 선택", "의견·관점"],
    cta: "토론 시작하기",
    icon: ICONS.debate,
  },
};

function CardInner({ area, content }: { area: Area; content: CardContent }) {
  return (
    <>
      <div className="home-card-top">
        <div>
          <h2 className="home-card-name">{area.title}</h2>
          <p className="home-card-outcome">{content.outcome}</p>
        </div>
        {content.icon}
      </div>

      <div className="home-card-stats">
        <div className="home-stat">
          <span className="home-stat-num">
            {content.stats[0].num}
            {content.stats[0].unit && <small>{content.stats[0].unit}</small>}
          </span>
          <span className="home-stat-label">{content.stats[0].label}</span>
        </div>
        <span className="home-card-divider" aria-hidden="true" />
        <div className="home-stat">
          <span className="home-stat-num">
            {content.stats[1].num}
            {content.stats[1].unit && <small>{content.stats[1].unit}</small>}
          </span>
          <span className="home-stat-label">{content.stats[1].label}</span>
        </div>
      </div>

      <div className="home-card-photo">
        <span className="home-paper p2" aria-hidden="true" />
        <span className="home-paper p1" aria-hidden="true" />
        <div className="home-panel">
          <ol className="home-steps">
            {content.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <span className="home-cta">
            {area.ready ? content.cta : "준비 중"}
            {area.ready && (
              <span className="home-cta-arrow" aria-hidden="true">
                →
              </span>
            )}
          </span>
        </div>
      </div>
    </>
  );
}

function AreaCard({ area, index }: { area: Area; index: number }) {
  const content = CONTENT[area.id];
  const className = `home-card tone-${content.tone}${area.ready ? "" : " is-disabled"}`;
  const style = { "--i": index } as React.CSSProperties;

  // 아직 화면이 만들어지지 않은 영역은 누를 수 없게 두고 "준비 중"을 표시한다. (지금은 세 영역 모두 열려 있다)
  if (!area.ready) {
    return (
      <li className={className} style={style}>
        <div className="home-card-link" aria-disabled="true">
          <CardInner area={area} content={content} />
        </div>
      </li>
    );
  }

  return (
    <li className={className} style={style}>
      <Link href={area.href} className="home-card-link">
        <CardInner area={area} content={content} />
      </Link>
    </li>
  );
}

/** 제목을 단어마다 나눠, 단어가 하나씩 올라오며 나타나게 한다. */
function TitleLine({ text, start }: { text: string; start: number }) {
  return (
    <span className="line">
      {text.split(" ").map((word, i) => (
        <span key={`${word}-${i}`}>
          {/* 단어 사이의 띄어쓰기는 글자로 남겨 둔다. (화면 낭독기가 단어를 이어 붙여 읽지 않게) */}
          {i > 0 && " "}
          <span className="w" style={{ "--w": start + i } as React.CSSProperties}>
            {word}
          </span>
        </span>
      ))}
    </span>
  );
}

export default function Home() {
  return (
    <main className="home flex-1">
      <div className="home-wrap">
        <p className="home-eyebrow">은행 면접도우미 A to Z</p>
        <h1 className="home-title">
          <TitleLine text="면접 준비, 세 가지를" start={0} />
          <TitleLine text="한 곳에서 연습하세요" start={3} />
        </h1>
        <p className="home-lead">
          BEI·AI 리터러시·토론 면접을 하나씩 따로 연습할 수 있습니다. 로그인 없이 바로 시작하고, 결과는 이 브라우저에만 저장됩니다.
        </p>
        <span className="home-rule" aria-hidden="true" />

        <ul className="home-cards" aria-label="준비할 면접 고르기">
          {AREAS.map((area, index) => (
            <AreaCard key={area.id} area={area} index={index} />
          ))}
        </ul>

        <Link href="/privacy" className="home-more">
          저장·개인정보 안내 보기
        </Link>
      </div>
    </main>
  );
}
