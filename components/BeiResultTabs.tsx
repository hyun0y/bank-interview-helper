"use client";
// Design Ref: §2.4 BEI 결과 — 경험별 탭에 질문, 1분 모범 답변(글자 수·근거·평가 기준), 꼬리 질문(답변 방향 한 줄)을 보여 준다.
// 방금 만든 결과(작업 9·10번)와 저장해 둔 결과(작업 11번)를 같은 모양으로 보여 주려고 따로 뺀 부품이다.
import { useState } from "react";
import SpeakButton from "@/components/SpeakButton";
import VoiceBar from "@/components/VoiceBar";
import { BEI_CRITERIA_NOTICE, findBeiCriterion } from "@/lib/bei-criteria";
import { STAR_LABELS, type BeiAnswer, type BeiQuestion } from "@/lib/bei-types";
import { LIMITS } from "@/lib/limits";
import { useSpeech, type SpeechControls } from "@/lib/use-speech";

export type ExperienceResult =
  | { status: "loading" }
  | { status: "done"; questions: BeiQuestion[] }
  | { status: "error"; message: string };

export type ResultTabItem = {
  id: string;
  title: string;
  summary: string;
  result: ExperienceResult | undefined;
};

function AnswerBlock({ answer, questionId }: { answer: BeiAnswer; questionId: string }) {
  return (
    <div data-testid={`answer-${questionId}`} className="mt-3 rounded-md bg-zinc-50 p-4 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold">1분 모범 답변</span>
        <span
          data-testid={`answer-length-${questionId}`}
          className={`text-xs ${answer.lengthOk ? "text-zinc-600 dark:text-zinc-300" : "font-medium text-amber-700 dark:text-amber-300"}`}
        >
          {answer.length}자
        </span>
      </div>
      <p className="mt-2 leading-7">{answer.text}</p>

      {!answer.lengthOk && (
        <p data-testid={`answer-lengthwarn-${questionId}`} className="mt-2 text-xs leading-5 text-amber-800 dark:text-amber-200">
          기준({LIMITS.ANSWER_MIN_CHARS}~{LIMITS.ANSWER_MAX_CHARS}자)을 벗어났습니다. 경험 글에 적힌 사실만으로 쓰다 보니 길이가 맞지 않을 수 있습니다. 직접 다듬어 주세요.
        </p>
      )}

      <div className="mt-3 flex flex-col gap-2 text-sm">
        {answer.evidenceStatus === "verified" ? (
          answer.evidenceOmitted ? (
            <p data-testid={`answer-evidence-${questionId}`} className="text-zinc-700 dark:text-zinc-200">
              근거 확인됨 <span className="text-xs text-zinc-500">(원문 문장 {answer.evidenceCount ?? 0}개 · 저장한 결과에는 원문을 보관하지 않아 문장은 보이지 않습니다)</span>
            </p>
          ) : (
            <details data-testid={`answer-evidence-${questionId}`}>
              <summary className="cursor-pointer text-zinc-700 dark:text-zinc-200">
                근거 확인됨 <span className="text-xs text-zinc-500">(원문 문장 {answer.evidence.length}개)</span>
              </summary>
              <ul className="mt-1 flex flex-col gap-1 pl-4 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
                {answer.evidence.map((item, index) => (
                  <li key={index}>
                    <span className="font-medium">{STAR_LABELS[item.part]}</span> “{item.quote}”
                  </li>
                ))}
              </ul>
            </details>
          )
        ) : (
          <p data-testid={`answer-unverified-${questionId}`} className="rounded-md bg-amber-100 px-3 py-2 text-xs leading-5 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            <span className="font-bold">근거 확인 안 됨</span> {answer.evidenceIssue} 사실과 다른 내용이 없는지 원문과 꼭 비교해 보세요.
          </p>
        )}

        {answer.needsSupplement && (
          <p data-testid={`answer-supplement-${questionId}`} className="rounded-md bg-amber-100 px-3 py-2 text-xs leading-5 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            <span className="font-bold">경험에서 확인되지 않음, 보완 필요</span> {answer.supplementNote}
          </p>
        )}

        <div data-testid={`answer-criteria-${questionId}`}>
          <p className="text-xs font-bold">반영한 평가 기준</p>
          <ul className="mt-1 flex flex-col gap-1 text-xs leading-5 text-zinc-700 dark:text-zinc-200">
            {answer.criteria.map((item) => (
              <li key={item.id}>
                <span className="font-medium">{findBeiCriterion(item.id)?.name ?? item.id}</span> — {item.reason}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">※ {BEI_CRITERIA_NOTICE}</p>
        </div>
      </div>
    </div>
  );
}

function QuestionList({ questions, speech }: { questions: BeiQuestion[]; speech: SpeechControls }) {
  return (
    <ol className="flex flex-col gap-5">
      {questions.map((question, index) => {
        const criterion = question.criterionId ? findBeiCriterion(question.criterionId) : undefined;
        return (
          <li key={question.id} data-testid={`question-${question.id}`} className="rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold">질문 {index + 1}</span>
              {criterion && (
                <span className="rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100">
                  확인하는 기준: {criterion.name}
                </span>
              )}
            </div>
            <div className="mt-2 flex items-start justify-between gap-3">
              <p className="font-medium leading-7">{question.question}</p>
              <SpeakButton speech={speech} speakKey={`q-${question.id}`} text={question.question} label={`질문 ${index + 1}`} />
            </div>
            <AnswerBlock answer={question.answer} questionId={question.id} />
            <ul className="mt-3 flex flex-col gap-3 border-l-2 border-zinc-300 pl-4 dark:border-zinc-700">
              {question.followUps.map((followUp, followIndex) => (
                <li key={followIndex} data-testid={`followup-${question.id}-${followIndex + 1}`} className="text-sm leading-6">
                  <div className="flex items-start justify-between gap-3">
                    <p>
                      <span className="font-bold">꼬리 질문 {index + 1}-{followIndex + 1}</span> {followUp.question}
                    </p>
                    <SpeakButton speech={speech} speakKey={`f-${question.id}-${followIndex}`} text={followUp.question} label={`꼬리 질문 ${index + 1}-${followIndex + 1}`} />
                  </div>
                  <p className="mt-0.5 text-zinc-600 dark:text-zinc-300">
                    <span className="font-medium">답변 방향</span> {followUp.answerDirection}
                    {followUp.missingInfo && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                        경험에서 확인되지 않음, 보완 필요
                      </span>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}

type Props = {
  items: ResultTabItem[];
  /** 만들기에 실패한 경험을 다시 만들 때 부른다. 저장한 결과에서는 넘기지 않는다. */
  onRetry?: (id: string) => void;
};

export default function BeiResultTabs({ items, onRetry }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = items.find((item) => item.id === activeId) ?? items[0];
  // 면접관 음성(nice): 질문을 한국어로 읽어 준다. 경험 탭을 바꾸면 읽던 것을 멈춘다.
  const speech = useSpeech();

  return (
    <div className="flex flex-col gap-4">
      <p data-testid="memorize-notice" className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700">
        그대로 외우지 말고 내 경험과 말투로 바꾸세요.
      </p>

      <VoiceBar speech={speech} />

      <div role="tablist" aria-label="경험" className="flex flex-wrap gap-2">
        {items.map((item) => {
          const selected = item.id === active?.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              data-testid={`tab-${item.id}`}
              onClick={() => {
                speech.stop();
                setActiveId(item.id);
              }}
              className={`rounded-full border px-3 py-1.5 text-sm ${selected ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900" : "border-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
            >
              {item.title}
              {item.result?.status === "loading" && " …"}
              {item.result?.status === "error" && " ⚠"}
            </button>
          );
        })}
      </div>

      {active && (
        <div role="tabpanel" className="flex flex-col gap-3">
          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">{active.summary}</p>

          {(!active.result || active.result.status === "loading") && (
            <p role="status" data-testid="result-loading" className="text-sm">
              질문과 모범 답변을 만드는 중입니다… (경험 하나에 30초 안팎 걸립니다)
            </p>
          )}

          {active.result?.status === "error" && (
            <div data-testid="result-error" role="alert" className="rounded-md border border-red-300 p-3 text-sm dark:border-red-700">
              <p className="font-medium text-red-600">{active.result.message}</p>
              {onRetry && (
                <button
                  type="button"
                  data-testid="result-retry"
                  onClick={() => onRetry(active.id)}
                  className="mt-2 rounded-md border border-zinc-400 px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  다시 시도 (AI 요청 1회)
                </button>
              )}
            </div>
          )}

          {active.result?.status === "done" && <QuestionList questions={active.result.questions} speech={speech} />}
        </div>
      )}
    </div>
  );
}
