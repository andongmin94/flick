"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import ContentBody from "@/components/content-body";

export default function Component() {
  const [titles, setTitles] = useState<{ title: string; href: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    async function fetchData(page: number) {
      try {
        const response = await fetch(`/api/scrape?page=${page}`);
        const data = await response.json();
        setTitles(data.ruliweb.titles);
      } catch (error) {
        setError("데이터를 불러오는데 실패했습니다");
      }
    }

    fetchData(currentPage);
  }, [currentPage]);

  const handleClearCache = async () => {
    try {
      const response = await fetch("/api/scrape", {
        method: "DELETE",
      });
      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.error("Error clearing cache:", error);
      alert("캐시를 지우는데 실패했습니다");
    }
  };

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen text-red-500">
        <Card className="border-4 border-red-500 shadow-lg">
          <CardContent className="pt-6 font-bold">{error}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden border-4 border-primary shadow-xl">
      <CardHeader className="bg-primary text-primary-foreground">
        <CardTitle className="text-3xl font-bold text-center">
          <Image
            src={"/icon.png"}
            alt={`안동민`}
            width={60}
            height={60}
            className="mr-4 inline"
            onClick={handleClearCache}
          />
          안동민의 플릭
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ContentBody
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          titles={titles}
        />
      </CardContent>
    </Card>
  );
}
