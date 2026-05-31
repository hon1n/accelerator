/**
 * Тестовый «бекенд» для задач: реализует тот же контракт, что и `tasksService`,
 * но работает полностью в памяти браузера. Полезен для прототипирования вёрстки
 * без поднятого Go-сервиса.
 *
 * Включение: VITE_USE_MOCK_TASKS=true в .env (требуется перезапуск Vite).
 *
 * Поведение прогрессии: каждый вызов getStatus() при включённом моке
 * автоматически продвигает задачу по конвейеру, как только истечёт небольшой
 * таймер. Так UI обработки/очереди легко проверить.
 */

import { ApiError } from "./api.types";
import type {
  EditTaskRequest,
  TaskDto,
  TaskStatus,
  TaskStatusResponse,
  TasksListResponse,
  UploadTaskData,
  UploadTaskResponse,
} from "./tasks.types";

export const USE_MOCK_TASKS =
  String(import.meta.env.VITE_USE_MOCK_TASKS ?? "").toLowerCase() === "true";

// ----- параметры эмуляции прогресса (в миллисекундах) -----
// Поллинг идёт раз в 5 с (см. STATUS_POLL_INTERVAL_MS в stores/tasks.ts), поэтому
// этих порогов достаточно, чтобы при каждом тике статус продвигался на один шаг.
// Итого 9 переходов × ~5 с ≈ 45 секунд от загрузки до «Готово» — комфортный темп
// для демо-видео: каждый этап успевает быть виден.
const PENDING_DURATION_MS = 2_000;
const PROCESSING_DURATION_MS = 4_000;

// ----- порядок прохождения этапов конвейера -----
const PIPELINE: TaskStatus[] = [
  "processing_upload",
  "pending_denoise",
  "processing_denoise",
  "pending_diarize",
  "processing_diarize",
  "pending_transcribe",
  "processing_transcribe",
  "pending_summarize",
  "processing_summarize",
  "done",
];

interface MockTask extends TaskDto {
  /** Когда задача перешла в текущий статус (для эмуляции прогрессии) */
  _stageStartedAt: number;
}

const STORE: MockTask[] = [];

// ============================== ТЕСТОВЫЕ ДАННЫЕ ==============================

/** Конспект квартального планирования продаж — для основной демо-задачи. */
const SUMMARY_SALES_OKR = `# Итоги встречи

**Дата:** 25 мая 2026
**Участники:** Анна Соколова (РОП), Дмитрий Орлов (CCO), Михаил Карелин (Head of CS), Елена Ткачёва (Marketing Lead), Олег Васин (Sales Ops)

## Ключевые решения

1. **План на Q3 утверждён** в объёме **42 млн ₽** выручки — это +18% к Q2. Ответственная — Анна Соколова, декомпозиция по менеджерам — до 5 июня.
2. **Запускаем Enterprise-направление** отдельным сегментом. До 1 июля Дмитрий формирует команду: два менеджера и один pre-sale.
3. **Сокращаем цикл сделки** в SMB до 14 дней (сейчас 23). Внедряем чек-лист квалификации на этапе SQL и автоматизацию писем-напоминаний — Олег готовит к 8 июня.
4. **Маркетинг переориентируется** на верхнюю часть воронки: к 10 июня готовы три лид-магнита и серия из четырёх вебинаров.

## OKR на третий квартал

- **O1: увеличить долю Enterprise-сегмента в выручке до 35%**
  - KR1: подписать минимум 5 контрактов от 1 млн ₽
  - KR2: пайплайн Enterprise — не менее 80 млн ₽ к концу квартала
  - KR3: средний чек по сегменту — 1.4 млн ₽
- **O2: повысить эффективность работы с входящими лидами**
  - KR1: SLA первого ответа — меньше 30 минут
  - KR2: конверсия MQL → SQL — 28%
  - KR3: цикл сделки в SMB — не больше 14 дней

## Открытые вопросы

- Нужна ли отдельная BI-витрина по Enterprise — решим на следующей синхронизации.
- Бюджет на ABM-кампании — Елена готовит обоснование к четвергу.
- Кто ведёт клиента «Атлас» — Дмитрий и Михаил договариваются отдельно.

## Следующие шаги

- Декомпозиция OKR по сотрудникам — до **5 июня**
- Запуск чек-листа квалификации — до **8 июня**
- Промежуточная сверка по KR — **20 июня, 11:00**`;

