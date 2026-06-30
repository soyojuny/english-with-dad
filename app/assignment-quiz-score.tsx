import { quizResultOptions } from "../lib/reading-data";
import type { QuizResult } from "../lib/reading-types";

type AssignmentQuizScoreProps = {
  assignmentId: string;
  score: QuizResult | null;
  onSave: (score: QuizResult) => void;
};

export function AssignmentQuizScore({
  assignmentId,
  score,
  onSave,
}: AssignmentQuizScoreProps) {
  return (
    <div
      className="task-row quiz-score-row"
      key={`${assignmentId}:${score ?? "empty"}`}
    >
      <div>
        <h4>퀴즈</h4>
        <p className="task-meta">아동 학습 결과를 PASS/FAIL로 선택하면 부모 활동 기록에 표시됩니다.</p>
      </div>
      <div className="task-actions quiz-result-actions" role="group" aria-label="퀴즈 결과 선택">
        {quizResultOptions.map((result) => (
          <button
            className={score === result ? "primary-button" : "secondary-button"}
            key={result}
            type="button"
            onClick={() => onSave(result)}
          >
            {result}
          </button>
        ))}
      </div>
    </div>
  );
}
