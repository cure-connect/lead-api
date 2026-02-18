print("WARNING: This will remove old fields: deposit.slipUrl and receiptUrl");
print("Make sure migration is complete and tested!\n");

// Remove deposit.slipUrl
print("Removing deposit.slipUrl field...");

const depositCleanup = db.appointments.updateMany(
    { "deposit.slipUrl": { $exists: true } },
    { $unset: { "deposit.slipUrl": "" } }
);

print("Removed deposit.slipUrl from " + depositCleanup.modifiedCount + " documents");

// Remove receiptUrl
print("\nRemoving receiptUrl field...");

const receiptCleanup = db.appointments.updateMany(
    { "receiptUrl": { $exists: true } },
    { $unset: { "receiptUrl": "" } }
);

print("Removed receiptUrl from " + receiptCleanup.modifiedCount + " documents");

print("\nCleanup Summary:");
print("- deposit.slipUrl removed: " + depositCleanup.modifiedCount + " documents");
print("- receiptUrl removed: " + receiptCleanup.modifiedCount + " documents");

print("\nCleanup completed!");
print("You can now use the clean schema (appointment-clean.ts)");