import { Request, Response } from 'express';
import {
    getAllInterest,
    getInterestById,
    editInterest,
    deleteInterestById,
} from '../services/setting.service';

export const getAllInterestController = async (req: Request, res: Response) => {
    try {
        const result = await getAllInterest();
        return res.status(200).json({ data: result });
    } catch (err: any) {
        return res.status(500).json({ message: err.message });
    }
};

export const getInterestByIdController = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ message: 'id must be a number' });
        }

        const result = await getInterestById(id);

        if (!result) {
            return res.status(404).json({ message: 'Interest not found' });
        }

        return res.status(200).json({ data: result });
    } catch (err: any) {
        return res.status(500).json({ message: err.message });
    }
};

export const editInterestController = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const { name, price } = req.body;

        if (isNaN(id)) {
            return res.status(400).json({ message: 'id must be a number' });
        }

        if (!name && !price) {
            return res.status(400).json({
                message: 'name or price is required',
            });
        }

        const result = await editInterest(id, { name, price });

        if (!result) {
            return res.status(404).json({ message: 'Interest not found' });
        }

        return res.status(200).json({ data: result });
    } catch (err: any) {
        return res.status(500).json({ message: err.message });
    }
};

export const deleteInterestController = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ message: 'id must be a number' });
        }

        const result = await deleteInterestById(id);

        if (!result) {
            return res.status(404).json({ message: 'Interest not found' });
        }

        return res.status(200).json({
            message: 'Interest deleted successfully',
            data: result,
        });
    } catch (err: any) {
        return res.status(500).json({ message: err.message });
    }
};
