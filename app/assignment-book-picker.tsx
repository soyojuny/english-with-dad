import type { Book } from "../lib/reading-types";
import {
  activityCategoryOrder,
  bookContentTypeLabels,
  getAvailableActivityCategories,
  isWordReadingMaterial,
  sortTasks,
} from "../lib/reading-calculations";
import {
  activityCategoryDefinitions,
  taskCountOptions,
  taskDefinitions,
} from "../lib/reading-data";

type AssignmentBookPickerProps = {
  candidates: Book[];
  selectedBooks: Book[];
  assignedBookIds: Set<string>;
  seriesNames: string[];
  seriesFilter: string;
  search: string;
  childName: string;
  onSeriesFilterChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onAdd: (bookId: string) => void;
  onRemove: (bookId: string) => void;
};

export function AssignmentBookPicker({
  candidates,
  selectedBooks,
  assignedBookIds,
  seriesNames,
  seriesFilter,
  search,
  childName,
  onSeriesFilterChange,
  onSearchChange,
  onAdd,
  onRemove,
}: AssignmentBookPickerProps) {
  const hasSearch = Boolean(search.trim());

  return (
    <>
      <fieldset className="wide book-picker">
        <legend>배정할 책/자료 선택</legend>
        <div className="assignment-picker-heading">
          <div>
            <strong>{hasSearch ? "검색 결과" : "아직 배정하지 않은 책"}</strong>
            <p className="task-meta">
              {hasSearch
                ? "이미 배정한 책도 검색해서 다시 추가할 수 있습니다."
                : `최근 등록된 미배정 책을 최대 10권 표시합니다. ${childName} 기준입니다.`}
            </p>
          </div>
          <span className="summary-pill">
            <strong>{selectedBooks.length}</strong>권 선택
          </span>
        </div>
        <div className="library-tools">
          <select
            value={seriesFilter}
            aria-label="배정 시리즈 선택"
            onChange={(event) => onSeriesFilterChange(event.target.value)}
          >
            <option value="all">전체 시리즈</option>
            {seriesNames.map((series) => (
              <option value={series} key={series}>
                {series}
              </option>
            ))}
          </select>
          <input
            value={search}
            type="search"
            placeholder="책/자료 제목, 시리즈, 권수, 레벨 검색"
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        <div className="assignment-candidate-list">
          {candidates.map((book) => {
            const hasAssignmentHistory = assignedBookIds.has(book.id);
            return (
              <article className="assignment-candidate" key={book.id}>
                <div>
                  <p className="assignment-book-title">
                    <span className="status-badge">{bookContentTypeLabels[book.contentType]}</span>
                    {book.title}
                  </p>
                  <p className="task-meta">
                    {[book.series, book.volume, book.level].filter(Boolean).join(" · ")}
                  </p>
                  <div className="status-row">
                    <span className={`status-badge ${hasAssignmentHistory ? "" : "done"}`}>
                      {hasAssignmentHistory ? "배정 이력 있음" : "미배정"}
                    </span>
                  </div>
                </div>
                <button className="secondary-button" type="button" onClick={() => onAdd(book.id)}>
                  추가
                </button>
              </article>
            );
          })}
        </div>
        {!candidates.length && (
          <div className="empty-state">
            {hasSearch
              ? "검색 조건에 맞는 책/자료가 없습니다."
              : "이 아동에게 아직 배정하지 않은 책/자료가 없습니다. 검색해서 기존 책을 다시 추가할 수 있습니다."}
          </div>
        )}
      </fieldset>

      <fieldset className="wide book-picker">
        <legend>선택한 책/자료 활동 설정</legend>
        <div className="assignment-book-config-list">
          {selectedBooks.map((book) => {
            const categoryOptions = getAvailableActivityCategories(book);
            const taskOptions = sortTasks([
              ...new Set(
                categoryOptions.flatMap(
                  (activityCategory) => activityCategoryDefinitions[activityCategory].tasks,
                ),
              ),
            ]);
            const isWordReading = isWordReadingMaterial(book);

            return (
              <section className="assignment-book-config" key={book.id}>
                <div className="assignment-book-main">
                  <p className="assignment-book-title">
                    <span className="status-badge">{bookContentTypeLabels[book.contentType]}</span>
                    {book.series} · {book.title}
                    {book.level ? ` · ${book.level}` : ""}
                  </p>
                  <button
                    className="ghost-button assignment-remove-button"
                    type="button"
                    onClick={() => onRemove(book.id)}
                  >
                    선택 해제
                  </button>
                  <label className="assignment-category-field">
                    <span>활동 구분</span>
                    <select name={`assignCategory:${book.id}`} defaultValue={isWordReading ? "extraStudy" : ""}>
                      {!isWordReading && <option value="">선택 안 함</option>}
                      {activityCategoryOrder
                        .filter((activityCategory) => categoryOptions.includes(activityCategory))
                        .map((activityCategory) => (
                          <option value={activityCategory} key={`${book.id}-${activityCategory}`}>
                            {activityCategoryDefinitions[activityCategory].label}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
                <div className="assignment-count-row">
                  {taskOptions.map((taskType) => (
                    <label key={`${book.id}-${taskType}`} className="task-count-item">
                      <span>{taskDefinitions[taskType].label}</span>
                      <select
                        name={`assignCount:${book.id}:${taskType}`}
                        defaultValue={taskType === "listen" || taskType === "wordRead" ? "1" : "0"}
                      >
                        {taskCountOptions.map((count) => (
                          <option value={count} key={`${book.id}-${taskType}-${count}`}>
                            {count === 0 ? "0회" : `${count}회`}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <p className="task-meta">
                  {isWordReading
                    ? "단어 읽기 자료는 기타학습 · 단어 읽기로 저장됩니다."
                    : "영어 그림책을 선택하면 읽기 1회로 저장됩니다."}
                </p>
              </section>
            );
          })}
        </div>
        {!selectedBooks.length && <div className="empty-state">위 목록에서 배정할 책/자료를 추가하세요.</div>}
      </fieldset>
    </>
  );
}
