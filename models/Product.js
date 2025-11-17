import mongoose from 'mongoose';  // Correct way to import in ES Modules

// Define the product schema
const productSchema = new mongoose.Schema({
  brandName:{ 
    type: String 
  },
  itemName: { 
    type: String, 
    required: true 
  },
  colourName:{ 
    type: String 
  },
  qty: { 
    type: String 
  },
  totalProduct: { 
    type: Number, 
    required: true 
  },
  remaining: { 
    type: Number, 
    default: 0 
  },
  rate: { 
    type: Number, 
    required: true 
  },
  stockID: {  // Unique identifier for each batch of product
    type: String,
    required: true,
    unique: true,  // Make stockID unique for each batch
  },
  refundQuantity:{ 
    type: Number, 
    default: 0 
  }, 
  refundStatus:{ 
  type: String, 
  default: "none" 
  }
}, { timestamps: true });




// Create and export the Product model
export default mongoose.model("Product", productSchema);



