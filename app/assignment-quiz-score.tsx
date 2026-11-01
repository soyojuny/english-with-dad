import { useState } from "react";
import { quizResultOptions } from "../lib/reading-data";
import type { QuizResult } from "../lib/reading-types";

type AssignmentQuizScoreProps = {
  assignmentId: string;
  score: QuizResult | null;
  points?: number | null;
  onSave: (score: QuizResult, points: number | null) => void;
};

export function AssignmentQuizScore({
  assignmentId,
  score,
  points,
  onSave,
}: AssignmentQuizScoreProps) {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <form
      className="task-row quiz-score-row"
      onSubmit={(event) => event.preventDefault()}
    >
      <div>
        <h4>퀴즈</h4>
        <p className="task-meta">점수를 입력한 뒤 PASS/FAIL을 선택하면 부모 활동 기록에 함께 저장됩니다.</p>
      </div>
      <div className="quiz-input-controls">
        <label htmlFor={`quiz-points-${assignmentId}`}>
          점수 (선택)
          <input
            id={`quiz-points-${assignmentId}`}
            type="number"
            min="0"
            max="100"
            step="1"
            placeholder="0~100"
            value={draft ?? String(points ?? "")}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <div className="task-actions quiz-result-actions" role="group" aria-label="퀴즈 결과 선택">
          {quizResultOptions.map((result) => (
            <button
              className={score === result ? "primary-button" : "secondary-button"}
              key={result}
              type="button"
              onClick={(event) => {
                if (!event.currentTarget.form?.reportValidity()) return;
                const value = draft ?? String(points ?? "");
                onSave(result, value === "" ? null : Number(value));
              }}
            >
              {result}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