const TRANSCRIPT_SALES_OKR = [
  {
    speaker: "Анна Соколова",
    timestamp: "00:00:12",
    text: "Коллеги, всем привет. Давайте начнём. Сегодня у нас планирование третьего квартала: разбираем итоги Q2, защищаем цели и фиксируем OKR. Постараюсь уложиться в час, у нас плотная повестка.",
  },
  {
    speaker: "Анна Соколова",
    timestamp: "00:00:41",
    text: "По итогам Q2 закрыли план на 91 процент. Это, конечно, не та цифра, на которую мы рассчитывали в апреле, но с учётом провала в мае — приемлемо. Дим, расскажи коротко, что произошло в мае?",
  },
  {
    speaker: "Дмитрий Орлов",
    timestamp: "00:01:08",
    text: "Если коротко — у нас сорвались две крупные сделки в Enterprise. По одной клиент перенёс бюджет на четвёртый квартал, по второй мы проиграли тендер. Плюс новый поток лидов из платных каналов оказался слабее по качеству, чем в апреле, и SDR просто не успели их переварить.",
  },
  {
    speaker: "Елена Ткачёва",
    timestamp: "00:02:15",
    text: "Тут добавлю. По платному трафику мы видели падение качества начиная со второй недели мая. Похоже, выгорела связка, которая хорошо работала весь Q1. Сейчас перезапускаем кампании с новыми креативами и сегментацией по индустриям.",
  },
  {
    speaker: "Анна Соколова",
    timestamp: "00:03:02",
    text: "Хорошо. Тогда переходим к Q3. Я предлагаю поставить план в 42 миллиона. Это плюс 18 процентов к Q2 и плюс 9 к нашему изначальному годовому таргету. Возражения есть?",
  },
  {
    speaker: "Михаил Карелин",
    timestamp: "00:03:35",
    text: "С точки зрения CS — поддерживаю, но я бы хотел, чтобы апсейлы по текущим клиентам зашли в общий план продаж. Иначе у моей команды не будет мотивации помогать с расширениями.",
  },
  {
    speaker: "Анна Соколова",
    timestamp: "00:04:01",
    text: "Согласна. Заведём отдельной строкой апсейл, посчитаем долю — обсудим с финансами. Олег, возьми, пожалуйста, на себя.",
  },
  {
    speaker: "Олег Васин",
    timestamp: "00:04:18",
    text: "Понял, до пятницы прикину модель. По циклу сделки — у нас в SMB средняя 23 дня, при этом медиана 17. То есть тянут наверх несколько долгих сделок. Если введём чек-лист квалификации и автоответы по тишине, можно реально снизить до 14.",
  },
  {
    speaker: "Дмитрий Орлов",
    timestamp: "00:05:07",
    text: "По Enterprise: давайте честно — без выделенной команды мы туда не залезем. Я предлагаю двух менеджеров перевести с SMB и нанять одного pre-sale. Под это уже есть кандидаты, две недели на онбординг.",
  },
  {
    speaker: "Анна Соколова",
    timestamp: "00:05:48",
    text: "Хорошо, согласна. Запускаем Enterprise как отдельный сегмент с первого июля. Дима — твой блок ответственности. Цель по доле в выручке — 35 процентов к концу квартала.",
  },
  {
    speaker: "Елена Ткачёва",
    timestamp: "00:06:30",
    text: "С нашей стороны: к десятому июня готовим три лид-магнита под Enterprise — отраслевые исследования по логистике, ритейлу и финтеху. Плюс четыре вебинара с интеграторами. По бюджету я подготовлю отдельное обоснование к четвергу.",
  },
  {
    speaker: "Анна Соколова",
    timestamp: "00:07:14",
    text: "Окей. Давайте зафиксирую OKR. Цель один — увеличить долю Enterprise в выручке до 35 процентов. Ключевые результаты: пять контрактов от миллиона, пайплайн 80 миллионов, средний чек 1.4. Цель два — поднять эффективность работы с входящими: SLA меньше 30 минут, конверсия MQL в SQL 28 процентов, цикл сделки в SMB не больше 14 дней. Все согласны?",
  },
  {
    speaker: "Михаил Карелин",
    timestamp: "00:08:02",
    text: "Согласен. По SLA только уточню — это рабочие часы или календарные? Иначе у нас ночные обращения завалят метрику.",
  },
  {
    speaker: "Анна Соколова",
    timestamp: "00:08:18",
    text: "Рабочие, с 9 до 21 по Москве. Олег зафиксирует в правилах. Тогда финальный шаг — декомпозиция по сотрудникам до пятого июня и промежуточная сверка двадцатого. Спасибо всем, расходимся.",
  },
];

