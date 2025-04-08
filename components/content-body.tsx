import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircleMore } from "lucide-react";

import { encodeURL } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ContentBodyProps {
  currentPage: number;
  titles: { title: string; href: string }[];
  isLoading: boolean;
}

export default function ContentBody({
  currentPage,
  titles,
  isLoading,
}: ContentBodyProps) {
  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <div className="flex h-[79.2vh] items-center justify-center pb-40 text-5xl font-bold">
          로딩 중...
        </div>
      ) : (
        <motion.div
          key={`titles-${currentPage}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <div className="h-full min-h-[79.2vh] p-4">
            {titles.map((post, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link href={`/${encodeURL(post.href)}`}>
                  <Button
                    variant="ghost"
                    className="group border-secondary hover:border-primary hover:bg-secondary mb-4 w-full justify-start overflow-hidden rounded-lg border-2 text-left transition-all duration-300 hover:cursor-pointer"
                  >
                    <div className="flex w-full items-center">
                      <div className="bg-primary text-primary-foreground group-hover:bg-secondary-foreground mr-3 rounded-full p-2 transition-colors duration-300">
                        <MessageCircleMore className="size-4" />
                      </div>
                      <div className="grow truncate">{post.title}</div>
                      <div className="bg-secondary-foreground text-secondary ml-2 rounded-full px-2 py-1 text-xs">
                        인기
                      </div>
                    </div>
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
