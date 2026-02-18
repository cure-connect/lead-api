print("Starting migration...");

// Migrate deposit.slipUrl -> deposit.slipUrls
print("\nMigrating deposit.slipUrl to deposit.slipUrls...");

const depositResult = db.appointments.updateMany(
  {
    "deposit.slipUrl": { $exists: true, $nin: [null, ""] },
    "deposit.slipUrls": { $exists: false }
  },
  [
    {
      $set: {
        "deposit.slipUrls": ["$deposit.slipUrl"]
      }
    }
  ]
);

print("Updated " + depositResult.modifiedCount + " documents with deposit.slipUrl");

// Migrate receiptUrl -> receiptUrls
print("\nMigrating receiptUrl to receiptUrls...");

const receiptResult = db.appointments.updateMany(
  {
    "receiptUrl": { $exists: true, $nin: [null, ""] },
    "receiptUrls": { $exists: false }
  },
  [
    {
      $set: {
        "receiptUrls": ["$receiptUrl"]
      }
    }
  ]
);

print("Updated " + receiptResult.modifiedCount + " documents with receiptUrl");

// Summary
print("\nMigration Summary:");
print("- deposit.slipUrl -> deposit.slipUrls: " + depositResult.modifiedCount + " documents");
print("- receiptUrl -> receiptUrls: " + receiptResult.modifiedCount + " documents");

// Verify
const verifyDeposit = db.appointments.countDocuments({
  "deposit.slipUrl": { $exists: true, $nin: [null, ""] },
  "deposit.slipUrls": { $exists: false }
});

const verifyReceipt = db.appointments.countDocuments({
  "receiptUrl": { $exists: true, $nin: [null, ""] },
  "receiptUrls": { $exists: false }
});

if (verifyDeposit === 0 && verifyReceipt === 0) {
  print("\nMigration completed successfully!");
} else {
  print("\nWarning: " + verifyDeposit + " deposit and " + verifyReceipt + " receipt documents still need migration");
}

print("\nDone!");