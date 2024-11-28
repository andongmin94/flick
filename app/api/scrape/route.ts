import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 1800 }); // 30분 동안 캐싱

const ruliweb =
  "https://bbs.ruliweb.com/best/humor_only/now?orderby=recommend&range=24h&m=humor_only&t=now&page=";

// 루리웹 스크래핑 함수
async function scrapeRuliweb(page: number) {
  const cachedData = cache.get(ruliweb + page);
  if (cachedData){
    return cachedData;
  }

  const response = await fetch(ruliweb + page);
  const text = await response.text();
  const $ = cheerio.load(text);
  const titles: { title: string; href: string }[] = [];

  $("tr a.deco").each((_, element) => {
    // 최적화된 텍스트 추출 방법
    const textContent = $(element).clone().children().remove().end().text().trim();
    const href = $(element).attr("href");
    
    if (textContent && href) {
      titles.push({ 
        title: textContent, 
        href: "https://bbs.ruliweb.com" + href 
      });
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
    
    // HTTP 캐싱 헤더 추가
    return NextResponse.json({ ruliweb: ruliwebData }, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600'
      }
    });
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
