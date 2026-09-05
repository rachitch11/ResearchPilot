import { Router, type IRouter } from "express";
import aiRouter from "./ai";
import healthRouter from "./health";
import researchRouter from "./research";
import searchRouter from "./search";

const router: IRouter = Router();

router.use(healthRouter);
router.use(aiRouter);
router.use(researchRouter);
router.use(searchRouter);

export default router;
