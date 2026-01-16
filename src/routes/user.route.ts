import { Router } from "express";
import {
    createUserConntroller,
    findAllUserController,
    findOneUserController,
    updateUserController,
    deleteUserController
} from "../controllers/user.controller"
import { apiKeyMiddleware } from "../middleware/auth.middlware";

const router = Router();

const API_KEY = process.env.API_KEY as string;

router.use(apiKeyMiddleware(API_KEY));

router.post('/user/create', createUserConntroller)
router.get('/user/getall', findAllUserController)
router.get('/user/getuserbyid/:id', findOneUserController)
router.patch('/user/edituser/:id', updateUserController)
router.delete('/user/deleteuser/:id', deleteUserController)

export default router;
