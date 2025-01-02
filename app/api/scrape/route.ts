import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { revalidateTag } from "next/cache";

const ruliweb =
  "https://bbs.ruliweb.com/best/humor_only/now?orderby=recommend&range=24h&m=humor_only&t=now&page=";

// 루리웹 스크래핑 함수
async function scrapeRuliweb(page: number) {
  const url = ruliweb + page;
  
  // Vercel의 fetch 캐싱 활용
  const response = await fetch(url, {
    next: {
      revalidate: 1800, // 30분 캐싱
      tags: [`ruliweb-page-${page}`], // 태그 기반 캐시 무효화를 위한 태그
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.status}`);
  }
  
  const text = await response.text();
  const $ = cheerio.load(text);
  const titles: { title: string; href: string }[] = [];

  // 최적화된 셀렉터와 데이터 추출
  $("tbody a.subject_link.deco").each((_, element) => {
    // 단순화된 텍스트 추출 (중첩 루프 제거)
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