/** Конспект ретроспективы спринта. */
const SUMMARY_SPRINT_RETRO = `# Ретроспектива спринта №14

**Период:** 12–23 мая 2026
**Команда:** Платформа (8 человек), фасилитатор — Игорь Самохин

## Что получилось

- Закрыли все обязательства по миграции на новый раннер CI — пайплайны стали быстрее в среднем на 38%.
- Внедрили автоматический rollback в деплое staging — за неделю сработал дважды и оба раза корректно.
- Команда успела сделать незапланированный фикс утечки памяти в воркере транскрибации (заняло около дня).

## Что пошло не так

- Две задачи перешли в следующий спринт: интеграция с метриками Prometheus и фронтовая часть страницы статуса.
- Был инцидент в среду: сломали доступ к S3 на 12 минут из-за отзыва старого IAM-ключа без предупреждения. Postmortem уже написан.
- Парная работа на ревью практически не происходит: ревью часто висят по 2–3 дня.

## Что улучшаем

1. Разбиваем задачу с метриками на три сабтаска — Игорь делает декомпозицию к понедельнику.
2. Вводим правило: PR без активности 24 часа автоматически попадает в дайджест в общий канал.
3. Правила ротации IAM-ключей выносим в плейбук SRE — Артём ответственный.

## Настроение команды

Средняя оценка спринта — **7.4/10**. Самые частые комментарии: «было ровно», «много мелочи, мало флоу». Договорились в следующем спринте оставить один день в неделю без встреч.`;

const TRANSCRIPT_SPRINT_RETRO = [
  {
    speaker: "Игорь Самохин",
    timestamp: "00:00:08",
    text: "Привет всем. Стартуем ретро по четырнадцатому спринту. Формат стандартный: что зашло, что пошло не так, что улучшаем. У каждого по две минуты, потом обсуждаем повторяющееся.",
  },
  {
    speaker: "Артём Бакулин",
    timestamp: "00:00:34",
    text: "Из плюсов — миграция CI закрыта. Цифры по времени сборки, я скинул в канал, пайплайны действительно быстрее на тридцать восемь процентов в среднем. Из минусов — был инцидент с S3 в среду, я уже написал postmortem, сегодня вечером дошлю.",
  },
  {
    speaker: "Полина Дроздова",
    timestamp: "00:01:42",
    text: "Мне понравилось, что мы успели поправить утечку в воркере транскрибации. Это был не запланирован, но он реально мешал. Не понравилось — две задачи переехали. Особенно жаль метрики, они блокируют дашборд платформы.",
  },
  {
    speaker: "Кирилл Степанов",
    timestamp: "00:02:55",
    text: "Я бы хотел поднять тему ревью. У меня лежали PR-ы по два дня, и это не первый раз. Кажется, нам нужен какой-то механизм напоминаний — иначе всё держится на личных просьбах в личке.",
  },
  {
    speaker: "Игорь Самохин",
    timestamp: "00:03:30",
    text: "Хорошая тема, давай её отдельно разберём. Я предлагаю простое правило: если PR висит без активности больше 24 часов, бот автоматически кидает напоминание в общий канал. Так будет видимо всем.",
  },
  {
    speaker: "Полина Дроздова",
    timestamp: "00:04:01",
    text: "Поддержу. И давайте добавим, что в дайджесте будет имя автора и сколько висит — без обвинительной интонации, просто факт.",
  },
  {
    speaker: "Артём Бакулин",
    timestamp: "00:04:25",
    text: "По метрикам Prometheus — давайте я возьму на себя декомпозицию. Сейчас задача огромная, проще разнести на три сабтаска: интеграция, дашборд, алерты. Тогда влезет в спринт точно.",
  },
  {
    speaker: "Игорь Самохин",
    timestamp: "00:05:00",
    text: "Зафиксировали. Артём — декомпозиция метрик к понедельнику. Я — настройка правила по PR. Кирилл, ты как раз говорил про плейбук SRE — добавим туда ротацию ключей IAM, чтобы такого, как в среду, больше не было.",
  },
  {
    speaker: "Кирилл Степанов",
    timestamp: "00:05:38",
    text: "Принимаю. До конца недели сделаю первую версию.",
  },
  {
    speaker: "Игорь Самохин",
    timestamp: "00:05:50",
    text: "Спасибо всем. Оценки спринта закинула Полина — средняя семь и четыре. Комментарии хорошие, видно, что команде нужен один день без встреч в неделю. Со следующего спринта попробуем четверг как «тихий» день.",
  },
];

