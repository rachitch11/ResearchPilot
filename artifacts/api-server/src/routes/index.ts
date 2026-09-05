import { Router, type IRouter } from "express";
import aiRouter from "./ai";
import healthRouter from "./health";
import researchRouter from "./research";
import searchRouter from "./search";
import webpageRouter from "./webpage";
import sourceClassificationRouter from "./source-classification";

const router: IRouter = Router();

router.use(healthRouter);
router.use(aiRouter);
router.use(researchRouter);
router.use(searchRouter);
router.use(webpageRouter);
router.use(sourceClassificationRouter);

export default router;
