// Design Ref: §2.1 화면 지도 /privacy — 무엇을 저장하고 무엇을 AI로 보내는지 설명한다. (PRD 7번)
import type { Metadata } from "next";
import ConsentStatus from "@/components/ConsentStatus";

export const metadata: Metadata = {
  title: "개인정보 안내 | 은행 면접도우미 A to Z",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 leading-7">
      <h1 className="text-2xl font-bold">개인정보 안내</h1>

      <section>
        <h2 className="text-lg font-bold">로그인과 서버 저장이 없습니다</h2>
        <p className="mt-1 text-zinc-700 dark:text-zinc-300">
          이 앱은 회원가입이나 로그인을 요구하지 않습니다. 입력한 내용과 결과는 이 앱의 서버에 저장하지 않고, 사용하는 브라우저에만
          저장합니다.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold">내 브라우저에 저장하는 것</h2>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-zinc-700 dark:text-zinc-300">
          <li>BEI 면접 결과(질문·답변). 자기소개서 원문은 저장하지 않으며, 결과는 최대 5개까지 보관합니다.</li>
          <li>AI 리터러시 시험 진행(입력한 답, 남은 토큰·질문 횟수, 열어 본 파일, 대화 기록)과 시험 결과</li>
          <li>AI 전달 동의 여부</li>
        </ul>
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">
          화면 맨 아래의 &quot;내 저장 데이터 모두 삭제&quot; 버튼으로 언제든 지울 수 있습니다. 시크릿 모드처럼 저장이 막힌
          브라우저에서는 저장되지 않고, 화면을 보는 동안에만 유지됩니다.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold">AI 서비스로 보내는 것</h2>
        <p className="mt-1 text-zinc-700 dark:text-zinc-300">
          질문과 답변을 만들거나 AI 어시스트·토론 의견을 만들 때, 입력한 내용이 AI 서비스(OpenAI)로 전달됩니다. 처음 사용할 때
          한 번 동의를 받습니다. 이 앱의 서버는 받은 내용을 저장하거나 기록으로 남기지 않지만, AI 서비스 쪽에서는 해당 서비스의
          정책에 따라 처리될 수 있습니다.
        </p>
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">
          BEI 면접에서는 자기소개서의 연락처·주민등록번호·이메일을 자동으로 가리고, AI로 보내기 전에 가려진 결과를 직접 확인할 수
          있게 합니다. 이름·학교명처럼 자동으로 가리기 어려운 정보는 직접 가리고 입력해 주세요.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold">연습용 자료에 대해</h2>
        <p className="mt-1 text-zinc-700 dark:text-zinc-300">
          AI 리터러시 연습 문제와 파일은 실제 시험 자료가 아니라 직접 만든 가상 자료입니다.
        </p>
      </section>

      <section className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-2 text-lg font-bold">내 동의 상태</h2>
        <ConsentStatus />
      </section>
    </main>
  );
}
