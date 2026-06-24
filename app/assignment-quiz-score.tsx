type AssignmentQuizScoreProps = {
  assignmentId: string;
  score: string | null;
  onSave: (score: string) => void;
};

export function AssignmentQuizScore({
  assignmentId,
  score,
  onSave,
}: AssignmentQuizScoreProps) {
  return (
    <form
      className="task-row quiz-score-row"
      key={`${assignmentId}:${score ?? "empty"}`}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        onSave(String(formData.get("quizScore") ?? ""));
      }}
    >
      <div>
        <h4>퀴즈</h4>
        <p className="task-meta">책 퀴즈 결과를 입력하면 부모 활동 기록에 표시됩니다.</p>
      </div>
      <div className="task-actions">
        <label>
          <span className="visually-hidden">퀴즈 결과</span>
          <input
            name="quizScore"
            type="text"
            defaultValue={score ?? ""}
            placeholder="100점, PASS"
            maxLength={40}
            required
          />
        </label>
        <button className="primary-button" type="submit">
          {score === null ? "결과 저장" : "결과 수정"}
        </button>
      </div>
    </form>
  );
}
