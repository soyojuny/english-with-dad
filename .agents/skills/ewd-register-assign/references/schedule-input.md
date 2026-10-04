# 배정 생성기 입력

이 JSON은 에이전트가 인식 결과와 확인된 DB ID로 임시 디렉터리에 작성한다.
부모에게 작성하게 하지 않는다. `first`/`second`는 확인된 첫째/둘째,
`reading`/`shadow`/`picture`는 읽기/정따/그림책이다.

```json
{
  "ownerUserId": "00000000-0000-0000-0000-000000000001",
  "startSunday": "2026-10-11",
  "weeks": 1,
  "bundles": [
    {
      "child": "second",
      "childId": "00000000-0000-0000-0000-000000000002",
      "purpose": "shadow",
      "bookIds": ["00000000-0000-0000-0000-000000000003"]
    }
  ]
}
```

예시 ID는 가짜이며 그대로 저장하지 않는다. 실제 ID는 소유 확인 후 입력한다.
`bookIds`는 부모의 책 순서다. 동시 2권은 앞에서부터 두 권씩 묶는다.
한 묶음에 필요한 1주/2주 책 수가 정확히 맞아야 한다. 책을 임의로 반복해서 채우거나
남는 책을 무시하지 않는다. 같은 책은 다른 아동의 묶음에서 재사용할 수 있다.

```bash
node .agents/skills/ewd-register-assign/scripts/plan-assignments.mjs /tmp/ewd-batch.json
node --test .agents/skills/ewd-register-assign/scripts/plan-assignments.test.mjs
```

출력은 `routineUpdatedAt`, `startSunday`, `endDate`(마지막 금요일), `weeks`,
`assignments`다. 각 행은 기존 DB 컬럼 이름을 사용한다. 출력은 저장 후보이며,
소유·링크·충돌 조회를 통과한 뒤 Supabase 도구로 저장한다. 이 스크립트는 SQL을
실행하거나 네트워크에 접속하지 않는다.
