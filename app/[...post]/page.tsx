"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function PostPage() {
  const pathName = usePathname();
  const url = pathName.startsWith("/") ? pathName.slice(1) : pathName;

  const [postTitle, setPostTitle] = useState<string | null>(null);
  const [postContent, setPostContent] = useState<string | null>(null);
  const [comments, setComments] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPostContent = async () => {
      try {
        const response = await fetch(
          `/api/fetchRuliwebContent?url=${encodeURIComponent(url)}`
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

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
    <Card className="overflow-hidden border-4 border-primary shadow-xl rounded-none">
      <CardHeader className="bg-primary text-primary-foreground flex items-center justify-center">
        <p className="mt-16 h-36 text-6xl font-bold border-primary text-center">
          {postTitle}
        </p>
      </CardHeader>
      <CardContent className="p-4">
        {postContent && (
          <div className="prose prose-sm max-w-none">
            {postContent.split("\n").map((line, index) => {
              const imgMatch = line.match(/<img[^>]+src="([^">]+)"/);
              if (imgMatch) {
                return (
                  <Image
                    key={index}
                    src={imgMatch[1]}
                    alt={`Image ${index}`}
                    width={500}
                    height={300}
                    className="rounded-lg shadow-md mb-4 w-full"
                  />
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
            <h3 className="flex text-2xl font-semibold mb-4 items-center border-b-2 border-primary pb-2">
              <MessageCircle className="mr-2" /> 댓글
            </h3>
            <br />
            {comments.map(
              (comment, index) =>
                comment.trim() !== "" && (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-secondary p-3 rounded-lg mb-2 flex items-center border border-primary"
                  >
                    <Image
                      key={index}
                      src={"/flick.svg"}
                      alt={`flick`}
                      width={30}
                      height={30}
                      className="mr-4"
                    />
                    <div
                      dangerouslySetInnerHTML={{ __html: comment }}
                      className="flex-1"
                    />
                  </motion.div>
                )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
