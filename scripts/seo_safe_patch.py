#!/usr/bin/env python3
"""
ALTYN Therapy — social-safe SEO patch.
Applies surgical edits to index.html and replaces all policy-risk wording
with safe equivalents per project spec.
Run from /app/altyn.
"""
import re, sys, pathlib, json

ROOT = pathlib.Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
html = INDEX.read_text(encoding="utf-8")

# ---------------- 1. META / HEAD block (head replacement done with regex) ----------------

new_title = "ALTYN Therapy — личный разбор отношений, которые идут по кругу"
new_desc  = "Бережный разбор повторяющегося сценария отношений с Алтын. 60 минут онлайн за 10$. Конфиденциально, спокойно, без оценок. Это не медицинская услуга."
new_og_desc = "Бережный разбор повторяющегося сценария отношений. 60 минут онлайн за 10$. Конфиденциально и без оценок."
new_og_image_alt = "ALTYN Therapy — личный разбор повторяющегося сценария отношений"

# title
html = re.sub(r'<title>[^<]*</title>', f'<title>{new_title}</title>', html, count=1)

# description
html = re.sub(
    r'<meta name="description" content="[^"]*"\s*/>',
    f'<meta name="description" content="{new_desc}" />',
    html, count=1
)

# keywords — REMOVE entirely
html = re.sub(r'\s*<meta name="keywords" content="[^"]*"\s*/>\s*\n', '\n', html, count=1)

# canonical — switch to www to match production
html = re.sub(
    r'<link rel="canonical" href="[^"]*"\s*/>',
    '<link rel="canonical" href="https://www.altyn-therapy.uz/" />',
    html, count=1
)

# Replace the whole OG / Twitter / Schema head block in one go.
# We anchor on the comment "===== PRIMARY SEO =====" already present, then
# replace from there until end of the existing JSON-LD block.

head_new = """  <!-- ===== PRIMARY SEO =====
       Single source of truth for title / description / canonical / hreflang.
       Keywords meta is intentionally absent (ignored by Google, can flag for spam). -->
  <title>__TITLE__</title>
  <meta name="description" content="__DESC__" />
  <meta name="author" content="Алтын" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.altyn-therapy.uz/" />
  <link rel="alternate" hreflang="ru" href="https://www.altyn-therapy.uz/" />
  <link rel="alternate" hreflang="uz" href="https://www.altyn-therapy.uz/uz/" />
  <link rel="alternate" hreflang="x-default" href="https://www.altyn-therapy.uz/" />

  <!-- ===== OPEN GRAPH (Facebook / Telegram / VK / LinkedIn) ===== -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://www.altyn-therapy.uz/" />
  <meta property="og:title" content="__TITLE__" />
  <meta property="og:description" content="__OG_DESC__" />
  <meta property="og:image" content="https://www.altyn-therapy.uz/og-image.jpg" />
  <meta property="og:image:secure_url" content="https://www.altyn-therapy.uz/og-image.jpg" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="__OG_ALT__" />
  <meta property="og:locale" content="ru_RU" />
  <meta property="og:locale:alternate" content="uz_UZ" />
  <meta property="og:site_name" content="ALTYN Therapy" />

  <!-- ===== TWITTER ===== -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="__TITLE__" />
  <meta name="twitter:description" content="__OG_DESC__" />
  <meta name="twitter:image" content="https://www.altyn-therapy.uz/og-image.jpg" />
  <meta name="twitter:image:alt" content="__OG_ALT__" />

  <!-- ===== FAVICON ===== -->
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <meta name="theme-color" content="#2A1218" />

  <!-- ===== SCHEMA.ORG ===== -->
  <script type="application/ld+json">
__JSONLD__
  </script>
""".replace("__TITLE__", new_title).replace("__DESC__", new_desc).replace("__OG_DESC__", new_og_desc).replace("__OG_ALT__", new_og_image_alt)

