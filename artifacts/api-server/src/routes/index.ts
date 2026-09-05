import { Router, type IRouter } from "express";
import aiRouter from "./ai";
import healthRouter from "./health";
import researchRouter from "./research";
import searchRouter from "./search";
import webpageRouter from "./webpage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(aiRouter);
router.use(researchRouter);
router.use(searchRouter);
router.use(webpageRouter);

export default router;
