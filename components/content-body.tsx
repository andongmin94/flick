import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircleMore } from "lucide-react";
import Link from "next/link";
import { encodeURL } from "@/lib/utils";

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
        <div className="flex items-center justify-center text-5xl font-bold h-[79.6vh] pb-40">
          로딩 중...
        </div>
      ) : (
        <motion.div
          key={`titles-${currentPage}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <div className="h-full p-4">
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
                    className="group mb-4 w-full justify-start overflow-hidden rounded-lg border-2 border-secondary text-left transition-all duration-300 hover:border-primary hover:bg-secondary"
                  >
                    <div className="flex w-full items-center">
                      <div className="mr-3 rounded-full bg-primary p-2 text-primary-foreground transition-colors duration-300 group-hover:bg-secondary-foreground">
                        <MessageCircleMore className="size-4" />
                      </div>
                      <div className="grow truncate">{post.title}</div>
                      <div className="ml-2 rounded-full bg-secondary-foreground px-2 py-1 text-xs text-secondary">
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