/** Конспект технического интервью. */
const SUMMARY_BACKEND_INTERVIEW = `# Интервью: Senior Backend Engineer

**Кандидат:** Виктор П.
**Дата:** 22 мая 2026
**Интервьюеры:** Александр Гончаров (Tech Lead), Мария Лопатина (HR)
**Длительность:** 60 минут

## Резюме

Кандидат имеет 7 лет опыта на Go, последние 3 года — в крупном финтехе на роли тимлида небольшой команды. Сильные стороны — проектирование распределённых систем, опыт работы с Kafka и gRPC, понимание trade-off'ов между согласованностью и доступностью.

## Что прошло хорошо

- **Системный дизайн.** Задача про систему уведомлений с дедупликацией и at-least-once доставкой — решил уверенно. Корректно отделил приём от доставки, предложил idempotency-key и Outbox-таблицу. Без подсказок учёл backpressure.
- **Go и конкурентность.** Понимает разницу между каналами и sync-примитивами, чисто объяснил, когда использовать errgroup, а когда semaphore. Знает про утечки горутин и как их детектить.
- **Операционка.** Спокойно рассуждал про SLI/SLO, привёл реальные примеры из своего проекта.

## Что насторожило

- **PostgreSQL.** Слабоват в нюансах: путал уровни изоляции, не назвал отличие repeatable read от serializable в Postgres. Базовые вещи знает, но глубины нет.
- **Тестирование.** Контрактные тесты не делал, в проекте опирается в основном на e2e. На вопрос о property-based тестах ответил, что знает теорию, но не применял.

## Решение

**Идём дальше.** Назначаем второй раунд: парное программирование + углублённое обсуждение работы с базой. Слабая сторона по Postgres важна для команды, но обучаема, если кандидат готов вкладываться.

Следующий шаг — Мария согласовывает слот на следующей неделе.`;

