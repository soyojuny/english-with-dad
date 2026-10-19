# 합성 QR 이미지

개인정보와 외부 요청이 없는 테스트 데이터다. Python `qrcode==8.2`의
error correction M, 자동 version, 6px module, 4-module border로 생성한 grayscale PNG다.
테스트 실행에 Python이나 QR 생성기 설치는 필요하지 않다.

- `qr-url.png`: `  https://example.com/reading-audio  ` (앞뒤 공백 각각 2개)
- `qr-inverted.png`: 같은 값의 흑백 반전
- `qr-text.png`: `not a URL` (QR 판독과 URL 검증의 경계를 구별)

PNG는 QR matrix를 각 방향으로 6배 반복한 8-bit grayscale 픽셀이다.
브라우저 테스트는 실제 canvas와 운영 jsQR를 사용해 위 원문/trim 계약을 확인한다.
