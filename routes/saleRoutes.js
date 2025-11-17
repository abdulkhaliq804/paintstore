import express from 'express';  
import Product from "../models/Product.js";
import Sale from "../models/Sale.js";

const router = express.Router();

/* ================================
   🟢 1️⃣ Add Sale Page (GET)
================================ */
router.get("/add", async (req, res) => {
  try {
    // Fetching products by itemName and stockID
    const products = await Product.find();
    
    // Send products to the EJS template
    res.render("addSale", { products });
  } catch (err) {
    console.error("❌ Error loading Add Sale page:", err);
    res.status(500).send("Error loading Add Sale page");
  }
});


/* ================================
   🟢 2️⃣ Add Sale (POST)
   ✅ No FIFO logic, directly decrease stock
================================ */
// Add Sale (POST) - with FIFO logic removed but ensuring proper profit/loss calculation
router.post("/add", async (req, res) => {
  try {
    const { brandName, itemName, colourName, qty, quantitySold, rate, stockID,saleID } = req.body;
    let remainingToSell = parseInt(quantitySold);

    // ❌ Validation
    if (!itemName || !rate || !quantitySold || !stockID || !saleID) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    // 🟢 Find product by stockID
    const product = await Product.findOne({ stockID });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: `No available product found for ${itemName} (${qty}).`,
      });
    }

    const available = product.remaining;
    if (remainingToSell > available) {
      return res.status(400).json({
        success: false,
        message: `Not enough stock for ${itemName} (${qty}). Only ${available} units available.`,
      });
    }

    // 🧮 Profit calculation
    const purchaseRate = product.rate || 0;
    const saleProfit = (rate - purchaseRate) * remainingToSell;

    // 🟡 Reduce product stock
    product.remaining -= remainingToSell;
    await product.save();

    // 🆕 Always create new sale
    const sale = await Sale.create({
      brandName,
      itemName,
      colourName,
      qty,
      quantitySold: remainingToSell,
      rate,
      stockID,
      saleID,
      profit: saleProfit,
      refundQuantity: 0,
      refundStatus: "none",
    });

    return res.json({
      success: true,
      message: `Sale of ${remainingToSell} ${itemName} units completed successfully.`,
      profit: saleProfit.toFixed(2),
    });

  } catch (err) {
    console.error("❌ Error during sale:", err);
    res.status(500).json({
      success: false,
      message: "Server error: " + err.message,
    });
  }
});




/* ================================
   🟢 3️⃣ All Sales Page (GET)
   ✅ Includes Total Stats
================================ */


