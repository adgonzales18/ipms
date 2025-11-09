import mongoose from "mongoose";
import TransactionModel from "../models/Transaction.js";
import ProductModel from "../models/Product.js";   
import LocationModel from "../models/Location.js";   
import CompanyModel from "../models/Company.js";   

const createTransaction = async (req, res) => {
    try {
        const {
          type,
          products,
          fromLocationId,
          toLocationId,
          companyId,
          linkedTransactionId,
          deliverTo,
          deliveryDate,
          status, // Optional: can be 'draft' or 'pending'
        } = req.body;
    
        // ✅ Validate transaction type
        if (!["sale", "purchase", "inbound", "outbound", "transfer"].includes(type)) {
          return res.status(400).json({ success: false, message: "Invalid transaction type" });
        }
    
        // ✅ Company validation only for sale & purchase
        let company = null;
        if (["sale", "purchase"].includes(type)) {
          if (!companyId)
            return res.status(400).json({ success: false, message: "Company is required" });
    
          company = await CompanyModel.findById(companyId);
          if (!company)
            return res.status(404).json({ success: false, message: "Company not found" });
        }
    
        // ✅ Location validation
        let fromLocation = null;
        let toLocation = null;
    
        if (["sale", "outbound", "transfer"].includes(type)) {
          if (!fromLocationId)
            return res.status(400).json({ success: false, message: "fromLocation required" });
    
          fromLocation = await LocationModel.findById(fromLocationId);
          if (!fromLocation)
            return res.status(400).json({ success: false, message: "Invalid fromLocation" });
        }
    
        if (["inbound", "transfer", "purchase"].includes(type)) {
          if (!toLocationId)
            return res.status(400).json({ success: false, message: "toLocation required" });
    
          toLocation = await LocationModel.findById(toLocationId);
          if (!toLocation)
            return res.status(400).json({ success: false, message: "Invalid toLocation" });
        }
    
        // ✅ Build product snapshot
        const productsWithDetails = await Promise.all(
          products.map(async (p) => {
            const product = await ProductModel.findById(p.productId);
            if (!product) throw new Error(`Product not found: ${p.productId}`);
    
            const entry = {
              product: p.productId,
              quantity: Number(p.quantity),
              receivedQuantity: Number(p.receivedQuantity || 0),
              costPriceAtTransaction: Number(product.costPrice || 0),
              sellingPrice: Number(product.sellingPrice || 0),
              transactionSellingPrice: 0,
              unitPrice: 0,
              discountPercent: 0,
              discountedPrice: 0,
            };
    
            // 🧾 Purchase logic
            if (type === "purchase") {
              const unitPrice = Number(p.unitPrice || product.costPrice || 0);
              const discount = Number(p.discountPercent || 0);
              const discountedPrice = unitPrice * (1 - discount / 100);
    
              entry.unitPrice = unitPrice;
              entry.discountPercent = discount;
              entry.discountedPrice = discountedPrice;
            }
    
            // 💰 Sale logic
            if (type === "sale") {
              const actualPrice =
                p.customPrice !== undefined && !isNaN(p.customPrice)
                  ? Number(p.customPrice)
                  : Number(product.sellingPrice || 0);
    
              const discount = Number(p.discountPercent || 0);
              const discountedPrice = actualPrice * (1 - discount / 100);
    
              entry.transactionSellingPrice = actualPrice;
              entry.unitPrice = actualPrice;
              entry.discountPercent = discount;
              entry.discountedPrice = discountedPrice;
            }
    
            return entry;
          })
        );
    
        // ✅ Validate status if provided
        const transactionStatus = status && ["draft", "pending"].includes(status) ? status : "pending";

        // ✅ For transfer transactions, auto-create product instances in target location
        if (type === "transfer" && toLocation) {
          console.log("🔵 Checking/creating product instances in target location for transfer...");

          for (const p of productsWithDetails) {
            const sourceProduct = await ProductModel.findById(p.product);
            if (!sourceProduct) {
              console.log(`⚠️ Source product ${p.product} not found, skipping...`);
              continue;
            }

            // Check if product exists in target location
            const targetProduct = await ProductModel.findOne({
              itemCode: sourceProduct.itemCode,
              locationId: toLocation._id,
            });

            if (!targetProduct) {
              // Product doesn't exist in target location, create new instance with stock = 0
              console.log(`✅ Creating product instance: ${sourceProduct.productName} in target location`);
              await ProductModel.create({
                productName: sourceProduct.productName,
                productDescription: sourceProduct.productDescription,
                costPrice: sourceProduct.costPrice,
                sellingPrice: sourceProduct.sellingPrice,
                stock: 0, // ✅ Start with 0 stock, will be updated when transfer is approved
                categoryId: sourceProduct.categoryId,
                locationId: toLocation._id,
                itemCode: sourceProduct.itemCode,
              });
            } else {
              console.log(`✅ Product ${sourceProduct.productName} already exists in target location`);
            }
          }
        }

        // ✅ Create transaction record
        const transaction = await TransactionModel.create({
          type,
          company: company ? company._id : undefined,
          products: productsWithDetails,
          fromLocation: fromLocation?._id,
          toLocation: toLocation?._id,
          linkedTransaction: linkedTransactionId || undefined,
          requestedBy: req.user._id,
          status: transactionStatus,
          deliverTo: deliverTo || "",
          deliveryDate: deliveryDate || null,
        });

        // 🚫 DO NOT auto-create inbound here (it will be created upon approval)
        res.status(201).json({ success: true, data: transaction });
      } catch (err) {
        console.error("Create Transaction Error:", err);
        res.status(500).json({ success: false, message: err.message || "Server error" });
      }
    };
    
   
    const getTransactions = async (req, res) => {
      try {
        const { status, type, fromDate, toDate } = req.query;
        const filter = {};
    
        if (req.user.role !== "admin") filter.requestedBy = req.user._id;
        if (status) filter.status = status;
        if (type) filter.type = type;
        if (fromDate && toDate)
          filter.createdAt = { $gte: new Date(fromDate), $lte: new Date(toDate) };

        const transactions = await TransactionModel.find(filter)
          .populate("company", "companyName companyEmail")
          .populate("linkedTransaction", "type _id status poNumber")
          .populate("requestedBy", "name email")
          .populate("approvedBy", "name email")
          .populate("products.product", "productName itemCode stock costPrice sellingPrice")
          .populate("fromLocation", "locationName")
          .populate("toLocation", "locationName")
          .sort({ createdAt: -1 });
    
        // 🚫 Hide margin & profit for non-admins
        if (req.user.role !== "admin") {
          transactions.forEach((t) => {
            t.products.forEach((p) => {
              p.costPriceAtTransaction = undefined;
              p.sellingPrice = undefined;
            });
          });
        }
    
        res.status(200).json({ success: true, data: transactions });
      } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({ success: false, message: "Error fetching transactions" });
      }
    };
    
    const getTransactionById = async (req, res) => {
      try {
        const { id } = req.params;

        const transaction = await TransactionModel.findById(id)
          .populate("company")
          .populate("fromLocation")
          .populate("toLocation")
          .populate("requestedBy", "name email role")
          .populate("approvedBy", "name email role")
          .populate("linkedTransaction")
          .populate("products.product");

        if (!transaction) {
          return res
            .status(404)
            .json({ success: false, message: "Transaction not found" });
        }

        res.status(200).json({ success: true, data: transaction });
      } catch (err) {
        console.error("Get Transaction By ID Error:", err);
        res.status(500).json({ success: false, message: "Server error" });
      }
    };
    
 
    const updateInboundTransaction = async (req, res) => {
      try {
        const { id } = req.params;
        const { products, note } = req.body;

        const transaction = await TransactionModel.findById(id);
        if (!transaction)
          return res.status(404).json({ success: false, message: "Transaction not found" });

        if (transaction.type !== "inbound")
          return res.status(400).json({ success: false, message: "Not an inbound transaction" });
    
        if (Array.isArray(products)) {
          for (const update of products) {
            const idx = transaction.products.findIndex(
              (p) => p.product.toString() === update.productId.toString()
            );
            if (idx > -1)
              transaction.products[idx].receivedQuantity = Number(update.receivedQuantity) || 0;
          }
        }
    
        if (typeof note === "string") transaction.note = note;
        await transaction.save();
    
        res.status(200).json({
          success: true,
          message: "Inbound transaction updated successfully",
          data: transaction,
        });
      } catch (err) {
        console.error("UpdateInboundTransaction error:", err);
        res.status(500).json({ success: false, message: "Server error" });
      }
    };

    const updatePurchaseTransaction = async (req, res) => {
      try {
        const { id } = req.params;
        const { products, toLocationId, companyId, deliverTo, deliveryDate } = req.body;

        const transaction = await TransactionModel.findById(id);
        if (!transaction)
          return res.status(404).json({ success: false, message: "Transaction not found" });

        if (transaction.type !== "purchase")
          return res.status(400).json({ success: false, message: "Not a purchase transaction" });
    
        if (!["pending", "draft"].includes(transaction.status))
          return res.status(400).json({ success: false, message: "Can only edit pending or draft transactions" });
    
        // Update products if provided
        if (Array.isArray(products) && products.length > 0) {
          const productsWithDetails = await Promise.all(
            products.map(async (p) => {
              const product = await ProductModel.findById(p.productId);
              if (!product) throw new Error(`Product not found: ${p.productId}`);
    
              const unitPrice = Number(p.unitPrice || product.costPrice || 0);
              const discount = Number(p.discountPercent || 0);
              const discountedPrice = unitPrice * (1 - discount / 100);
    
              return {
                product: p.productId,
                quantity: Number(p.quantity),
                receivedQuantity: Number(p.receivedQuantity || 0),
                costPriceAtTransaction: Number(product.costPrice || 0),
                sellingPrice: Number(product.sellingPrice || 0),
                transactionSellingPrice: 0,
                unitPrice: unitPrice,
                discountPercent: discount,
                discountedPrice: discountedPrice,
              };
            })
          );
          transaction.products = productsWithDetails;
        }
    
        // Update other fields if provided
        if (toLocationId) {
          const toLocation = await LocationModel.findById(toLocationId);
          if (!toLocation)
            return res.status(400).json({ success: false, message: "Invalid toLocation" });
          transaction.toLocation = toLocationId;
        }
    
        if (companyId) {
          const company = await CompanyModel.findById(companyId);
          if (!company)
            return res.status(404).json({ success: false, message: "Company not found" });
          transaction.company = companyId;
        }
    
        if (deliverTo !== undefined) transaction.deliverTo = deliverTo;
        if (deliveryDate !== undefined) transaction.deliveryDate = deliveryDate;
    
        await transaction.save();
    
        res.status(200).json({
          success: true,
          message: "Purchase transaction updated successfully",
          data: transaction,
        });
      } catch (err) {
        console.error("UpdatePurchaseTransaction error:", err);
        res.status(500).json({ success: false, message: err.message || "Server error" });
      }
    };
    
    
    const approveTransaction = async (req, res) => {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const { id } = req.params;
        console.log("🔵 Approving transaction:", id);
        const transaction = await TransactionModel.findById(id)
          .populate("products.product")
          .populate("linkedTransaction")
          .session(session);

        if (!transaction) {
          console.log("❌ Transaction not found:", id);
          return res.status(404).json({ success: false, message: "Transaction not found" });
        }
        if (transaction.status !== "pending") {
          console.log("❌ Transaction already processed:", transaction.status);
          return res.status(400).json({ success: false, message: "Transaction already processed" });
        }

        console.log("✅ Transaction found:", transaction.type, "Status:", transaction.status);
    
        switch (transaction.type) {
          case "sale":
          case "outbound":
            for (const p of transaction.products) {
              const product = await ProductModel.findById(p.product._id).session(session);
              if (!product) continue;
              if (product.stock < p.quantity)
                throw new Error(`Not enough stock for ${product.productName}`);
              product.stock -= p.quantity;
              await product.save({ session });
            }
            break;
    
          case "purchase": {
            const existingInbound = await TransactionModel.findOne({
              linkedTransaction: transaction._id,
              type: "inbound",
            }).session(session);

            if (!existingInbound) {
              console.log("🔵 Creating linked inbound transaction...");

              // ✅ Create product instances in target location if they don't exist
              console.log("🔵 Checking/creating product instances in target location...");
              const inboundProducts = []; // Store product mappings for inbound transaction

              for (const p of transaction.products) {
                const product = await ProductModel.findById(p.product._id).session(session);
                if (!product) {
                  console.log(`⚠️ Product ${p.product._id} not found, skipping...`);
                  continue;
                }

                // Check if product exists in target location
                let targetProduct = await ProductModel.findOne({
                  itemCode: product.itemCode,
                  locationId: transaction.toLocation,
                }).session(session);

                if (!targetProduct) {
                  // Product doesn't exist in target location, create new instance with stock = 0
                  console.log(`✅ Creating product instance: ${product.productName} in target location`);
                  const newProducts = await ProductModel.create(
                    [
                      {
                        productName: product.productName,
                        productDescription: product.productDescription,
                        costPrice: product.costPrice,
                        sellingPrice: product.sellingPrice,
                        stock: 0, // ✅ Start with 0 stock, will be updated when inbound is approved
                        categoryId: product.categoryId,
                        locationId: transaction.toLocation,
                        itemCode: product.itemCode,
                      },
                    ],
                    { session }
                  );
                  targetProduct = newProducts[0]; // Get the created product
                } else {
                  console.log(`✅ Product ${product.productName} already exists in target location`);
                }

                // ✅ Store the target product ID for the inbound transaction
                inboundProducts.push({
                  product: targetProduct._id, // ✅ Use target location product ID
                  quantity: p.quantity,
                  expectedQuantity: p.quantity,
                  receivedQuantity: 0,
                  costPriceAtTransaction: p.costPriceAtTransaction,
                  unitPrice: p.unitPrice,
                  sellingPrice: p.sellingPrice,
                  discountPercent: p.discountPercent,
                  discountedPrice: p.discountedPrice,
                });
              }

              // Create the inbound transaction with target location product IDs
              await TransactionModel.create(
                [
                  {
                    type: "inbound",
                    company: transaction.company,
                    products: inboundProducts, // ✅ Use target location product IDs
                    toLocation: transaction.toLocation,
                    linkedTransaction: transaction._id,
                    requestedBy: transaction.requestedBy,
                    deliverTo: transaction.deliverTo,
                    deliveryDate: transaction.deliveryDate,
                    status: "pending",
                  },
                ],
                { session }
              );
              console.log("✅ Linked inbound transaction created");
            }
            break;
          }
    
          case "inbound":
            for (const p of transaction.products) {
              const product = await ProductModel.findById(p.product._id).session(session);
              if (!product) continue;

              const receivedQty =
                p.receivedQuantity !== undefined && p.receivedQuantity !== null
                  ? Number(p.receivedQuantity)
                  : Number(p.quantity || 0);

              if (receivedQty > 0) {
                // Check if product exists in target location
                let targetProduct = await ProductModel.findOne({
                  itemCode: product.itemCode,
                  locationId: transaction.toLocation,
                }).session(session);

                if (targetProduct) {
                  // Product exists in target location, add stock
                  targetProduct.stock += receivedQty;
                  await targetProduct.save({ session });
                } else {
                  // Product doesn't exist in target location, create new instance
                  await ProductModel.create(
                    [
                      {
                        productName: product.productName,
                        productDescription: product.productDescription,
                        costPrice: product.costPrice,
                        sellingPrice: product.sellingPrice,
                        stock: receivedQty,
                        categoryId: product.categoryId,
                        locationId: transaction.toLocation,
                        itemCode: product.itemCode,
                      },
                    ],
                    { session }
                  );
                }
              }
            }

            if (transaction.linkedTransaction) {
              const purchase = await TransactionModel.findById(transaction.linkedTransaction).session(session);
              if (purchase && purchase.status === "pending") {
                purchase.status = "approved";
                purchase.approvedBy = req.user._id;
                purchase.approvedAt = new Date();
                await purchase.save({ session });
              }
            }
            break;
    
          case "transfer":
            for (const p of transaction.products) {
              const product = await ProductModel.findById(p.product._id).session(session);
              if (!product) continue;
              if (product.stock < p.quantity)
                throw new Error(`Not enough stock for ${product.productName}`);
    
              product.stock -= p.quantity;
              await product.save({ session });
    
              let targetProduct = await ProductModel.findOne({
                itemCode: product.itemCode,
                locationId: transaction.toLocation,
              }).session(session);
    
              if (targetProduct) {
                targetProduct.stock += p.quantity;
                await targetProduct.save({ session });
              } else {
                await ProductModel.create(
                  [
                    {
                      productName: product.productName,
                      productDescription: product.productDescription,
                      costPrice: product.costPrice,
                      sellingPrice: product.sellingPrice,
                      stock: p.quantity,
                      categoryId: product.categoryId,
                      locationId: transaction.toLocation,
                      itemCode: product.itemCode,
                    },
                  ],
                  { session }
                );
              }
            }
            break;
        }
    
        transaction.status = "approved";
        transaction.approvedBy = req.user._id;
        transaction.approvedAt = new Date();
        await transaction.save({ session });

        console.log("✅ Committing transaction...");
        await session.commitTransaction();
        session.endSession();

        console.log("✅ Transaction approved successfully:", transaction._id);
        res.status(200).json({
          success: true,
          message: `${transaction.type} transaction approved successfully`,
          data: transaction,
        });
      } catch (err) {
        console.error("❌ Approve Transaction Error:", err);
        console.error("❌ Error stack:", err.stack);
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ success: false, message: err.message });
      }
    };
    
    const rejectTransaction = async (req, res) => {
      try {
        const { id } = req.params;
        const transaction = await TransactionModel.findById(id);

        if (!transaction)
          return res.status(404).json({ success: false, message: "Transaction not found" });

        if (transaction.status !== "pending")
          return res.status(400).json({ success: false, message: "Transaction already processed" });

        transaction.status = "rejected";
        transaction.approvedBy = req.user._id;
        transaction.rejectedAt = new Date();
        await transaction.save();

        res.status(200).json({ success: true, data: transaction });
      } catch (err) {
        console.error("❌ Reject Transaction Error:", err);
        res.status(500).json({ success: false, message: "Server error" });
      }
    };
    
    const cancelTransaction = async (req, res) => {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const { id } = req.params;
        const transaction = await TransactionModel.findById(id).session(session);

        if (!transaction)
          return res.status(404).json({ success: false, message: "Transaction not found" });

        if (transaction.type !== "purchase")
          return res.status(400).json({ success: false, message: "Only purchase transactions can be cancelled" });

        if (transaction.status !== "approved")
          return res.status(400).json({ success: false, message: "Only approved transactions can be cancelled" });

        // Find and delete the linked inbound transaction
        const linkedInbound = await TransactionModel.findOne({
          linkedTransaction: transaction._id,
          type: "inbound",
        }).session(session);

        if (linkedInbound) {
          console.log(`🔵 Found linked inbound transaction: ${linkedInbound._id}, Status: ${linkedInbound.status}`);

          // If the inbound was already approved, we need to reverse the stock
          if (linkedInbound.status === "approved") {
            console.log("🔄 Reversing stock for approved inbound...");
            for (const p of linkedInbound.products) {
              const product = await ProductModel.findById(p.product).session(session);
              if (product) {
                const receivedQty = p.receivedQuantity !== undefined && p.receivedQuantity !== null
                  ? Number(p.receivedQuantity)
                  : Number(p.quantity || 0);

                if (receivedQty > 0) {
                  // Find the product in the target location
                  const targetProduct = await ProductModel.findOne({
                    itemCode: product.itemCode,
                    locationId: linkedInbound.toLocation,
                  }).session(session);

                  if (targetProduct) {
                    console.log(`  - Reversing ${receivedQty} units of ${product.productName}`);
                    targetProduct.stock -= receivedQty; // Reverse the stock addition
                    await targetProduct.save({ session });
                  }
                }
              }
            }
          } else {
            console.log(`✅ Inbound is ${linkedInbound.status}, no stock to reverse`);
          }

          // Delete the linked inbound transaction (regardless of status)
          console.log("🗑️ Deleting linked inbound transaction...");
          await TransactionModel.findByIdAndDelete(linkedInbound._id).session(session);
          console.log("✅ Linked inbound transaction deleted");
        } else {
          console.log("⚠️ No linked inbound transaction found");
        }

        // Mark the purchase transaction as cancelled
        transaction.status = "cancelled";
        transaction.cancelledAt = new Date();
        await transaction.save({ session });

        console.log("✅ Committing cancellation...");
        await session.commitTransaction();
        session.endSession();

        console.log("✅ Purchase order cancelled successfully:", transaction._id);
        res.status(200).json({
          success: true,
          message: "Purchase transaction cancelled and linked inbound deleted successfully",
          data: transaction,
        });
      } catch (err) {
        console.error("❌ Cancel Transaction Error:", err);
        console.error("❌ Error stack:", err.stack);
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ success: false, message: err.message || "Server error" });
      }
    };
    
