# Quản lý báo cáo

Website quản lý báo cáo dạng bảng linh hoạt (cột do user định nghĩa), tối ưu giao diện di động.

- **Frontend:** React + Vite (SPA tĩnh, build được lên GitHub Pages)
- **Backend:** Fastify + PostgreSQL
- **State:** Zustand (cập nhật RAM ngay, ghi DB nền debounce 250ms)
- **Local:** toàn bộ chạy bằng Docker Compose

## Chạy local

Yêu cầu: Docker Desktop đã cài và đang chạy.

```bash
docker compose up --build
```

Mở trình duyệt: [http://localhost:8080](http://localhost:8080)

Dịch vụ:

| Service  | Vai trò              |
|----------|----------------------|
| frontend | Nginx + SPA, port 8080 |
| backend  | API Fastify          |
| db       | PostgreSQL 16        |

Dừng:

```bash
docker compose down
```

Xóa luôn dữ liệu DB:

```bash
docker compose down -v
```

## Build lại từng service

Chạy các lệnh sau từ thư mục gốc project.

Chỉ frontend (sau khi sửa giao diện):

```bash
docker compose up --build -d frontend
```

Chỉ backend:

```bash
docker compose up --build -d backend
```

Chỉ build image, chưa khởi động lại container:

```bash
docker compose build frontend
```

Build xong rồi restart frontend:

```bash
docker compose build frontend && docker compose up -d frontend
```

Sau khi build frontend, mở lại [http://localhost:8080](http://localhost:8080). Nếu trình duyệt vẫn hiện bản cũ, thử hard refresh (Ctrl+F5).

## GitHub Pages

Frontend build ra static files. GitHub Pages **không** chạy API/Postgres, nên cần trỏ `VITE_API_BASE` tới API public (nếu có), hoặc chỉ dùng bản local Docker để có đủ tính năng.

Ví dụ build cho repo `username/report-importer`:

```bash
cd frontend
VITE_BASE=/report-importer/ VITE_API_BASE=https://your-api.example.com npm run build
```

Thư mục `frontend/dist` deploy lên GitHub Pages.

## Mô hình dữ liệu (tóm tắt)

- Cột: `Date` | `FlexNumber` | `SummaryColumn` (tích các cột FlexNumber trong `parts`)
- `row.values` chỉ chứa ô Date + FlexNumber; SummaryColumn tính riêng
- Cột chính (`primaryColumnIndex`) bắt buộc lúc tạo, không sửa sau
- Splitter mặc định `"hết"`, lưu trong bảng `settings`
 