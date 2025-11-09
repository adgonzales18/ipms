import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
    poNumber: {type: String, unique: true, sparse: true},
    type: {
        type: String, 
        enum: ["purchase", "sale", "inbound", "outbound", "transfer"],
        required: true
    },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    fromLocation: { type: mongoose.Schema.Types.ObjectId, ref: "Location" },
    toLocation: { type: mongoose.Schema.Types.ObjectId, ref: "Location" },
    linkedTransaction: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },

    products: [
        {
          product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
          },
          quantity: { type: Number, required: true }, // Ordered or transacted qty
  
          // Purchase / Sale prices (captured as they were)
          costPriceAtTransaction: { type: Number, default: 0 },
          unitPrice: { type: Number, default: 0 },
          sellingPrice: { type: Number, default: 0 },
          transactionSellingPrice: { type: Number, default: 0 },
          discountPercent: { type: Number, default: 0 },
          discountedPrice: { type: Number, default: 0 },
  
          // 🟩 Inbound-related fields
          expectedQuantity: { type: Number }, // From linked PO
          receivedQuantity: { type: Number }, // Editable for partial deliveries
        },
      ],
      // Other transaction fields
      requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  
      status: {
        type: String,
        enum: ["draft", "pending", "approved", "rejected", "cancelled"],
        default: "pending",
      },
  
      deliverTo: { type: String, default: "" },
      deliveryDate: { type: Date },
  
      // Note field (for any remarks, inbound, etc.)
      note: { type: String, default: "" },
  
      approvedAt: { type: Date },
      rejectedAt: { type: Date },
      cancelledAt: { type: Date },
    },
    { timestamps: true }
);

transactionSchema.pre("save", async function (next) {
    try {
      // 🧩 Inbound transactions should NOT have a poNumber (to avoid duplicate key error)
      // The linkedTransaction field connects them to the purchase order
      if (this.type === "inbound") {
        this.poNumber = undefined;
        return next();
      }

      // 🧩 Only auto-generate PO number for PURCHASE transactions
      if (this.type !== "purchase") {
        this.poNumber = undefined;
        return next();
      }

      // Skip if already assigned manually
      if (this.poNumber) return next();
  
      const currentYear = new Date().getFullYear();
      const Transaction = mongoose.model("Transaction");
  
      const lastTransaction = await Transaction.findOne({
        type: "purchase",
        poNumber: new RegExp(`^${currentYear}-`),
      })
        .sort({ createdAt: -1 })
        .select("poNumber");
  
      let nextNumber = 1;
      if (lastTransaction?.poNumber) {
        const lastSeq = parseInt(lastTransaction.poNumber.split("-")[1], 10);
        if (!isNaN(lastSeq)) nextNumber = lastSeq + 1;
      }
  
      this.poNumber = `${currentYear}-${String(nextNumber).padStart(5, "0")}`;
      next();
    } catch (err) {
      console.error("PO number generation failed:", err);
      next(err);
    }
  });
  
  const TransactionModel = mongoose.model("Transaction", transactionSchema);
  export default TransactionModel;
  