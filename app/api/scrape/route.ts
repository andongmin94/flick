import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { kv } from '@vercel/kv'; // Vercel KV 사용

// 서버리스 환경에 최적화
export const runtime = 'edge';
export const maxDuration = 10;

const ruliweb =
  "https://bbs.ruliweb.com/best/humor_only/now?orderby=recommend&range=24h&m=humor_only&t=now&page=";

// 루리웹 스크래핑 함수
async function scrapeRuliweb(page: number) {
  const cacheKey = `ruliweb_page_${page}`;
  
  // Vercel KV에서 캐시 데이터 확인
  const cachedData = await kv.get(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    // 타임아웃 설정
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(ruliweb + page, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    clearTimeout(timeoutId);
    
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
    
    // Vercel KV에 캐시 저장 (30분)
    await kv.set(cacheKey, data, { ex: 1800 });
    
    return data;
  } catch (error) {
    console.error('Error scraping Ruliweb:', error);
    return { titles: [] };
  }
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

// 캐시 지우기 엔드포인트
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  
  if (key === process.env.CACHE_CLEAR_KEY) {
    // 특정 패턴의 키만 삭제
    const keys = await kv.keys("ruliweb_page_*");
    if (keys.length > 0) {
      await kv.del(...keys);
    }
    return NextResponse.json({ message: "Cache cleared" });
  }
  
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}