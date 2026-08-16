# Supabase: verified daily

Техническая подготовка `0.6.0-r1`. Production-развёртывание выполняется только после beta-gate.

1. Применить `schema.sql` в новом или существующем проекте Supabase. Скрипт явно выдаёт минимальные Data API grants для `anon`/`authenticated`, потому что новые проекты больше не публикуют таблицы автоматически.
2. Развернуть `functions/verify-daily` с проверкой JWT, оставить `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` только в секретах функции.
   Перед деплоем выполнить `npm run build:functions`: команда создаёт самодостаточный replay-бандл в `functions/verify-daily/_shared/`, совместимый с серверным Deno bundler.
3. В GitHub создать repository variable `SUPABASE_URL` и Actions secret `SUPABASE_ANON_KEY`. Pages workflow передаёт их сборке как публичные клиентские `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`. Никогда не добавлять service-role/secret key в GitHub Pages или клиентскую сборку.
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