// ✅ Move cancelled transaction to draft
const moveToDraft = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await TransactionModel.findById(id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    if (transaction.status !== "cancelled") {
      return res.status(400).json({ success: false, message: "Only cancelled transactions can be moved to draft" });
    }

    transaction.status = "draft";
    await transaction.save();

    res.json({ success: true, message: "Transaction moved to draft successfully", data: transaction });
  } catch (error) {
    console.error("❌ Move to draft error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Resubmit cancelled transaction
const resubmitTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await TransactionModel.findById(id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    if (transaction.status !== "cancelled") {
      return res.status(400).json({ success: false, message: "Only cancelled transactions can be resubmitted" });
    }

    transaction.status = "pending";
    await transaction.save();

    res.json({ success: true, message: "Transaction resubmitted for approval", data: transaction });
  } catch (error) {
    console.error("❌ Resubmit error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Delete draft transaction
const deleteDraftTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await TransactionModel.findById(id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    if (transaction.status !== "draft") {
      return res.status(400).json({ success: false, message: "Only draft transactions can be deleted" });
    }

    await TransactionModel.findByIdAndDelete(id);

    res.json({ success: true, message: "Draft transaction deleted successfully" });
  } catch (error) {
    console.error("❌ Delete draft error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Submit draft transaction for approval
const submitDraftTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await TransactionModel.findById(id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    if (transaction.status !== "draft") {
      return res.status(400).json({ success: false, message: "Only draft transactions can be submitted" });
    }

    transaction.status = "pending";
    await transaction.save();

    res.json({ success: true, message: "Draft submitted for approval", data: transaction });
  } catch (error) {
    console.error("Submit draft error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateInboundTransaction,
  updatePurchaseTransaction,
  approveTransaction,
  rejectTransaction,
  cancelTransaction,
  deleteDraftTransaction,
  submitDraftTransaction,
  moveToDraft,
  resubmitTransaction,
};