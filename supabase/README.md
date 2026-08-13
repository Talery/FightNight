# Supabase: verified daily

Техническая подготовка `0.6.0-r1`. Production-развёртывание выполняется только после beta-gate.

1. Применить `schema.sql` в новом или существующем проекте Supabase.
2. Развернуть `functions/verify-daily` с проверкой JWT, оставить `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` только в секретах функции.
3. Указать публичные `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY` при сборке клиента.
4. Проверить `GET /functions/v1/verify-daily`: день, seed и `rulesetVersion` должны совпадать у двух независимых клиентов.
5. Отправить валидный журнал и убедиться, что строка появилась в `verified_daily_runs`.
6. Повторить тот же запрос: вторая строка не создаётся.
7. Изменить `claimedScore`: запрос обязан завершиться `score-mismatch`.
8. Отключить backend: обычная кампания и локальный daily продолжают работать, результат остаётся `pending`.

Перед новой версией баланса создать новый `DAILY_RULESET_VERSION`. Старые результаты остаются привязаны к своей версии и сезону; несовместимые журналы функция не принимает.

Перед production-миграцией владелец проекта создаёт отдельный schema backup в уже существующую безопасную папку:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/backup-supabase.ps1 -ProjectRef <20-символьный-ref> -OutputPath D:\backups\fightnight-schema-before-release.sql
```

Скрипт требует явный project ref, не создаёт каталоги, не перезаписывает файл и печатает SHA-256 дампа. Дамп может содержать внутреннюю структуру проекта и не должен публиковаться автоматически.
