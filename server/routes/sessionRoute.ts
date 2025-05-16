import { Router } from "express";
import  {CreateSession,getSessionData,getAllSessions} from "../controllers/sessionController"

const router =  Router()


router.post("/",CreateSession)
router.get("/:id",getSessionData)
router.post("/getAll",getAllSessions)


export default router 


