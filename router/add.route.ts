import { Router } from "express";
import { addController } from "../controller/add";


const router = Router()

router.post("/add", addController);

export default router;