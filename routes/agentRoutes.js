import express from 'express';
const router = express.Router();


router.get('/add',(req,res)=>{
res.render('addAgent');
});


export default router;