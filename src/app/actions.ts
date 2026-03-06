'use server'

import { prisma } from "@/lib/prisma"
import { Action } from "@prisma/client"

export async function getUniqueAssetNames() {
  try {
    const assets = await prisma.asset.findMany({
      select: { name: true },
      distinct: ['name'],
      orderBy: { name: 'asc' }
    });
    return { success: true, data: assets.map((a: { name: string }) => a.name) };
  } catch (error) {
    console.error("Failed to fetch asset names:", error);
    return { success: false, error: "Failed to load asset names." };
  }
}

// 💥 NEW: Fetches specific IDs, checks their availability, and calculates the total group quantity
export async function getAssetDetailsByName(name: string) {
  try {
    const assets = await prisma.asset.findMany({
      where: { name: name },
      orderBy: { id: 'asc' }
    });
    
    const totalAvailable = assets.filter(a => a.availableQuantity > 0).length;
    const totalCount = assets.length;

    return { 
      success: true, 
      data: {
        items: assets,
        summary: { available: totalAvailable, total: totalCount }
      } 
    };
  } catch (error) {
    console.error(`Failed to fetch assets for name ${name}:`, error);
    return { success: false, error: "Failed to load specific assets." };
  }
}

// 💥 NEW: Fetches all currently checked-out assets for the Live Overview UI
export async function getCheckedOutAssets() {
  try {
    const outAssets = await prisma.asset.findMany({
      where: { availableQuantity: 0 },
      include: {
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 1 // Gets the most recent log to see WHO currently has it
        }
      },
      orderBy: { name: 'asc' }
    });
    return { success: true, data: outAssets };
  } catch (error) {
    console.error("Failed to fetch overview:", error);
    return { success: false, error: "Failed to load overview." };
  }
}

// The Submission logic with strict duplication prevention
export async function submitAssetLog(formData: {
  assetIds: string[];
  issuedBy: string;
  issuedTo: string;
  emailAddress: string;
  action: Action;
  notes?: string;
}) {
  try {
    // --- TIME VALIDATION ---
    const now = new Date();
    const istDateString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const istDate = new Date(istDateString);
    const dayOfWeek = istDate.getDay(); 
    const currentHour = istDate.getHours();
    const currentMinute = istDate.getMinutes();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return { success: false, message: "The asset log form is only active Monday to Friday." };
    }

    const isAfterOpen = currentHour > 9 || (currentHour === 9 && currentMinute >= 30);
    const isBeforeClose = currentHour < 17 || (currentHour === 17 && currentMinute <= 30);
    
    if (!isAfterOpen || !isBeforeClose) {
      return { success: false, message: "The asset log form is only active from 9:30 AM to 5:30 PM (IST)." };
    }

    // --- TRANSACTION ---
    const results = await prisma.$transaction(async (tx) => {
      let messages: string[] = [];

      for (const assetId of formData.assetIds) {
        const asset = await tx.asset.findUnique({ where: { id: assetId } });
        
        if (!asset) {
          messages.push(`Asset ID ${assetId} not found.`);
          continue;
        }

        if (formData.action === 'CHECK_OUT') {
          if (asset.availableQuantity <= 0) {
            messages.push(`EXPLOIT BLOCKED: Asset ${assetId} is already checked out!`);
            continue;
          }
          await tx.asset.update({
            where: { id: assetId },
            data: { availableQuantity: asset.availableQuantity - 1 }
          });
          messages.push(`Asset ${assetId} checked out successfully.`);
        } 
        
        else if (formData.action === 'CHECK_IN') {
          if (asset.availableQuantity >= asset.totalQuantity) {
            messages.push(`EXPLOIT BLOCKED: Asset ${assetId} is already in the almirah!`);
            continue;
          }
          await tx.asset.update({
            where: { id: assetId },
            data: { availableQuantity: asset.availableQuantity + 1 }
          });
          messages.push(`Asset ${assetId} checked in successfully.`);
        }

        await tx.log.create({
          data: {
            assetId: asset.id,
            action: formData.action,
            issuedBy: formData.issuedBy,
            issuedTo: formData.issuedTo,
            emailAddress: formData.emailAddress,
            notes: formData.notes || "",
          }
        });
      }
      return messages;
    });

    const hasErrors = results.some((msg: string) => msg.includes('not found') || msg.includes('EXPLOIT'));
    return { success: !hasErrors, message: results.join('\n') };

  } catch (error) {
    console.error("Submission error:", error);
    return { success: false, message: "An unexpected error occurred during submission." };
  }
}