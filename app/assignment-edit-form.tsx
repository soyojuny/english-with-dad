import type { FormEvent } from "react";
import { getAssignmentTaskCount, getEditableTasksForAssignment, sortTasks } from "../lib/reading-calculations";
import { taskCountOptions, taskDefinitions } from "../lib/reading-data";
import type { Assignment, Book, TaskType } from "../lib/reading-types";

type AssignmentEditFormProps = {
  assignment: Assignment;
  book: Pick<Book, "contentType">;
  onCancel: () => void;
  onSubmit: (assignment: Assignment, event: FormEvent<HTMLFormElement>) => void;
};

export function AssignmentEditForm({ assignment, book, onCancel, onSubmit }: AssignmentEditFormProps) {
  const editableTasks = sortTasks(
    getEditableTasksForAssignment(assignment, book),
  );
  const isCopyworkAssignment = assignment.tasks.includes("copywork");

  return (
    <form className="assignment-edit-form" onSubmit={(event) => onSubmit(assignment, event)}>
      <div className="assignment-count-row assignment-edit-counts">
        {editableTasks.map((taskType: TaskType) => (
          <label key={`${assignment.id}-${taskType}`} className="task-count-item">
            <span>{taskDefinitions[taskType].label}</span>
            <select
              name={`assignmentCount:${assignment.id}:${taskType}`}
              defaultValue={String(getAssignmentTaskCount(assignment, taskType))}
            >
              {taskCountOptions.map((count) => (
                <option value={count} key={`${assignment.id}-${taskType}-${count}`}>
                  {count === 0 ? "0회" : `${count}회`}
                </option>
              ))}
            </select>
          </label>
        ))}
        {!isCopyworkAssignment && (
          <label className="task-count-item">
            <span>퀴즈</span>
            <select name={`assignmentQuiz:${assignment.id}`} defaultValue={assignment.quizEnabled ? "Y" : "N"}>
              <option value="N">N</option>
              <option value="Y">Y</option>
            </select>
          </label>
        )}
      </div>
      <div className="form-actions assignment-edit-actions">
        <button className="ghost-button assignment-action-button" type="button" onClick={onCancel}>
          취소
        </button>
        <button className="primary-button assignment-action-button" type="submit">
          횟수 저장
        </button>
      </div>
    </form>
  );
}
