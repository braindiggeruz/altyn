<!-- deploy trigger 2026-02-01 -->
# ALTYN Therapy — Landing Page

Конверсионный лендинг проекта **ALTYN Therapy** под Instagram-трафик.

## 🌐 Сайт

**Продакшен:** https://altyn-therapy.uz

## 🎯 Главный оффер

**Личный диагностический разбор сценария** — 60 минут онлайн за **10$**.

Темы: повторяющиеся сценарии в отношениях, эмоциональная зависимость,
тревога, одиночество, усталость быть сильной, развод/расставание.

## 🚀 Стек

- Статический HTML/CSS/JS (Vite-bundled assets для legacy + кастомные enhancement-скрипты)
- TailwindCSS-токены вынесены в инлайн CSS переменные на новой главной
- Cloudflare Pages (хостинг)
- Cloudflare Pages Functions (CAPI, attribution KV)

## 📁 Структура

```
/
├── index.html                 # Главная (premium конверсионный лендинг)
├── go/telegram/index.html     # Bridge-страница (deeplink в @altyntherapyuzbot)
├── assets/                    # JS/CSS — pixel, utm, bridge, enhance
│   ├── altyn-utm.js           # UTM/fbclid/_fbp/_fbc capture
│   ├── altyn-pixel.js         # Meta Pixel + CAPI events
│   └── altyn-bridge.js        # Bridge → bot deeplink с ?start=<cta>
├── functions/api/             # Cloudflare Functions (CAPI, lead attribution)
├── testimonials/              # Видео-отзывы
├── favicon.svg
├── robots.txt
├── sitemap.xml
└── wrangler.toml              # Cloudflare Pages config
```

## 🎯 Конверсионная воронка

```
Instagram Ad / Reels / Stories
        ↓
Лендинг (altyn-therapy.uz)
   ├── Hero: «Он то рядом, то исчезает?» + 10$ оффер
   ├── Чек-лист болей
   ├── Что такое разбор / 60 минут / Для кого
   ├── Почему 10$ / Безопасность
   ├── Мини-квиз (5 вопросов → 5 сценариев)
   ├── Об Алтын / FAQ
   └── Финальный CTA + Sticky mobile CTA
        ↓
/go/telegram?cta=<source> (bridge: Contact + Lead pixel events)
        ↓
@altyntherapyuzbot?start=<cta>
        ↓
Бот: разбор за 10$ → заявка
```

## 📊 CTA source IDs (?cta=)

| ID | Где живёт |
|---|---|
| `site_hero` | Hero — главная кнопка |
| `recognize_diagnostic` | Блок «Если вы узнали себя» |
| `why10_cta` | Блок «Почему 10$» |
| `about_cta` | Блок «Об Алтын» |
| `quiz_result` | Результат квиза |
| `site_final_cta` | Финальный CTA |
| `sticky_mobile` | Mobile sticky |
| `instagram_landing` | (зарезервировано для прямой ссылки в IG bio) |

CTA-id передаётся через query на /go/telegram и форвардится в Telegram-бот
как `?start=<cta>` для серверной атрибуции.

## 📈 Аналитика (events)

* `PageView`, `ViewContent`, `LandingQualifiedView` (8s или scroll ≥ 35%)
* `CTA_Click`, `LeadIntent` (на клик в Telegram CTA)
* `QuizStart`, `QuizAnswer`, `QuizComplete`, `QuizResultView`
* `Contact`, `TelegramOpenAttempt`, `Lead` (на bridge)
* `CopyLeadPhrase` (если посетитель копирует фразу)
* `QualifiedLead` — серверное событие после реальной заявки в боте

Подробнее — `META_TRACKING.md`.

## ⚙️ Деплой

Автоматический через **Cloudflare Pages** при пуше в `main`.

## 📞 Контакты

- Telegram-бот для заявок: [@altyntherapyuzbot](https://t.me/altyntherapyuzbot)
