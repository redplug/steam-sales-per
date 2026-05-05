import { fetchTargets, findStoreTarget } from "../src/filter/steamCdp.js";
import { CARD_SELECTORS, REVIEW_HINT_SELECTORS } from "../src/filter/storeSelectors.js";
import { WebSocket } from "ws";

const DIAG_PAYLOAD = `(() => {
  const cardSelectors = ${JSON.stringify(CARD_SELECTORS)};
  const reviewHintSelectors = ${JSON.stringify(REVIEW_HINT_SELECTORS)};

  function findCards() {
    const seen = new Set();
    const cards = [];
    for (const sel of cardSelectors) {
      for (const el of Array.from(document.querySelectorAll(sel))) {
        const root = el.closest(cardSelectors.join(", "));
        if (!root || seen.has(root)) continue;
        seen.add(root);
        cards.push(root);
      }
    }
    return cards;
  }

  const cards = findCards().slice(0, 8);
  return cards.map((card, i) => {
    const reviewTexts = [];
    for (const sel of reviewHintSelectors) {
      for (const el of Array.from(card.querySelectorAll(sel))) {
        const sources = {
          textContent: el.textContent?.trim() || null,
          tooltipHtml: el.getAttribute("data-tooltip-html") || null,
          tooltipText: el.getAttribute("data-tooltip-text") || null,
          tooltipContent: el.getAttribute("data-tooltip-content") || null,
          ariaLabel: el.getAttribute("aria-label") || null,
          title: el.getAttribute("title") || null,
          className: el.className || null,
        };
        const hasData = Object.values(sources).some(v => v && v !== sources.className);
        if (hasData) reviewTexts.push({ selector: sel, ...sources });
      }
    }

    const discountEl = card.querySelector(".discount_pct, .discount_block");
    return {
      index: i,
      title: card.querySelector(".title, .tab_item_name, .sale_capsule_discount_header, .apphub_AppName")?.textContent?.trim() || card.textContent?.slice(0,60).trim(),
      href: card.getAttribute("href")?.slice(0, 80) || null,
      discountText: discountEl?.textContent?.trim() || null,
      reviewTexts,
      cardClasses: card.className,
      cardOuterHtmlSnippet: card.outerHTML.slice(0, 400),
    };
  });
})()`;

async function sendEval(wsUrl: string, expression: string): Promise<unknown> {
  const ws = new WebSocket(wsUrl);
  await new Promise<void>((resolve, reject) => { ws.once("open", resolve); ws.once("error", reject); });
  try {
    const result = await new Promise<any>((resolve, reject) => {
      ws.once("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg);
      });
      ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression, awaitPromise: true, returnByValue: true } }));
    });
    return result.result?.result?.value;
  } finally {
    ws.close();
  }
}

const targets = await fetchTargets(8080);
const target = findStoreTarget(targets);
if (!target) { console.error("Steam Store 타겟을 찾지 못했습니다. Steam 상점 페이지를 열어두세요."); process.exit(1); }

console.log(`타겟: ${target.title} — ${target.url}\n`);
const data = await sendEval(target.webSocketDebuggerUrl!, DIAG_PAYLOAD) as any[];

if (!data || !data.length) { console.log("카드를 찾지 못했습니다."); process.exit(0); }

for (const card of data) {
  console.log(`\n=== 카드 ${card.index}: ${card.title}`);
  console.log(`  클래스: ${card.cardClasses}`);
  console.log(`  할인: ${card.discountText}`);
  if (card.reviewTexts.length === 0) {
    console.log("  리뷰 요소: 없음 (REVIEW_HINT_SELECTORS에 매칭 없음)");
    console.log(`  HTML 스니펫: ${card.cardOuterHtmlSnippet}`);
  } else {
    for (const rt of card.reviewTexts) {
      console.log(`  [${rt.selector}] class=${rt.className}`);
      if (rt.textContent) console.log(`    textContent: ${rt.textContent.slice(0,100)}`);
      if (rt.tooltipHtml) console.log(`    tooltip-html: ${rt.tooltipHtml.slice(0,150)}`);
      if (rt.tooltipText) console.log(`    tooltip-text: ${rt.tooltipText.slice(0,150)}`);
      if (rt.tooltipContent) console.log(`    tooltip-content: ${rt.tooltipContent.slice(0,150)}`);
      if (rt.ariaLabel) console.log(`    aria-label: ${rt.ariaLabel.slice(0,150)}`);
      if (rt.title) console.log(`    title: ${rt.title.slice(0,150)}`);
    }
  }
}
