# Docker Setup Guide

## Быстрый старт

### Требования
- Docker (https://www.docker.com/products/docker-desktop)
- Docker Compose (обычно идет с Docker Desktop)

### 1. Сборка и запуск всех сервисов

```bash
docker-compose up --build
```

Это запустит:
- **PostgreSQL** на порту 5432
- **MinIO** на портах 9000 (API) и 9001 (Console)
- **Backend** на порту 8000
- **Frontend** на порту 5173

### 2. Проверка статуса

```bash
docker-compose ps
```

Все контейнеры должны быть в статусе "running".

### 3. Доступ к приложению

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **MinIO Console**: http://localhost:9001
  - Username: `minioadmin`
  - Password: `minioadmin`

---

## Работа с контейнерами

### Остановка сервисов
```bash
docker-compose down
```

### Полная очистка (удалить volumes)
```bash
docker-compose down -v
```

### Просмотр логов
```bash
# Все сервисы
docker-compose logs -f

# Конкретный сервис
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
docker-compose logs -f minio
```

### Запуск bash в контейнере
```bash
# Backend
docker-compose exec backend bash

# Frontend
docker-compose exec frontend sh

# PostgreSQL
docker-compose exec postgres psql -U postgres -d retiree_help
```

---

## Переменные окружения

Основные переменные определены в `docker-compose.yml`:

- **DATABASE_URL**: PostgreSQL connection string
- **S3_ENDPOINT**: MinIO endpoint (используется `minio:9000` для внутридокеровского общения)
- **VITE_API_URL**: Frontend API URL (используется `http://localhost:8000` для браузера)

Для изменения переменных отредактируйте `docker-compose.yml` или создайте `.env` файл.

---

## Инициализация БД

Миграции автоматически применяются при запуске backend контейнера благодаря команде:
```bash
alembic upgrade head && uvicorn ...
```

Если нужно сделать новую миграцию:
```bash
docker-compose exec backend alembic revision --autogenerate -m "migration name"
```

---

## Инициализация MinIO bucket

Bucket `retiree-help` создается автоматически при первом запуске backend благодаря коду в `src.backend.database`:
```python
s3_manager.init_bucket()
```

---

## Проблемы и решения

### Порты уже заняты
Если видите ошибку типа "port already in use", измените порты в `docker-compose.yml`:

```yaml
services:
  backend:
    ports:
      - "8001:8000"  # меняем 8000 на 8001
```

### Frontend не может подключиться к backend
Убедитесь, что `VITE_API_URL` в `docker-compose.yml` указывает на правильный хост и порт.

### PostgreSQL не инициализируется
Проверьте логи:
```bash
docker-compose logs postgres
```

Если проблемы, удалите volume и пересоздайте:
```bash
docker-compose down -v
docker-compose up --build
```

---

## Development mode

Для development с live reload:

### Backend
Измените `Dockerfile.backend` для использования uvicorn в reload mode:
```dockerfile
CMD ["uvicorn", "src.backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

### Frontend
Используйте Vite в development mode. Обновите `Dockerfile.frontend`:
```dockerfile
# Development stage
FROM node:20-alpine

WORKDIR /app

COPY src/frontend/package*.json ./
RUN npm install

COPY src/frontend/ .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

Затем запустите:
```bash
docker-compose up
```

---

## Production deployment

Перед выгрузкой в production:

1. **Измените JWT_SECRET** в `docker-compose.yml` на что-то безопасное
2. **Используйте переменные окружения** вместо hardcoded значений
3. **Создайте `.env` файл** и добавьте его в `.gitignore`
4. **Используйте healthchecks** (уже в `docker-compose.yml`)
5. **Настройте nginx reverse proxy** перед приложением
6. **Используйте managed PostgreSQL и S3** вместо локальных сервисов

---

## Структура Dockerfiles

### Dockerfile.backend
- Базовый образ: `python:3.12-slim`
- Установка зависимостей из `pyproject.toml`
- Запуск миграций и uvicorn сервера
- Volume для быстрых изменений исходного кода

### Dockerfile.frontend
- Multi-stage build для оптимизации размера образа
- Builder stage: установка зависимостей и сборка Vite
- Production stage: serve готового приложения
- Expose port 5173 для Vite dev server или 5173 для serve

---

## Сетевые ссылки между контейнерами

Внутри Docker сети контейнеры могут обращаться друг к другу по имени сервиса:

- Backend к PostgreSQL: `postgresql://postgres:postgres@postgres:5432/retiree_help`
- Backend к MinIO: `http://minio:9000`
- Frontend к Backend: `http://backend:8000` (внутри контейнера) или `http://localhost:8000` (из браузера)
