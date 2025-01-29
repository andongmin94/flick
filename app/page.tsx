"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import FlickPage from "@/components/flick-page";
import ContentBody from "@/components/content-body";
import { encodeURL } from "@/lib/utils";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

function Component() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = searchParams.get("page");
  const [titles, setTitles] = useState<{ title: string; href: string }[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(Number(page) || 1);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    async function fetchData(page: number) {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/scrape?page=${page}`);
        const data = await response.json();
        setTitles(data.ruliweb.titles);
        setIsLoading(false);
      } catch (error) {
        alert("데이터를 불러오는데 실패했습니다");
      }
    }

    fetchData(currentPage);
  }, [currentPage]);

  useEffect(() => {
    if (page) {
      setCurrentPage(Number(page));
    }
  }, [page]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    router.push(`/?page=${newPage}`, { scroll: false });
  };

  // 상태 추가
  const [randomHref, setRandomHref] = useState<string>("");

  // 랜덤 링크 생성 함수
  const generateRandomHref = useCallback(() => {
    if (titles.length > 0) {
      const randomTitle = titles[Math.floor(Math.random() * titles.length)];
      return `/${encodeURL(randomTitle.href)}`;
    }
    return "#";
  }, [titles]); // titles를 의존성으로 추가

  // 마운트 시 초기 랜덤 링크 생성
  useEffect(() => {
    setRandomHref(generateRandomHref());
  }, [generateRandomHref]); // randomHref 대신 generateRandomHref 사용

  return (
    <Card className="relative rounded-none border-4 border-t-0 border-primary shadow-xl">
      <CardHeader className="sticky top-0 z-10 h-[128px] bg-primary p-3 text-primary-foreground">
        <a
          href={randomHref}
          onMouseDown={() => setRandomHref(generateRandomHref())}
          target="_blank"
        >
          <Button className="absolute top-14 ml-[600px]">랜덤</Button>
        </a>
        <CardTitle className="text-center text-6xl font-bold">
          {titles.length > 0 && (
            <Link
              // href={randomHref}
              // onMouseDown={() => setRandomHref(generateRandomHref())}
              href="#"
              onClick={() => {
                window.location.href = "/";
              }}
            >
              <Image
                src={"/typo.png"}
                alt={"typo"}
                width={180}
                height={0}
                className="inline hover:cursor-pointer"
              />
            </Link>
          )}
        </CardTitle>
      </CardHeader>
      <FlickPage
        className="sticky top-32 z-10 bg-white"
        currentPage={currentPage}
        setCurrentPage={handlePageChange}
      />
      <CardContent className="p-0">
        <ContentBody
          currentPage={currentPage}
          titles={titles}
          isLoading={isLoading}
        />
      </CardContent>
    </Card>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Component />
    </Suspense>
  );
}