# JSON-LD @graph: Organization + WebSite + Service + Offer + FAQPage + BreadcrumbList
jsonld = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://www.altyn-therapy.uz/#org",
      "name": "ALTYN Therapy",
      "url": "https://www.altyn-therapy.uz/",
      "logo": "https://www.altyn-therapy.uz/favicon.svg",
      "areaServed": "Uzbekistan",
      "sameAs": [
        "https://t.me/altyntherapybot"
      ]
    },
    {
      "@type": "WebSite",
      "@id": "https://www.altyn-therapy.uz/#site",
      "name": "ALTYN Therapy",
      "url": "https://www.altyn-therapy.uz/",
      "inLanguage": "ru",
      "publisher": { "@id": "https://www.altyn-therapy.uz/#org" }
    },
    {
      "@type": "Service",
      "@id": "https://www.altyn-therapy.uz/#service",
      "name": "Личный разбор повторяющегося сценария отношений",
      "serviceType": "Бережный личный разбор",
      "description": "Онлайн-разбор повторяющегося сценария отношений с Алтын. Это не медицинская услуга и не консультация врача.",
      "areaServed": "Uzbekistan",
      "provider": { "@id": "https://www.altyn-therapy.uz/#org" },
      "availableChannel": {
        "@type": "ServiceChannel",
        "serviceUrl": "https://www.altyn-therapy.uz/",
        "availableLanguage": ["ru", "uz"]
      },
      "offers": {
        "@type": "Offer",
        "price": "10",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
        "url": "https://www.altyn-therapy.uz/",
        "category": "ConsultingService"
      }
    },
    {
      "@type": "FAQPage",
      "@id": "https://www.altyn-therapy.uz/#faq",
      "mainEntity": [
        { "@type": "Question", "name": "Это медицинская диагностика?",
          "acceptedAnswer": { "@type": "Answer",
            "text": "Нет. Это личный разбор повторяющегося сценария в отношениях. Он не заменяет консультацию врача или медицинскую помощь." } },
        { "@type": "Question", "name": "Что будет на разборе?",
          "acceptedAnswer": { "@type": "Answer",
            "text": "Вы расскажете ситуацию, вместе с Алтын посмотрите, что повторяется, где запускается привычная реакция и какой первый шаг может вернуть больше ясности." } },
        { "@type": "Question", "name": "Можно ли пройти онлайн?",
          "acceptedAnswer": { "@type": "Answer",
            "text": "Да, формат онлайн. Можно из любой точки, где вам спокойно и удобно." } },
        { "@type": "Question", "name": "Сколько стоит?",
          "acceptedAnswer": { "@type": "Answer", "text": "60 минут онлайн — 10$." } },
        { "@type": "Question", "name": "Куда ведут кнопки?",
          "acceptedAnswer": { "@type": "Answer",
            "text": "В Telegram-бот ALTYN Therapy, где можно пройти короткий тест и оставить заявку на разбор." } },
        { "@type": "Question", "name": "Это подойдёт, если я пока не понимаю, что именно происходит?",
          "acceptedAnswer": { "@type": "Answer",
            "text": "Да. Тест и разбор как раз помогают бережно сформулировать, какой сценарий может повторяться." } }
      ]
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://www.altyn-therapy.uz/#breadcrumbs",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Главная", "item": "https://www.altyn-therapy.uz/" }
      ]
    }
  ]
}
head_new = head_new.replace("__JSONLD__", json.dumps(jsonld, ensure_ascii=False, indent=2))

# Replace from "<!-- ===== PRIMARY SEO =====" up to (and including) the
# first </script> that closes the application/ld+json block.
pattern_head = re.compile(
    r'<!--\s*=====\s*PRIMARY SEO\s*=====\s*-->.*?</script>\s*\n',
    re.S
)
m = pattern_head.search(html)
if not m:
    print("ERROR: PRIMARY SEO block not found", file=sys.stderr); sys.exit(1)
html = html[:m.start()] + head_new + html[m.end():]

# ---------------- 2. Body content — safe wording ----------------
# These replacements operate on EXACT phrases found earlier. Order matters
# (longer first) to avoid partial-overwrite.

