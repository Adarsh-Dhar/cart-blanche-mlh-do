-- CreateTable
CREATE TABLE "SmartWallet" (
    "id" TEXT NOT NULL,
    "ownerEoa" TEXT NOT NULL,
    "smartWalletAddress" TEXT NOT NULL,
    "sessionKeyPublic" TEXT NOT NULL,
    "sessionKeyEncryptedPrivate" TEXT NOT NULL,
    "spendLimitUsdc" DECIMAL(10,2) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "chatId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmartWallet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SmartWallet_ownerEoa_key" ON "SmartWallet"("ownerEoa");

-- CreateIndex
CREATE UNIQUE INDEX "SmartWallet_smartWalletAddress_key" ON "SmartWallet"("smartWalletAddress");

-- CreateIndex
CREATE INDEX "SmartWallet_ownerEoa_idx" ON "SmartWallet"("ownerEoa");

-- CreateIndex
CREATE INDEX "SmartWallet_smartWalletAddress_idx" ON "SmartWallet"("smartWalletAddress");

-- AddForeignKey
ALTER TABLE "SmartWallet" ADD CONSTRAINT "SmartWallet_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
