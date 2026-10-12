"use client";

import { formatTime } from "../lib/reading-calculations";
import { taskDefinitions } from "../lib/reading-data";
import { getTaskCompletionPolicy, type ChildDataStatus } from "../lib/child-task-policy";
import type { AudioLaunch, TaskType } from "../lib/reading-types";
import type { CompletionRequestState } from "../lib/task-completion";
import type { AudioReturnState } from "../lib/audio-return";

export function TaskCompletionFeedback(props: {
  taskType: TaskType;
  launch?: AudioLaunch | null;
  completedCount: number;
  targetCount: number;
  dataStatus: ChildDataStatus;
  request?: CompletionRequestState;
  audioReturn?: AudioReturnState;
  onComplete: () => void;
  onRetry: () => void;
  onCheck: () => void;
  onRetryReturn: () => void;
}) {
  const task = taskDefinitions[props.taskType];
  const status = props.request?.status ?? "idle";
  const policy = getTaskCompletionPolicy({ ...props, hasAssignment: true, requestStatus: status });
  const returnError = props.audioReturn?.status === "error" || props.audioReturn?.status === "conflict";
  if (!policy.showFeedback && !returnError) return null;
  const launchLabel = props.taskType === "wordRead" ? "링크" : "오디오";
  return (
    <div className="return-box">
      <h4>{task.label} {task.needsAudio ? `${launchLabel} 실행 기록` : "완료 기록"}</h4>
      {task.needsAudio && props.launch && (
        <p className="task-meta">
          {launchLabel} 열기 {formatTime(props.launch.openedAt)} ·{" "}
          {props.launch.returnedAt ? `앱으로 돌아온 시간 ${formatTime(props.launch.returnedAt)}` : `${launchLabel} 탭을 열어두었습니다.`}
        </p>
      )}
      {props.dataStatus !== "ready" && <p role="status">{props.dataStatus === "error" ? "학습 기록을 불러오지 못했습니다." : "학습 기록을 불러오고 있습니다."}</p>}
      {props.request && "message" in props.request && <p role={status === "error" ? "alert" : "status"} aria-live="polite">{props.request.message}</p>}
      {returnError && <p role="alert">{props.audioReturn?.message} 수동 완료는 계속 저장할 수 있습니다.</p>}
      <div className="audio-actions">
        {policy.showButton && (
          <button className="primary-button" type="button" disabled={policy.disabled} onClick={props.onComplete}>
            {props.completedCount >= props.targetCount ? "완료됨" : `${props.completedCount + 1}회 완료`}
          </button>
        )}
        {props.dataStatus === "ready" && (status === "error" || status === "uncertain") && (
          <>
            <button className="secondary-button" type="button" onClick={props.onCheck}>저장 결과 확인</button>
            <button className="secondary-button" type="button" onClick={props.onRetry}>같은 요청 재시도</button>
          </>
        )}
        {props.dataStatus === "ready" && props.audioReturn?.status === "error" && (
          <button className="secondary-button" type="button" onClick={props.onRetryReturn}>복귀 시간 다시 저장</button>
        )}
      </div>
    </div>
  );
}
