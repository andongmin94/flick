"use client";

import { usePathname } from "next/navigation";
import React, { useRef, useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Image from "next/image";
import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { TitleInput } from "@/components/title-input";
import { decodeURL } from "@/lib/utils";
import WordRotate from "@/components/ui/word-rotate";

function AutoResizeDiv(props: any) {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (divRef.current) {
      divRef.current.style.height = "auto";
      divRef.current.style.height = divRef.current.scrollHeight + "px";
    }
  }, [props.value]);

  const handleInput = (e: any) => {
    props.onChange(e);
  };

  const handleMouseUp = () => {
    if (window.getSelection && divRef.current) {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        if (divRef.current.contains(range.commonAncestorContainer)) {
          try {
            const span = document.createElement("span");
            span.style.color = "yellow";
            range.surroundContents(span);
            selection.removeAllRanges();
          } catch (error) {
            // 에러가 발생해도 아무 작업도 하지 않음
          }
        }
      }
    }
  };

  const formatValue = (value: string) => {
    return value.replace(/\n/g, "<br>").replace(/ /g, "&nbsp;");
  };

  return (
    <div
      {...props}
      ref={divRef}
      onInput={handleInput}
      onMouseUp={handleMouseUp}
      style={{ overflow: "hidden", ...props.style }}
      dangerouslySetInnerHTML={{ __html: formatValue(props.value) }} // \n 문자를 <br>로, 공백 문자를 &nbsp;로 변환
    />
  );
}

export default function PostPage() {
  const pathName = usePathname();
  // URL 디코딩 추가
  const encodedUrl = pathName.startsWith("/") ? pathName.slice(1) : pathName;
  const url = decodeURL(encodedUrl);

  const [postTitle, setPostTitle] = useState<string | null>(null);
  const [postContent, setPostContent] = useState<string | null>(null);
  const [comments, setComments] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPostContent = async () => {
      try {
        const response = await fetch(
          `/api/fetchRuliwebContent?url=${encodeURIComponent(url)}`,
        );
        const data = await response.json();
        setPostTitle(data.title);
        setPostContent(data.content);
        setComments(data.comments);
        setLoading(false);
      } catch (error) {
        setError("게시글 내용을 불러오는데 실패했습니다");
        setLoading(false);
      }
    };

    fetchPostContent();
  }, [url]);

  // 상태 추가
  const [editableTitle, setEditableTitle] = useState<string>("");

  // useEffect에서 editableTitle 초기화
  useEffect(() => {
    if (postTitle) {
      setEditableTitle(postTitle);
    }
  }, [postTitle]);

  useEffect(() => {
    if (editableTitle) {
      document.title = `${editableTitle} - 플릭`;
    }
  }, [editableTitle]);

  if (loading) {
    return (
      <div className="flex h-[100.1vh] items-center justify-center bg-primary text-6xl font-bold text-primary-foreground">
        <p>로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500">
        <Card className="border-4 border-red-500 shadow-lg">
          <CardContent className="pt-6 font-bold">{error}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card className="relative rounded-none border-4 border-y-0 border-primary shadow-xl">
      <CardHeader className="sticky top-0 z-10 flex flex-col items-center justify-end space-y-0 border-primary bg-primary pb-2 pt-0 text-primary-foreground">
        <TitleInput
          className="bg-primary text-primary hover:bg-gray-700 hover:text-white"
          editableTitle={editableTitle}
          setEditableTitle={setEditableTitle}
        />
        <div className="flex h-auto w-full flex-col">
          <AutoResizeDiv
            value={editableTitle}
            onChange={(e: any) => setEditableTitle(e.currentTarget.innerHTML)}
            className="Pretendard-ExtraBold w-full resize-none bg-transparent text-center text-6xl focus:outline-none"
            style={{ lineHeight: "1.2" }}
          />
        </div>
      </CardHeader>
      <CardContent>
        {postContent && (
          <div className="prose prose-sm max-w-none">
            {postContent.split("\n").map((line, index) => {
              const imgMatch = line.match(/<img[^>]+src="([^">]+)"/);
              if (imgMatch) {
                return (
                  <div key={index} className="flex justify-center">
                    <Image
                      key={index}
                      src={imgMatch[1]}
                      alt={`Image ${index}`}
                      width={1000}
                      height={0}
                      className="mb-4 w-full rounded-lg shadow-md"
                    />
                  </div>
                );
              }
              return (
                <p key={index} dangerouslySetInnerHTML={{ __html: line }} />
              );
            })}
          </div>
        )}
        {comments && comments.length > 0 && (
          <div className="mt-8">
            <h3 className="mb-4 flex items-center border-b-2 border-primary pb-2 text-2xl font-semibold">
              {/* <MessageCircle className="mr-2" /> */}
              댓글
            </h3>
            {/* <br /> */}
            {comments.map(
              (comment, index) =>
                comment.trim() !== "" && (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="mb-2 flex items-center rounded-lg border border-primary bg-secondary p-3"
                  >
                    {/* <Image key={index} src={"/flick.svg"} alt={`flick`} width={30} height={30} className="mr-4" /> */}
                    <MessageCircle className="mr-3 size-8" />
                    <div
                      dangerouslySetInnerHTML={{ __html: comment }}
                      className="flex-1"
                    />
                  </motion.div>
                ),
            )}
          </div>
        )}
      </CardContent>
      <div className="sticky bottom-0 flex h-[250px] items-start justify-center border-primary bg-primary pb-12 text-center text-6xl font-bold text-primary-foreground">
        <WordRotate
          className="inline max-w-[450px] text-center text-3xl font-bold text-white"
          words={comments}
        />
      </div>
    </Card>
  );
}