const TRANSCRIPT_BACKEND_INTERVIEW = [
  {
    speaker: "Александр Гончаров",
    timestamp: "00:00:10",
    text: "Виктор, добрый день. Я Александр, тимлид платформенной команды. Сегодня у нас часовое техническое интервью: пятнадцать минут на знакомство и опыт, дальше системный дизайн и блок про Go. В конце ваши вопросы. Удобно?",
  },
  {
    speaker: "Виктор П.",
    timestamp: "00:00:38",
    text: "Здравствуйте, всё удобно. Пишу заметки параллельно — если вдруг буду тянуть с ответом, я просто формулирую. Готов начинать.",
  },
  {
    speaker: "Александр Гончаров",
    timestamp: "00:01:05",
    text: "Отлично. Расскажите коротко про последний проект. Что строили, какая команда, какая ваша роль.",
  },
  {
    speaker: "Виктор П.",
    timestamp: "00:01:22",
    text: "Я три года в финтехе, последние полтора — тимлид команды из четырёх человек. Мы делали систему регулярных платежей. Принимали запросы от партнёров, складывали их в Kafka, дальше шёл pipeline валидации, антифрод и собственно проведение через банковские шины. Объёмы — около двух миллионов транзакций в сутки, пиково до семидесяти в секунду.",
  },
  {
    speaker: "Александр Гончаров",
    timestamp: "00:02:48",
    text: "Хорошо. Перейдём к дизайну. Представьте: нужно построить систему уведомлений. На вход — события из разных сервисов, на выход — push, e-mail и SMS. Требования: at-least-once доставка, дедупликация на стороне получателя, поддержка throughput до 10 тысяч событий в секунду. Как будете подходить?",
  },
  {
    speaker: "Виктор П.",
    timestamp: "00:03:30",
    text: "Сразу разделил бы на два контура: приём и доставка. На приёме — gRPC-эндпоинт, который кладёт событие в Outbox-таблицу в той же транзакции, что и бизнес-операция в продюсере. Это нужно, чтобы гарантировать exactly-once в смысле появления события. Дальше отдельный воркер вычитывает Outbox и публикует в Kafka.",
  },
  {
    speaker: "Виктор П.",
    timestamp: "00:04:12",
    text: "Доставка — отдельные консьюмеры под каждый канал: push, email, SMS. У каждого свой rate limit, свой ретрай. Дедупликацию делаю через idempotency-key, который генерируется на стороне продюсера и сохраняется в Redis с TTL, скажем, в семь дней. Если за это время повторно приходит то же событие — просто отбрасываем.",
  },
  {
    speaker: "Александр Гончаров",
    timestamp: "00:05:08",
    text: "Хорошо, а если получатель не успевает обрабатывать — например, провайдер push'ей деградировал?",
  },
  {
    speaker: "Виктор П.",
    timestamp: "00:05:25",
    text: "Это backpressure. Самый простой вариант — притормозить консьюмер, дать lag-у накопиться в Kafka. Если деградация надолго, переключаем канал на DLQ и алертим SRE. Можно ещё ввести quality-of-service: критичные события идут отдельным топиком с большим количеством партиций.",
  },
  {
    speaker: "Александр Гончаров",
    timestamp: "00:06:50",
    text: "Понял. Перейдём к Go. У вас есть errgroup и есть semaphore из x/sync. Когда что выбираете?",
  },
  {
    speaker: "Виктор П.",
    timestamp: "00:07:15",
    text: "errgroup — когда нужно запустить несколько горутин, дождаться всех и упасть на первой ошибке с отменой контекста. Классический пример — параллельные походы за данными в нескольких микросервисах для одного запроса. Semaphore — когда мне важно ограничить параллелизм, но падать не нужно. Например, обработка очереди задач, где я хочу не больше десяти одновременно.",
  },
  {
    speaker: "Александр Гончаров",
    timestamp: "00:08:30",
    text: "Хорошо. Последний вопрос на Go: как ловить утечку горутин в продакшене?",
  },
  {
    speaker: "Виктор П.",
    timestamp: "00:08:45",
    text: "Несколько способов. Самый простой — экспортить runtime.NumGoroutine как метрику и смотреть на тренды. Если растёт без отката, что-то не так. Глубже — pprof, конкретно goroutine profile, по нему видно, где горутины висят. В тестах использую goleak, он сразу покажет, если после теста остались живые горутины.",
  },
  {
    speaker: "Александр Гончаров",
    timestamp: "00:10:00",
    text: "Перейдём к базе. У вас Postgres, нужно перевести логику с repeatable read на serializable. Что произойдёт и какие подводные камни?",
  },
  {
    speaker: "Виктор П.",
    timestamp: "00:10:22",
    text: "Честно — на этом уровне не очень уверенно. Знаю, что serializable строже, но точное отличие в Postgres от repeatable read я бы сейчас не сформулировал. Помню, что serializable использует predicate locking и может выбрасывать сериализационные ошибки, которые надо ретраить.",
  },
  {
    speaker: "Александр Гончаров",
    timestamp: "00:11:15",
    text: "Хорошо, спасибо за честность. Это нормально, мы это поднимем во втором раунде. У вас остались ко мне вопросы?",
  },
  {
    speaker: "Виктор П.",
    timestamp: "00:11:30",
    text: "Да. Какой стек у вас сейчас на платформе и что в дорожной карте на полгода? И второй — как у вас устроен on-call.",
  },
];

function nowMinusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function nowMinusMinutes(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function uuidv4(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "mock-" + Math.random().toString(36).slice(2, 10);
}

function emptyDate(): string {
  return "0001-01-01T00:00:00Z";
}

function makeTask(overrides: Partial<MockTask> & { task_id: string; status: TaskStatus }): MockTask {
  const now = Date.now();
  const created = overrides.created_at ?? nowMinusDays(2);
  return {
    user_id: "mock-user",
    group_id: "mock-group",
    task_name: "Без названия",
    description: "",
    meeting_date: created,
    pattern_id: "mock-pattern",
    result: null,
    original_filename: "record.mp3",
    duration_seconds: 0,
    created_at: created,
    updated_at: created,
    started_at: emptyDate(),
    completed_at: emptyDate(),
    change_flag: false,
    _stageStartedAt: now,
    ...overrides,
  } as MockTask;
}

function buildInitialTasks(): MockTask[] {
  const now = Date.now();
  return [
    // ------- Готовая задача с полным результатом (главный демо-кейс) -------
    makeTask({
      task_id: "mock-done-sales-okr",
      status: "done",
      task_name: "Квартальное планирование: цели и OKR отдела продаж",
      description:
        "Защита плана на Q3, утверждение OKR по сегментам, обсуждение запуска Enterprise-направления.",
      original_filename: "sales_planning_q3.mp3",
      meeting_date: nowMinusDays(2),
      created_at: nowMinusDays(2),
      duration_seconds: 3240, // 54 мин
      completed_at: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      change_flag: true,
      result: {
        summary: SUMMARY_SALES_OKR,
        transcript: TRANSCRIPT_SALES_OKR,
      },
    }),

    // ------- Готовая задача — ретро спринта -------
    makeTask({
      task_id: "mock-done-retro",
      status: "done",
      task_name: "Ретроспектива спринта №14 — команда Платформа",
      description:
        "Что зашло, что нет, и какие договорённости берём в следующий спринт.",
      original_filename: "retro_sprint_14.m4a",
      meeting_date: nowMinusDays(5),
      created_at: nowMinusDays(5),
      duration_seconds: 1980, // 33 мин
      completed_at: new Date(now - 5 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
      change_flag: true,
      result: {
        summary: SUMMARY_SPRINT_RETRO,
        transcript: TRANSCRIPT_SPRINT_RETRO,
      },
    }),

    // ------- Готовая задача — техническое интервью -------
    makeTask({
      task_id: "mock-done-interview",
      status: "done",
      task_name: "Интервью с кандидатом — Senior Backend (Go)",
      description: "Технический скрин: системный дизайн, Go, базы данных.",
      original_filename: "interview_senior_backend.wav",
      meeting_date: nowMinusDays(8),
      created_at: nowMinusDays(8),
      duration_seconds: 3600, // 60 мин
      completed_at: new Date(now - 8 * 24 * 60 * 60 * 1000 + 65 * 60 * 1000).toISOString(),
      change_flag: true,
      result: {
        summary: SUMMARY_BACKEND_INTERVIEW,
        transcript: TRANSCRIPT_BACKEND_INTERVIEW,
      },
    }),

    // ------- Идёт обработка -------
    makeTask({
      task_id: "mock-proc-allhands",
      status: "processing_transcribe",
      task_name: "Ежемесячный all-hands — итоги мая",
      description: "Подведение итогов месяца, презентация дорожной карты на июнь.",
      original_filename: "all_hands_may.mp3",
      duration_seconds: 4140, // 69 мин
      meeting_date: nowMinusMinutes(85),
      created_at: nowMinusMinutes(80),
      _stageStartedAt: now - 6_000,
    }),

    // ------- Ожидание в очереди -------
    makeTask({
      task_id: "mock-pend-client-call",
      status: "pending_summarize",
      task_name: "Звонок с клиентом «Атлас» — продление контракта",
      description: "Переговоры о продлении на 12 месяцев, обсуждение условий.",
      original_filename: "atlas_call.ogg",
      duration_seconds: 2160, // 36 мин
      meeting_date: nowMinusMinutes(40),
      created_at: nowMinusMinutes(35),
      _stageStartedAt: now - 1_500,
    }),

    // ------- Ошибка обработки -------
    makeTask({
      task_id: "mock-error-broken",
      status: "error_transcribe",
      task_name: "Тестовая запись с микрофона",
      description: "Файл не удалось распознать: повреждены аудиоданные.",
      original_filename: "voice_memo_broken.aac",
      duration_seconds: 0,
      meeting_date: nowMinusDays(1),
      created_at: nowMinusDays(1),
    }),
  ];
}

function ensureSeeded(): void {
  if (STORE.length === 0) {
    STORE.push(...buildInitialTasks());
  }
}

// ============================== ПРОГРЕССИЯ ==============================

function advanceIfDue(task: MockTask): void {
  const idx = PIPELINE.indexOf(task.status);
  if (idx === -1 || task.status === "done") return;

  const isProc = task.status.startsWith("processing_");
  const threshold = isProc ? PROCESSING_DURATION_MS : PENDING_DURATION_MS;
  const elapsed = Date.now() - task._stageStartedAt;

  if (elapsed < threshold) return;

  const nextStatus = PIPELINE[idx + 1];
  task.status = nextStatus;
  task.updated_at = new Date().toISOString();
  task._stageStartedAt = Date.now();

  if (nextStatus === "done") {
    task.completed_at = task.updated_at;
    task.change_flag = true;
    if (
      !task.result ||
      (typeof task.result === "object" &&
        task.result !== null &&
        Object.keys(task.result).length === 0)
    ) {
      task.result = {
        summary: SUMMARY_SALES_OKR,
        transcript: TRANSCRIPT_SALES_OKR,
      };
    }
    // Когда задача только что обработалась (например, демо-загрузка),
    // длительность аудиозаписи ещё не выставлена — подставим правдоподобное
    // значение, чтобы плеер на странице деталей был активен.
    if (!task.duration_seconds || task.duration_seconds <= 0) {
      task.duration_seconds = 1860; // 31 минута — типичная длительность встречи
    }
  }
}

function tickAll(): void {
  for (const task of STORE) {
    advanceIfDue(task);
  }
}

function findById(taskId: string): MockTask | undefined {
  return STORE.find((t) => t.task_id === taskId);
}

function toDto(task: MockTask): TaskDto {
  // Возвращаем копию без приватного поля _stageStartedAt.
  const { _stageStartedAt: _omit, ...dto } = task;
  void _omit;
  return dto;
}

function delay<T>(value: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

// ============================== ПУБЛИЧНЫЙ СЕРВИС ==============================

export const mockTasksService = {
  upload(
    groupId: string,
    audio: File,
    data: UploadTaskData,
    onProgress?: (percent: number) => void,
  ): Promise<UploadTaskResponse> {
    ensureSeeded();
    tickAll();

    const taskId = uuidv4();
    const createdAt = new Date().toISOString();
    // Длительность бекенд знал бы из метаданных файла после загрузки.
    // В моке оценим её по размеру: ~1 минута на 1 МБ при типичном битрейте 128 kbps.
    // Для пустых/очень маленьких файлов ставим разумное значение по умолчанию.
    const estimatedFromSize = Math.round((audio.size || 0) / (128 * 1024 / 8));
    const durationSeconds =
      estimatedFromSize >= 60 ? Math.min(estimatedFromSize, 5400) : 1620; // 27 мин
    const task = makeTask({
      task_id: taskId,
      group_id: groupId,
      user_id: "mock-user",
      task_name: data.task_name,
      description: data.description,
      meeting_date: data.meeting_date,
      pattern_id: data.pattern_id,
      original_filename: audio.name,
      duration_seconds: durationSeconds,
      status: "processing_upload",
      created_at: createdAt,
      updated_at: createdAt,
      change_flag: false,
    });
    STORE.unshift(task);

    const response: UploadTaskResponse = {
      task_id: task.task_id,
      status: task.status,
      task_name: task.task_name,
      description: task.description,
      meeting_date: task.meeting_date,
      pattern_id: task.pattern_id,
      original_filename: task.original_filename,
      file_type: audio.type || "audio/mpeg",
      created_at: task.created_at,
      change_flag: task.change_flag,
    };

    // Имитируем прогресс загрузки, чтобы UI вёл себя как с настоящим бекендом.
    if (onProgress) {
      onProgress(0);
      let percent = 0;
      const timer = setInterval(() => {
        percent = Math.min(100, percent + 20);
        onProgress(percent);
        if (percent >= 100) clearInterval(timer);
      }, 150);
    }

    return delay(response);
  },

  listByGroup(
    groupId: string,
    page = 1,
    limit = 0,
  ): Promise<TasksListResponse> {
    ensureSeeded();
    tickAll();

    // Подменяем group_id на запрошенный, чтобы тестовые задачи появлялись
    // в любой реальной группе пользователя.
    const all = STORE.map((t) => toDto({ ...t, group_id: groupId }));
    const total = all.length;
    let slice = all;
    if (limit > 0) {
      const start = (page - 1) * limit;
      slice = all.slice(start, start + limit);
    }

    return delay({
      tasks: slice,
      pagination: { page, limit, total },
    });
  },

  getById(taskId: string): Promise<TaskDto> {
    ensureSeeded();
    tickAll();
    const task = findById(taskId);
    if (!task) {
      return Promise.reject(new ApiError("Задача не найдена", 404));
    }
    return delay(toDto(task));
  },

  getStatus(taskId: string): Promise<TaskStatusResponse> {
    ensureSeeded();
    tickAll();
    const task = findById(taskId);
    if (!task) {
      return Promise.reject(new ApiError("Задача не найдена", 404));
    }

    const isProc = task.status.startsWith("processing_");
    const isPending = task.status.startsWith("pending_");

    let inQueue = 0;
    let leadTime = 0;

    if (isPending) {
      inQueue = STORE.filter(
        (t) => t.status === task.status && t.task_id !== task.task_id,
      ).length;
      // Плюс немного «синтетических» — чтобы было что показать.
      inQueue = Math.max(inQueue, 2);
    } else if (isProc) {
      const remainingMs = Math.max(
        0,
        PROCESSING_DURATION_MS - (Date.now() - task._stageStartedAt),
      );
      leadTime = Math.max(1, Math.round(remainingMs / 60_000));
      // Делаем числа выглядящими реалистичнее: показываем целые минуты.
      if (leadTime < 1) leadTime = 1;
    }

    return delay({
      status: task.status,
      is_process: isProc,
      in_the_queue_before: inQueue,
      approximate_lead_time_process: leadTime,
    });
  },

  update(taskId: string, payload: EditTaskRequest): Promise<TaskDto> {
    ensureSeeded();
    const task = findById(taskId);
    if (!task) {
      return Promise.reject(new ApiError("Задача не найдена", 404));
    }
    if (task.status !== "done") {
      return Promise.reject(
        new ApiError("Нельзя изменять задачу, которая находится в обработке", 400),
      );
    }
    if (payload.task_name !== undefined) task.task_name = payload.task_name;
    if (payload.description !== undefined) task.description = payload.description;
    if (payload.meeting_date !== undefined) task.meeting_date = payload.meeting_date;
    task.updated_at = new Date().toISOString();
    return delay(toDto(task));
  },

  remove(taskId: string): Promise<void> {
    ensureSeeded();
    const idx = STORE.findIndex((t) => t.task_id === taskId);
    if (idx === -1) {
      return Promise.reject(new ApiError("Задача не найдена", 404));
    }
    if (STORE[idx].status !== "done" && !STORE[idx].status.startsWith("error_")) {
      return Promise.reject(
        new ApiError("Нельзя удалить задачу, которая находится в обработке", 400),
      );
    }
    STORE.splice(idx, 1);
    return delay(undefined);
  },

  getAudioUrl(taskId: string): Promise<{ url: string; expires_at?: string }> {
    // В in-memory моке настоящего файла нет — возвращаем 404, чтобы UI
    // отрисовал состояние «аудио недоступно». Реальный backend ответит
    // на этот эндпоинт presigned-ссылкой на uploads/{groupID}/{taskID}/audio.wav.
    ensureSeeded();
    const task = findById(taskId);
    if (!task) {
      return Promise.reject(new ApiError("Задача не найдена", 404));
    }
    return Promise.reject(
      new ApiError("Аудио недоступно в режиме мока", 404),
    );
  },
};

export type TasksServiceLike = typeof mockTasksService;