replacements = [
    # eyebrow above hero H1
    ('<div class="eyebrow">Личный диагностический разбор</div>',
     '<div class="eyebrow">Личный разбор сценария</div>'),

    # offer card heading
    ('<div class="offer-title">Личный диагностический разбор сценария</div>',
     '<div class="offer-title">Личный разбор повторяющегося сценария</div>'),

    # process step title
    ('<h3>Диагностика сценария</h3>',
     '<h3>Бережный разбор сценария</h3>'),

    # quote — neutralise "диагностическая встреча"
    ('Разбор сценария — это диагностическая встреча, где Алтын помогает увидеть повторяющий',
     'Разбор сценария — это бережная встреча, где Алтын помогает увидеть повторяющий'),

    # 10$ block
    ('10$ — это доступная диагностическая встреча, чтобы безопасно сделать первый шаг',
     '10$ — это доступный первый шаг, чтобы спокойно увидеть свой сценарий'),

    # "спокойный диагностический разговор"
    ('В работе — спокойный диагностический разговор',
     'В работе — спокойный, бережный разговор'),

    # FAQ answer about "60 минут онлайн — диагностический разбор"
    ('60 минут онлайн с Алтын — диагностический разбор вашего сценария',
     '60 минут онлайн с Алтын — бережный разбор вашего сценария'),

    # FAQ "это диагностическая встреча"
    ('Это диагностическая встреча, а не курс терапии',
     'Это бережный разбор, а не курс терапии или медицинская консультация'),

    # "бережная диагностика и первый шаг к ясности"
    ('Это бережная диагностика и первый шаг к ясности',
     'Это бережный разбор и первый шаг к ясности'),

    # "Это не диагноз и не обещание «вылечить»"
    ('<p><strong>Это не диагноз и не обещание «вылечить».</strong></p>',
     '<p><strong>Это не медицинская услуга и не консультация врача.</strong></p>'),

    # "Никаких диагнозов, советов и нравоучений"
    ('Никаких диагнозов, советов и нравоучений.',
     'Без оценок, советов и нравоучений.'),

    # Recognize block: replace "Внутри тревога, пустота и одиночество"
    ('Внутри тревога, пустота и одиночество',
     'Внутри тяжело, мало опоры и тепла'),

    # Segment label
    ('«Тревога и одиночество»',
     '«Усталость и одиночество»'),

    # About-Altyn long text
    ('бережно увидеть повторяющиеся сценарии в отношениях, тревоге и внутренней усталости',
     'бережно увидеть повторяющиеся сценарии в отношениях и состояние внутренней усталости'),

    # Quiz option label "Тревогу"
    ("{ label: 'Тревогу', s: 'waiting' }",
     "{ label: 'Сильное напряжение', s: 'waiting' }"),

    # Quiz scenario description
    ('тревога и надежда вперемешку. Этот сценарий не про слабо',
     'смешанные чувства, надежда и сомнение. Этот сценарий не про слабо'),
]

for old, new in replacements:
    if old not in html:
        print(f"  WARN: phrase not found, skipping: {old[:60]!r}", file=sys.stderr)
        continue
    html = html.replace(old, new, 1)

# ---------------- 3. Footer — add legal links if not present ----------------
# Insert a discreet legal links block right before </body>.

legal_footer = """
<!-- ===== LEGAL FOOTER (added by social-safe SEO patch) ===== -->
<style>
.altyn-legal-footer{font-family:'Manrope',sans-serif;background:#1a0d11;color:#d3c4b0;
  padding:28px 20px 32px;text-align:center;font-size:13px;line-height:1.7;letter-spacing:.02em}
.altyn-legal-footer a{color:#e9c98a;text-decoration:none;margin:0 8px;border-bottom:1px solid rgba(233,201,138,.25);padding-bottom:1px}
.altyn-legal-footer a:hover{border-color:#e9c98a}
.altyn-legal-footer .altyn-legal-disclaimer{max-width:720px;margin:14px auto 0;font-size:12px;color:#8c7d6a;font-style:italic}
.altyn-legal-footer .altyn-legal-row{display:flex;justify-content:center;flex-wrap:wrap;gap:4px 8px}
</style>
<footer class="altyn-legal-footer" role="contentinfo" data-testid="legal-footer">
  <div class="altyn-legal-row">
    <a href="/privacy/" data-testid="footer-privacy">Privacy Policy</a>
    <span style="opacity:.4">·</span>
    <a href="/terms/" data-testid="footer-terms">Terms</a>
    <span style="opacity:.4">·</span>
    <a href="/contact/" data-testid="footer-contact">Контакты</a>
    <span style="opacity:.4">·</span>
    <a href="/disclaimer/" data-testid="footer-disclaimer">Disclaimer</a>
    <span style="opacity:.4">·</span>
    <a href="/uz/" data-testid="footer-uz" hreflang="uz">O'zbekcha</a>
  </div>
  <div class="altyn-legal-disclaimer">
    ALTYN Therapy предлагает бережный разбор повторяющегося сценария в отношениях.
    Это не медицинская услуга, не психиатрическая помощь и не замена консультации врача.
  </div>
</footer>
<!-- /LEGAL FOOTER -->
</body>"""

if "altyn-legal-footer" not in html:
    html = html.replace("</body>", legal_footer)

# ---------------- 4. Save ----------------
INDEX.write_text(html, encoding="utf-8")
print("OK index.html patched")

# ---------------- Verify no risk words remain on landing body ----------------
import re
plain = re.sub(r'<script[\s\S]*?</script>', ' ', html, flags=re.I)
plain = re.sub(r'<style[\s\S]*?</style>',  ' ', plain, flags=re.I)
plain = re.sub(r'<[^>]+>', ' ', plain)
risk = ['диагностическ','диагностик','диагноз','вылечить','лечим','депресс','расстрой','травм','тревог','избав','гарант','исцел']
print()
print("=== Remaining risk-word matches in VISIBLE BODY text ===")
for r in risk:
  for m in re.finditer(r, plain, re.I):
    s=max(0,m.start()-40); e=min(len(plain),m.end()+40)
    print(f'  "{m.group()}": …{plain[s:e].strip()}…')
