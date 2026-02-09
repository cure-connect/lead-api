import { Request, Response } from "express";
import { getAllBranch, getBranchById, editBranchName, deleteBranchById } from "../services/setting.service";

export const getAllBranchController = async (req: Request, res: Response) => {
    try {
        const result = await getAllBranch();
        return res.status(200).json({ data: result });
    } catch (err: any) {
        return res.status(500).json({ message: err.message });
    }
};

export const getBranchByIdController = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ message: 'id must be a number' });
        }

        const result = await getBranchById(id);

        if (!result) {
            return res.status(404).json({ message: 'Branch not found' });
        }

        return res.status(200).json({ data: result });
    } catch (err: any) {
        return res.status(500).json({ message: err.message });
    }
};

export const editBranchController = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const { name } = req.body;

        if (isNaN(id)) {
            return res.status(400).json({ message: 'id must be a number' });
        }

        if (!name || typeof name !== 'string') {
            return res.status(400).json({ message: 'name is required' });
        }

        const result = await editBranchName(id, name);

        if (!result) {
            return res.status(404).json({ message: 'Branch not found' });
        }

        return res.status(200).json({ data: result });
    } catch (err: any) {
        return res.status(500).json({ message: err.message });
    }
};

export const deleteBranchController = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ message: 'id must be a number' });
        }

        const result = await deleteBranchById(id);

        if (!result) {
            return res.status(404).json({ message: 'Branch not found' });
        }

        return res.status(200).json({
            message: 'Branch deleted successfully',
            data: result,
        });
    } catch (err: any) {
        return res.status(500).json({ message: err.message });
    }
}