router.get("/all", async (req, res) => {
  try {
    let { filter, from, to, brand, itemName, colourName, unit ,refund} = req.query;
    let query = {};
    const now = new Date();
    let start, end;

    // 🗓 Date filters
    if (filter === "today") {
      start = new Date(now.setHours(0, 0, 0, 0));
      end = new Date();
    } else if (filter === "yesterday") {
      start = new Date();
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setHours(23, 59, 59, 999);
    } else if (filter === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date();
    } else if (filter === "lastMonth") {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (filter === "custom" && from && to) {
      start = new Date(from);
      start.setHours(0, 0, 0, 0);
      end = new Date(to);
      end.setHours(23, 59, 59, 999);
    }

    if (start && end) {
      query.createdAt = { $gte: start, $lte: end };
    }

    // 🟢 Brand filter
    if (brand && brand !== "all") {
      if (brand === "Weldon Paints") query.brandName = /weldon/i;
      else if (brand === "Sparco Paints") query.brandName = /sparco/i;
      else if (brand === "Value Paints") query.brandName = /value/i;
      else if (brand === "Other") query.brandName = { $in: ["", null] };
    }

    // 🟢 Item Name Filter
    if (itemName && itemName !== "all") {
      const knownNames = ["Weather Shield", "Emulsion", "Enamel"];
      if (itemName === "Other") query.itemName = { $nin: knownNames };
      else if (itemName === "Weather Shield") query.itemName = /weather shield/i;
      else if (itemName === "Emulsion") query.itemName = /emulsion/i;
      else if (itemName === "Enamel") query.itemName = /enamel/i;
    }

    // 🟢 Colour Filter
    if (colourName && colourName !== "all") {
      if (colourName === "Blue") query.colourName = /blue/i;
      else if (colourName === "Red") query.colourName = /red/i;
      else if (colourName === "Green") query.colourName = /green/i;
      else if (colourName === "Other") query.colourName = { $in: ["", null] };
    }

    
  

    // 🟢 Unit filter
    if (unit && unit !== "all") {
      if (unit === "Gallon") query.qty = /gallon/i;
      else if (unit === "Quarter") query.qty = /quarter/i;
      else if (unit === "Drum") query.qty = /drum/i;
      else if (unit === "Liter") query.qty = /liter/i;
      else if (unit === "Other") query.qty = { $in: ["", null] };
    }


   // 🟢 Refund Status Filter
if (refund && refund !== "all") {
  if (refund === "Partially Refunded") {
    query.refundStatus = "Partially Refunded";
  } else if (refund === "Fully Refunded") {
    query.refundStatus = "Fully Refunded";
  } else if (refund === "none") {
    query.refundStatus = "none";
  }
}


    const filteredSales = await Sale.find(query).sort({ createdAt: -1 });

    // ✅ Stats calculation considering refunds and refund amount
    let totalSold = 0,
        totalRevenue = 0,
        totalProfit = 0,
        totalLoss = 0,
        totalRefunded = 0;

    for (const s of filteredSales) {
      const product = await Product.findOne({ stockID: s.stockID });
      const purchaseRate = product ? product.rate || 0 : 0;

      // Net sold quantity after refunds
      let netSoldQty = s.quantitySold - (s.refundQuantity || 0);
      if (netSoldQty < 0) netSoldQty = 0;

      totalSold += netSoldQty;
      totalRevenue += netSoldQty * s.rate;

      // Refund **amount**
      totalRefunded += (s.refundQuantity || 0) * (s.rate || 0);

      // Profit calculation
      const saleProfit = (s.rate - purchaseRate) * netSoldQty;
      if (saleProfit > 0) totalProfit += saleProfit;
      else totalLoss += Math.abs(saleProfit);
    }

    res.render("allSales", {
      sales: filteredSales,
      stats: { totalSold, totalRevenue, totalProfit, totalLoss, totalRefunded },
      filter,
      from,
      to,
      selectedBrand: brand || "all",
      selectedItem: itemName || "all",
      selectedColour: colourName || "all",
      selectedUnit: unit || "all",
      selectedRefund: refund || "all"
    });

  } catch (err) {
    console.error("❌ Error loading All Sales:", err);
    res.status(500).send("Error loading sales page");
  }
});






/* ================================
   🟢 4️⃣ Delete Sale (DELETE)
================================ */
router.delete("/delete-sale/:id", async (req, res) => {
  try {
    const saleId = req.params.id;
    const deletedSale = await Sale.findByIdAndDelete(saleId);
    if (!deletedSale) {
      return res.status(404).json({ success: false, message: "Sale not found" });
    }
    res.json({ success: true, message: "Sale deleted successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error deleting sale" });
  }
});



router.get('/print', async (req, res) => {
  let sales = [];

  if (req.query.data) {
    // ✅ Data sent from frontend (tempSales)
    try {
      sales = JSON.parse(decodeURIComponent(req.query.data));
    } catch (err) {
      console.error("Error parsing print data:", err);
    }
  } else {
    // 🗄️ Fallback: load from DB if no query data found
    sales = await Sale.find().sort({ createdAt: -1 }).lean();
  }

  const currentDate = new Date().toLocaleString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', 
    day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' 
  });

  res.render('printSales', { sales, currentDate });
  // console.log("Received print data:", req.query.data);

});



export default router;
