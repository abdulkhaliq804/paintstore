import express from 'express';  
import Product from "../models/Product.js";
import Sale from "../models/Sale.js";
import Agent from '../models/Agent.js';
import Item from '../models/Item.js';
import { isLoggedIn } from "../middleware/isLoggedIn.js";
import { allowRoles } from "../middleware/allowRoles.js";
import moment from 'moment-timezone';


const router = express.Router();

/* ================================
   🟢 1️⃣ Add Sale Page (GET)
================================ */
router.get("/add",isLoggedIn,allowRoles("admin", "worker"), async (req, res) => {
  const role=req.user.role;
  try {
    // Fetch all products
    const products = await Product.find();

    // Fetch all agents
    const agents = await Agent.find();

    // Render EJS with products and agents
    res.render("addSale", { products, agents,role });
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
router.post("/add",isLoggedIn,allowRoles("admin", "worker"), async (req, res) => {
  try {
    const { sales, agentID, percentage } = req.body; // frontend se pura tempSales array bhejna

    if (!sales || !Array.isArray(sales) || sales.length === 0) {
      return res.status(400).json({ success: false, message: "No sales provided." });
    }

    let totalQuantityForAgent = 0;
    let totalAmountForAgent = 0;

    // loop through all sales and create Sale documents
    for (const s of sales) {
      const { brandName, itemName, colourName, qty, quantitySold, rate, stockID, saleID } = s;

      const product = await Product.findOne({ stockID });
      if (!product) return res.status(404).json({ success: false, message: `Product not found: ${itemName}` });

      if (quantitySold > product.remaining)
        return res.status(400).json({ success: false, message: `Only ${product.remaining} left for ${itemName}!` });

      const profit = Math.round(((rate - (product.rate || 0)) * quantitySold + Number.EPSILON) * 100)/100;
      product.remaining -= quantitySold;
      await product.save();

      await Sale.create({
        brandName,
        itemName,
        colourName,
        qty,
        quantitySold,
        rate,
        stockID,
        saleID,
        profit,
        refundQuantity: 0,
        refundStatus: "none"
      });

      if (agentID && percentage > 0) {
        totalQuantityForAgent += quantitySold;
        totalAmountForAgent += quantitySold * rate;
      }
    }

    // ✅ Agent Item creation once
    if (agentID && percentage > 0) {
      const agent = await Agent.findOne({ agentID });
      if (agent) {
        const percentageAmount = Math.round((totalAmountForAgent * percentage / 100 + Number.EPSILON) * 100) / 100;

        const agentItem = await Item.create({
          agent: agent._id,
          totalProductSold: totalQuantityForAgent,
          totalProductAmount: totalAmountForAgent,
          percentage,
          percentageAmount,
          paidStatus: "Unpaid"
        });

        agent.items.push(agentItem._id);
        await agent.save();
      }
    }

    res.json({ success: true, message: `All sales completed successfully.` });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error: " + err.message });
  }
});







/* ================================
   🟢 3️⃣ All Sales Page (GET)
   ✅ Includes Total Stats
================================ */
// PKT Time Zone Identifier
const PKT_TIMEZONE = 'Asia/Karachi';

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.get("/all", isLoggedIn, allowRoles("admin"), async (req, res) => {
    const role = req.user.role;
    try {
        let { filter, from, to, brand, itemName, colourName, unit, refund } = req.query;
        let query = {};
        let start, end;
        let dateOperator = '$lte';

        const nowPKT = moment().tz(PKT_TIMEZONE);
        
        // --- Date Filter Logic ---
        if (filter === "today" || filter === "yesterday" || filter === "month" || filter === "lastMonth") {
            if (filter === "today") {
                start = nowPKT.clone().startOf('day').toDate();
                end = nowPKT.clone().endOf('day').toDate();
            } else if (filter === "yesterday") {
                const yesterdayPKT = nowPKT.clone().subtract(1, 'days');
                start = yesterdayPKT.startOf('day').toDate();
                end = yesterdayPKT.endOf('day').toDate();
            } else if (filter === "month") {
                start = nowPKT.clone().startOf('month').toDate();
                end = nowPKT.clone().endOf('day').toDate(); 
            } else if (filter === "lastMonth") {
                const lastMonthPKT = nowPKT.clone().subtract(1, 'months');
                start = lastMonthPKT.startOf('month').toDate();
                end = lastMonthPKT.endOf('month').toDate();
            }
        } else if (filter === "custom" && from && to) {
            dateOperator = '$lt';
            const f = moment.tz(from, 'YYYY-MM-DD', PKT_TIMEZONE);
            let t = moment.tz(to, 'YYYY-MM-DD', PKT_TIMEZONE);
            t.add(1, 'days').startOf('day'); 
            if (f.isValid() && t.isValid()) {
                start = f.startOf('day').toDate();
                end = t.toDate();
            }
        }
        
        if (start && end) {
            query.createdAt = { $gte: start, [dateOperator]: end };
        }

        // --- Brand & Item Filters ---
        if (brand && brand !== "all") {
            if (brand === "Weldon Paints") query.brandName = /weldon/i;
            else if (brand === "Sparco Paints") query.brandName = /sparco/i;
            else if (brand === "Value Paints") query.brandName = /value/i;
            else if (brand === "Corona Paints") query.brandName = /Corona/i;
            else query.brandName = /Other Paints|Other/i;
        }

        if (itemName && itemName !== "all") {
            const knownNames = ["Weather Shield", "Emulsion", "Enamel"];
            if (itemName === "Other") query.itemName = { $nin: knownNames };
            else query.itemName = new RegExp(`^${itemName}$`, "i");
        }

        if (colourName && colourName !== "all") {
            query.colourName = new RegExp(`^${escapeRegExp(colourName)}$`, "i");
        }

        if (unit && unit !== "all") query.qty = new RegExp(unit, "i");
        if (refund && refund !== "all") query.refundStatus = refund;

        // --- OPTIMIZATION STARTS HERE ---
        
        // 1. Fetch Sales with .lean() for speed
        const filteredSales = await Sale.find(query).sort({ createdAt: -1 }).lean();

        // 2. Fetch all products in ONE go and create a Map (No more loop queries!)
        const allProducts = await Product.find({}, 'stockID rate').lean();
        const productMap = {};
        allProducts.forEach(p => {
            productMap[p.stockID] = parseFloat(p.rate || 0);
        });

        let totalSold = 0, totalRevenue = 0, totalProfit = 0, totalLoss = 0, totalRefunded = 0;
        const enrichedSales = [];

        // 3. Fast processing using the Map
        for (const s of filteredSales) {
            const purchaseRate = productMap[s.stockID] || 0;
            let netSoldQty = Math.max(0, s.quantitySold - (s.refundQuantity || 0));

            totalSold += netSoldQty;
            totalRevenue += netSoldQty * s.rate;
            totalRefunded += (s.refundQuantity || 0) * (s.rate || 0);

            const saleProfit = (s.rate - purchaseRate) * netSoldQty;
            if (saleProfit > 0) totalProfit += saleProfit;
            else totalLoss += Math.abs(saleProfit);

            // Adding purchaseRate to sale object for frontend
            enrichedSales.push({ ...s, purchaseRate });
        }

        const responseData = {
            sales: enrichedSales,
            stats: { 
                totalSold, 
                totalRevenue, 
                totalProfit, 
                totalLoss, 
                totalRefunded 
            },
            role, 
            filter, 
            from, 
            to,
            selectedBrand: brand || "all",
            selectedItem: itemName || "all",
            selectedColour: colourName || "all",
            selectedUnit: unit || "all",
            selectedRefund: refund || "all"
        };

        // --- AJAX Response ---
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            const ajaxStats = {
                totalSold: totalSold,
                totalRevenue: totalRevenue.toFixed(2),
                totalProfit: totalProfit.toFixed(2),
                totalLoss: totalLoss.toFixed(2),
                totalRefunded: totalRefunded.toFixed(2)
            };
            return res.json({ success: true, ...responseData, stats: ajaxStats });
        }

        // --- Regular Page Render ---
        res.render("allSales", responseData);

    } catch (err) {
        console.error("❌ Error loading All Sales:", err);
        res.status(500).send("Error loading sales page");
    }
});





/* ================================
   🟢 4️⃣ Delete Sale (DELETE)
================================ */
router.delete("/delete-sale/:id",isLoggedIn,allowRoles("admin"), async (req, res) => {
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



router.get('/print',isLoggedIn,allowRoles("admin", "worker"), async (req, res) => {
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

  let currentDate;
if (process.env.NODE_ENV === 'production') {
  // deployed server, force PKT
  currentDate = new Date().toLocaleString('en-US', { 
    timeZone: 'Asia/Karachi',
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
} else {
  // localhost, just use local time
  currentDate = new Date().toLocaleString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}



  res.render('printSales', { sales, currentDate });
  // console.log("Received print data:", req.query.data);

});



export default router;
