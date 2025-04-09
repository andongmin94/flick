import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

const ruliweb =
  "https://bbs.ruliweb.com/best/humor_only/now?orderby=recommend&range=24h&m=humor_only&t=now&page=";

// 루리웹 스크래핑 함수 수정
async function scrapeRuliweb(page: number) {
  const targetUrl = ruliweb + page;
  // CORS 프록시 URL
  const proxyOptions = [
    "https://api.allorigins.win/raw?url=",
    "https://cors-anywhere.herokuapp.com/",
    "https://thingproxy.freeboard.io/fetch/",
    // corsproxy.io는 제외
  ];
  
  // 첫 번째 프록시로 시도
  const proxyUrl = proxyOptions[0];
  const url = proxyUrl + encodeURIComponent(targetUrl);
  
  // 직접 fetch 사용, 캐싱 제거 (프록시와 함께 사용하면 문제 발생 가능)
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.status}`);
  }
  
  const text = await response.text();
  const $ = cheerio.load(text);
  const titles: { title: string; href: string }[] = [];

  // 최적화된 셀렉터와 데이터 추출
  $("tbody a.subject_link.deco").each((_, element) => {
    const textContent = $(element).text().trim();
    const href = "https://bbs.ruliweb.com" + $(element).attr("href");
    
    if (textContent && href) {
      titles.push({ title: textContent, href });
    }
  });

  return { titles };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);

  try {
    const ruliwebData = await scrapeRuliweb(page);

    return NextResponse.json(
      { ruliweb: ruliwebData },
      {
        headers: {
          "Cache-Control":
            "max-age=1800, s-maxage=1800, stale-while-revalidate=3600",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching data:", error);
    return NextResponse.json(
      { error: "Failed to scrape data" },
      { status: 500 },
    );
  }
}

// 캐시 지우기 엔드포인트 추가 (태그 기반 무효화 적용)
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page");

  if (page) {
    // 특정 페이지 캐시만 무효화
    await revalidateTag(`ruliweb-page-${page}`);
    return NextResponse.json({ message: `Cache for page ${page} cleared` });
  } else {
    // 모든 페이지 캐시 무효화
    for (let i = 1; i <= 10; i++) {
      // 일반적인 페이지 범위 가정
      await revalidateTag(`ruliweb-page-${i}`);
    }
    return NextResponse.json({ message: "All cache cleared" });
  }
}
