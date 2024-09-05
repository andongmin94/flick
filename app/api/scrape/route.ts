import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 1800 }); // 30분 동안 캐싱

const ruliweb =
  "https://bbs.ruliweb.com/best/humor_only/now?m=humor_only&t=default&page=";

// 루리웹 스크래핑 함수
async function scrapeRuliweb(page: number) {
  const cachedData = cache.get(ruliweb + page);
  if (cachedData) {
    return cachedData;
  }

  const response = await fetch(ruliweb + page);
  const text = await response.text();
  const $ = cheerio.load(text);
  const titles: { title: string; href: string }[] = [];

  $("div.col_9.text_wrapper a.title_wrapper").each((index, element) => {
    let textContent = "";
    $(element)
      .contents()
      .each((_, node) => {
        if (node.type === "text") {
          textContent += $(node).text().trim();
        }
      });
    const href = $(element).attr("href");
    if (textContent && href) {
      titles.push({ title: textContent, href });
    }
  });

  const data = { titles };
  cache.set(ruliweb + page, data);
  return data;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);

  try {
    const ruliwebData = await scrapeRuliweb(page);
    return NextResponse.json({ ruliweb: ruliwebData });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to scrape data" },
      { status: 500 },
    );
  }
}

// 캐시 지우기 엔드포인트 추가
export async function DELETE() {
  cache.flushAll();
  return NextResponse.json({ message: "Cache cleared" });
}
