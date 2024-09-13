import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

interface FlickPageProps {
  className?: string;
  currentPage: number;
  setCurrentPage: (page: number) => void;
}

export default function FlickPage({
  className,
  currentPage,
  setCurrentPage,
}: FlickPageProps) {
  const handlePageChange = (page: number) => {
    if (page < 1) return;
    setCurrentPage(page);
  };

  return (
    <Pagination className={cn("py-2 border border-b-primary", className)}>
      <PaginationContent>
        <PaginationPrevious
          onClick={() => handlePageChange(currentPage - 1)}
          className="cursor-pointer"
        />
        {[currentPage].map((page) => (
          <PaginationItem key={page}>
            <PaginationLink
              isActive={page === currentPage}
              onClick={() => handlePageChange(page)}
            >
              {page}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationNext
          onClick={() => handlePageChange(currentPage + 1)}
          className="cursor-pointer"
        />
      </PaginationContent>
    </Pagination>
  );
}
