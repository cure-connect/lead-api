import { Router } from "express";
import { createSettingController } from "../controllers/setting.controller";
import { getAllAdminController , getAdminByIdController, editAdminController, deleteAdminController} from "../controllers/admin.controller"
import { getAllBranchController, getBranchByIdController, editBranchController, deleteBranchController } from "../controllers/branch.controller"
import { getAllChannelController, getChannelByIdController, editChannelController, deleteChannelController } from "../controllers/channel.controller";
import { getAllInterestController, getInterestByIdController, editInterestController, deleteInterestController } from "../controllers/interest.controller";
import { apiKeyMiddleware } from "../middleware/auth.middlware";

const router = Router();

const API_KEY = process.env.API_KEY as string;

router.use(apiKeyMiddleware(API_KEY));

router.post('/setting/create', createSettingController)

//Admin
router.get('/setting/getadmin', getAllAdminController)
router.get('/setting/getadmin/:id', getAdminByIdController)
router.patch('/setting/editadmin/:id', editAdminController)
router.delete('/setting/deleteadmin/:id', deleteAdminController)

//Branch
router.get('/setting/getbranch', getAllBranchController)
router.get('/setting/getbranch/:id', getBranchByIdController)
router.patch('/setting/editbranch/:id', editBranchController)
router.delete('/setting/deletebranch/:id', deleteBranchController)

//Channel
router.get('/setting/getchannel', getAllChannelController)
router.get('/setting/getchannel/:id', getChannelByIdController)
router.patch('/setting/editchannel/:id', editChannelController)
router.delete('/setting/deletechannel/:id', deleteChannelController)

//Interest
router.get('/setting/getinterest', getAllInterestController)
router.get('/setting/getinterest/:id', getInterestByIdController)
router.patch('/setting/editinterest/:id', editInterestController)
router.delete('/setting/deleteinterest/:id', deleteInterestController)

export default router;