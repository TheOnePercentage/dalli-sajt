-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "notHelpfulVotes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "orderId" TEXT,
ADD COLUMN     "photos" JSONB,
ADD COLUMN     "userName" TEXT,
ADD COLUMN     "variantId" TEXT;
