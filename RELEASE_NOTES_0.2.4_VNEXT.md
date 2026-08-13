# Пепельный Круг — 0.2.4 vNext RC

Кандидат объединяет этапы Combat 2.5, mobile combat, обучение, идентичность билдов, память мира, разбор забега и техническую подготовку verified daily.

## Для игрока

- читаемые паттерны и история намерений врага, разведка и контригра;
- мобильный боевой HUD и управление клавиатурой;
- безопасное трёхшаговое обучение с пропуском и повтором;
- клятвы, видимые синергии, направленные награды и salvage;
- Немезиды, цепочки решений, отношения NPC и последствия прошлых походов;
- разбор победы или смерти с причиной, зонами, источниками урона и стилем билда;
- очень крупный текст, высокий контраст, reduced motion и сохраняемые настройки;
- offline-first PWA и неподписанный Windows portable.

## Надёжность

- save format v18 с последовательными миграциями v1–v18, backup и checksum export/import;
- RunSummary schema v2 без скрытой сетевой телеметрии;
- deterministic engine и 1 000/1 000 завершённых автоматических походов без softlock;
- production PWA gate проверяет manifest, service worker, precache, save в IndexedDB и offline reload;
- responsive E2E на 360/390/768/1280/1920 px и полный жизненный цикл героя;
- замороженный RC-контракт и release budget 12 MB / 450 KB largest JS chunk.

## Онлайн

Протокол `0.6.0-r1` готовит server-issued daily seed, allowlist-журнал действий, deterministic Edge replay, SHA-256 idempotency, rate/size limits и отдельные verified daily/season таблицы. Production deployment не входит в этот локальный кандидат до закрытия beta-gate.

## Не входит в готовность 1.0

Внешняя beta, production Supabase, домен/HTTPS, hosted update smoke, реальные beta-сохранения, художественная приёмка и коммерческая подпись Windows. Актуальный перечень: [KNOWN_ISSUES.md](./KNOWN_ISSUES.md).
