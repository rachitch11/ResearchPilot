import { Router, type IRouter } from "express";
import aiRouter from "./ai";
import healthRouter from "./health";
import researchRouter from "./research";

const router: IRouter = Router();

router.use(healthRouter);
router.use(aiRouter);
router.use(researchRouter);

export default router;
