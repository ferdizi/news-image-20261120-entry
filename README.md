# The 20 November Proof Page

[![news-image-20261120](https://make.fun/badge/news-image-20261120.svg)](https://make.fun/bounty/news-image-20261120)
[![rank](https://make.fun/badge/news-image-20261120/ferdizi/news-image-20261120-entry/rank.svg)](https://make.fun/bounty/news-image-20261120)
[![reward](https://make.fun/badge/news-image-20261120/ferdizi/news-image-20261120-entry/reward.svg)](https://make.fun/bounty/news-image-20261120)

A one-page world news front page for Friday 20 November 2026: 36 dispatches
from 7 regions plus a global desk, drawn entirely in code.

## The idea

Most one-day news pictures just list what happened. This one shows its
working. Every story on the page carries a double-date lock:

- **EV** — the date the event itself happened.
- **SRC** — the date the source published it.

When the two dates differ, the page says so instead of hiding it. Two
dispatches on this page span the night of 19–20 November (the Kyiv barrage),
and one — the ICJ ruling on Myanmar — was handed down on 19 November and
covered on 20 November. Both are stamped with both dates. The timeline rail
at the bottom lists only times that come with a source and a timezone
(08:30 IST, Cyclone Akvan landfall); everything else is dated, never timed
by guesswork.

## How to run

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` needs Node 22 and nothing else: standard library only, no
network, no install step. It writes one file, `out/entry.png`
(1024×1024, well under 1 MiB), and runs twice to byte-identical output.

## How the picture is built

- A hand-written 5×7 bitmap font, defined as data in `main.ts`, renders
  every word on the page. No font files, no image files, no downloads.
- A hand-rolled PNG encoder (`node:zlib` deflate plus manual PNG chunks)
  writes the final file.
- Six lead cards carry small vector scenes drawn from code: the Kyiv
  skyline and bridges, the Akvan spiral, a falling market line, the ICJ
  courthouse, the Hormuz tanker, and the Shenzhen skyline.
- The supporting zone groups 27 shorter dispatches under eight desks:
  Europe, Middle East, North America, Asia, Latin America, Africa,
  Oceania, and a Global desk.

## Accuracy notes

- Claims that rest on a report are worded as reports ("REPORTS OF SEC
  PROBE"), never as established fact.
- Names are spelled as the sources spell them: Podilsko-Voskresenskyi,
  Darnytskyi, Pivdennyi, Gopalpur, Rohingya.
- No figure on the page is invented, and no timezone is converted without
  a source behind it.

## Source index

Every story on the poster, numbered as cited in the image. Each entry
names the source, the publication date, and a link to the publishing
organisation's site for its 20 November 2026 coverage. Entry [10] links
to the exact story.


### Lead stories

- [01] Kyiv overnight barrage, 400+ drones and 110+ missiles, 8 killed — Reuters / President Volodymyr Zelenskyy, 20 Nov 2026 — https://www.reuters.com
- [02] Three Kyiv bridges struck: Podilsko-Voskresenskyi, Darnytskyi, Pivdennyi — Kyiv Mayor Vitali Klitschko, 20 Nov 2026 — https://www.reuters.com
- [10] ICJ holds Myanmar responsible for genocide against the Rohingya — UN News, 20 Nov 2026 — https://news.un.org/en/story/2026/11/1168836 — Note: the judgment itself was delivered at The Hague on 19 Nov 2026; the poster stamps it EV 19 NOV · SRC 20 NOV.
- [12] Oil tanker on fire in the Strait of Hormuz; IEA warns of the largest energy supply shock on record — IEA / wire reports, 20 Nov 2026 — https://www.iea.org
- [15] Global sell-off: S&P 500 −3.70%, Nasdaq −5.28%, Dow −1.93%, all into correction — market data via Reuters, 20 Nov 2026 — https://www.reuters.com
- [16] Nvidia −14.01% on reports of an SEC accounting probe — Reuters, 20 Nov 2026 — https://www.reuters.com
- [19] First three-way Trump–Xi–Putin meeting opens in Shenzhen — Associated Press, 20 Nov 2026 — https://apnews.com
- [20] US–China accord on human oversight of military AI — Associated Press, 20 Nov 2026 — https://apnews.com
- [24] Cyclone Akvan makes landfall near Gopalpur, Odisha, about 08:30 IST; 300,000+ evacuated, 9,341 shelters — India Meteorological Department, 20 Nov 2026 — https://www.imd.gov.in

### Europe

- [03] Two Russian Kh-101 missiles and a suspected jet drone fall in Poland's Lublin and Subcarpathian regions; no casualties — Associated Press, 20 Nov 2026 — https://apnews.com
- [04] Ukraine's Operation Bear Trap retakes 14 settlements, about 200 sq km, near Kharkiv — Reuters, 20 Nov 2026 — https://www.reuters.com
- [05] Ukrainian Neptune strikes damage the Kerch Bridge road and rail; three rail breaks, trains resume on one track — Reuters, 20 Nov 2026 — https://www.reuters.com
- [06] Ukraine, Germany, France and Britain agree proposed legally binding security guarantees after a ceasefire — Reuters, 20 Nov 2026 — https://www.reuters.com
- [07] Hungary lifts its veto on opening EU accession clusters with Ukraine — Reuters, 20 Nov 2026 — https://www.reuters.com
- [08] Estonia to close its border with Russia for at least six months from 1 December — Reuters, 20 Nov 2026 — https://www.reuters.com
- [09] Nuclear plants forced to cut output; emergency outages in 11 regions — Reuters, 20 Nov 2026 — https://www.reuters.com

### Middle East

- [11] Houthi missile damages the PIF Tower in Riyadh; Saudi coalition intercepts three Houthi ballistic missiles — Associated Press, 20 Nov 2026 — https://apnews.com
- [13] US Senate blocks the Iran war-powers resolution, 51–48 — Associated Press, 20 Nov 2026 — https://apnews.com
- [14] Trump says no rush on the next Iran step: "see what happens after January 1" — Associated Press, 20 Nov 2026 — https://apnews.com

### North America

- [17] Anthropic shares −9% on IPO day two after the record $81.3B listing — Reuters, 20 Nov 2026 — https://www.reuters.com
- [18] Bitcoin falls a third straight day to near $61,700, lowest since July — CoinDesk, 20 Nov 2026 — https://www.coindesk.com
- [21] US commission warns China could control the American drug supply — US–China Economic and Security Review Commission, 20 Nov 2026 — https://www.uscc.gov
- [22] Nikhil Gupta sentenced to 19+ years over the New York murder plot — US Department of Justice, 20 Nov 2026 — https://www.justice.gov
- [23] Canada's Liberal 2026 budget passes the House 162–151; British Columbia elects its first Conservative government in about 100 years — CBC, 20 Nov 2026 — https://www.cbc.ca

### Asia

- [25] China bars Bloomberg reporter Annmarie Hordern from the Shenzhen summit — Bloomberg, 20 Nov 2026 — https://www.bloomberg.com
- [26] TSMC and Samsung pause advanced chip sales bound for China after new US export curbs — Reuters, 20 Nov 2026 — https://www.reuters.com
- [27] Google launches Gemini 4 Neon — Google, 20 Nov 2026 — https://blog.google
- [28] NVIDIA and Microsoft deepen their AI partnership; Vera Rubin NVL72 on Azure — Microsoft, 20 Nov 2026 — https://news.microsoft.com

### Latin America

- [29] Magnitude 6.7–6.9 earthquake shakes central Peru, Junin region — US Geological Survey, 20 Nov 2026 — https://earthquake.usgs.gov

### Africa

- [30] Kenya begins a 42-day countdown to an Ebola-free declaration — World Health Organization, 20 Nov 2026 — https://www.who.int
- [31] COP31 in Antalya: draft climate deal omits fossil fuels; talks run past deadline — UNFCCC, 20 Nov 2026 — https://unfccc.int

### Oceania

- [32] Australia, Canada and New Zealand issue a joint APEC statement urging a Russia ceasefire — APEC, 20 Nov 2026 — https://www.apec.org
- [33] Xi says China–Australia ties underwent a "comprehensive turnaround" after meeting Albanese in Shenzhen — Ministry of Foreign Affairs of China, 20 Nov 2026 — https://www.fmprc.gov.cn

### Global desk

- [34] Daraxonrasib pill plus chemo shrinks or clears pancreatic tumours in 60.7% of 61 patients — EORTC–NCI–AACR meeting, Barcelona, 20 Nov 2026 — https://www.eortc.org
- [35] SEC charges eight entities over fake crypto platforms; 1,500+ investors, $37M+ — US Securities and Exchange Commission, 20 Nov 2026 — https://www.sec.gov
- [36] Binance hacker moves about $600M in Ether over two days via THORChain and Chainflip — CoinDesk, 20 Nov 2026 — https://www.coindesk.com

## License

MIT — see `LICENSE`.
