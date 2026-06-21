type AssignmentQuizScoreProps = {
  assignmentId: string;
  score: number | null;
  onSave: (score: number) => void;
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
        onSave(Number(formData.get("quizScore")));
      }}
    >
      <div>
        <h4>퀴즈</h4>
        <p className="task-meta">책 퀴즈 점수를 입력하면 부모 활동 기록에 표시됩니다.</p>
      </div>
      <div className="task-actions">
        <label>
          <span className="visually-hidden">퀴즈 점수</span>
          <input
            name="quizScore"
            type="number"
            min="0"
            max="100"
            step="1"
            defaultValue={score ?? ""}
            placeholder="점수"
            required
          />
        </label>
        <button className="primary-button" type="submit">
          {score === null ? "점수 저장" : "점수 수정"}
        </button>
      </div>
    </form>
  );
}
