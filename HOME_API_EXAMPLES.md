# Home API Examples

```bash
curl "http://localhost:3000/api/home"
```

```bash
curl "http://localhost:3000/api/home?topN=10&chartPoints=7"
```

브라우저 코드 예시:

```ts
const response = await fetch("/api/home?topN=50&chartPoints=12", {
  next: { revalidate: 60 },
});

if (!response.ok) throw new Error("홈 데이터 로드 실패");

const payload = await response.json();
```
