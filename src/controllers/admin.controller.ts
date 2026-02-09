import { Request, Response } from "express";
import {
    getAllAdmin,
    getAdminById,
    editAdminName,
    deleteAdminById,
} from "../services/setting.service"

export const getAllAdminController = async (req: Request, res: Response) => {
    try {
        const result = await getAllAdmin();
        res.status(200).json({
            data: result,
        });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
}

export const getAdminByIdController = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ message: 'id must be a number' });
        }

        const result = await getAdminById(id);

        if (!result) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        return res.status(200).json({ data: result });
    } catch (err: any) {
        return res.status(500).json({ message: err.message });
    }
};

export const editAdminController = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const { name } = req.body;

        if (isNaN(id)) {
            return res.status(400).json({ message: 'id must be number' });
        }

        if (!name || typeof name !== 'string') {
            return res.status(400).json({ message: 'name is required' });
        }

        const result = await editAdminName(id, name);

        if (!result) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        return res.status(200).json({ data: result });
    } catch (err: any) {
        return res.status(500).json({ message: err.message });
    }
};

export const deleteAdminController = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ message: 'id must be a number' });
        }

        const result = await deleteAdminById(id);

        if (!result) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        return res.status(200).json({
            message: 'Admin deleted successfully',
            data: result,
        });
    } catch (err: any) {
        return res.status(500).json({ message: err.message });
    }
};