import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { revalidateTag } from "next/cache";

const ruliweb =
  "https://bbs.ruliweb.com/best/humor_only/now?orderby=recommend&range=24h&m=humor_only&t=now&page=";

// 루리웹 스크래핑 함수
async function scrapeRuliweb(page: number) {
  return new Promise(async (resolve, reject) => {
    // 9초 타임아웃 설정 (10초보다 약간 짧게)
    const timeoutId = setTimeout(() => {
      // 타임아웃 시 현재까지 수집된 데이터로 완료
      if (titles.length > 0) {
        console.log(`Timeout reached but returning ${titles.length} items`);
        resolve({ titles, isPartial: true });
      } else {
        reject(new Error("Timeout and no data collected"));
      }
    }, 9000);

    const url = ruliweb + page;
    const titles: { title: string; href: string }[] = [];
    
    try {
      console.log(`Fetching page ${page} from ${url}`);
      const startTime = Date.now();
      
      // Vercel의 fetch 캐싱 활용
      const response = await fetch(url, {
        next: {
          revalidate: 1800,
          tags: [`ruliweb-page-${page}`],
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          'Referer': 'https://bbs.ruliweb.com/'
        }
      });
      
      console.log(`Fetch completed in ${Date.now() - startTime}ms`);
      
      if (!response.ok) {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to fetch data: ${response.status}`));
        return;
      }
      
      const text = await response.text();
      console.log(`Response body received in ${Date.now() - startTime}ms`);
      
      const $ = cheerio.load(text);
      
      // 데이터를 점진적으로 추출하고, 중간에 타임아웃이 발생해도 일부라도 반환
      $("tr a.deco").each((_, element) => {
        const textContent = $(element).text().trim();
        const href = "https://bbs.ruliweb.com" + $(element).attr("href");
        
        if (textContent && href) {
          titles.push({ title: textContent, href });
        }
      });
      
      // 모든 처리가 완료되면 타임아웃 취소하고 결과 반환
      clearTimeout(timeoutId);
      console.log(`Completed scraping in ${Date.now() - startTime}ms, found ${titles.length} titles`);
      resolve({ titles, isPartial: false });
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      // 일부 데이터라도 있으면 반환
      if (titles.length > 0) {
        console.log(`Error occurred but returning ${titles.length} items`);
        resolve({ titles, isPartial: true, error: error instanceof Error ? error.message : String(error) });
      } else {
        reject(error);
      }
    }
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);

  try {
    // 응답 자체도 Vercel Edge Network에서 캐싱되도록 헤더 설정
    const ruliwebData = await scrapeRuliweb(page);
    
    return NextResponse.json(
      { ruliweb: ruliwebData },
      {
        headers: {
          'Cache-Control': 'max-age=1800, s-maxage=1800, stale-while-revalidate=3600',
        },
      }
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
    for (let i = 1; i <= 10; i++) { // 일반적인 페이지 범위 가정
      await revalidateTag(`ruliweb-page-${i}`);
    }
    return NextResponse.json({ message: "All cache cleared" });
  }
}