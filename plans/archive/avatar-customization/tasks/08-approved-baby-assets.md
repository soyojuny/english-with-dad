# 승인된 아기 드래곤 원화 확정 이관

상태: 이관·검증 완료. 사용자 확정: 알 부화 후 아기와 속성별 모습은 다른 탭에서 승인한 original-cutouts를 사용한다.

- `baby/original-cutouts/`의 neutral·fire·lightning·ice·blink·breathe PNG 6장을 `assets/dragons/source/baby/`로 승격한다.
- 정식 PNG는 원본과 바이트 단위로 동일한 2048×2048, 알파 포함 파일이다. 자르거나 구도·색을 다시 생성하지 않는다.
- `npm run assets:dragons` 및 build의 prebuild로 배포용 WebP를 재생성한다. lightning은 기존 앱 속성 계약에 맞춰 thunder.webp로 대응한다.
- 기존 연결대로 0일 알, 1~17일 아기, 속성 선택 전 neutral·선택 후 fire/thunder/ice를 표시한다. 성장 규칙·DB·움직임 재생 설정은 변경하지 않는다.
- 새 이미지가 기존 캐시에 가려지지 않게 SW v5와 manifest 설명·정적 검사·관련 하네스/브라우저 기대값을 갱신한다.
- 원본·출력 바이트/알파, 전체 verify, 기존 드래곤 브라우저, 실제 Next/PWA와 SW 하네스를 확인한다.

웹 서버 배포·커밋·푸시는 포함하지 않는다. 계획 폴더의 제작 이력은 보존하지만 앱 빌드는 정식 원본만 읽는다.

검증: 정식 PNG 6장 모두 승인본과 바이트 동일·2048×2048·알파 포함, WebP 6장 모두 1024×1024·알파 포함 확인. 전체 verify(단위 311개·타입·이미지 생성·프로덕션 빌드), 드래곤 브라우저 7개, 실제 Next/PWA 4개, SW/정적 검사 하네스 34개 통과. 1280px 앱 캡처를 직접 확인하고 데스크톱/390px 캡처를 갱신했다. PWA v4 삭제·v5 활성화를 검사했다.
